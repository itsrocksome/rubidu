/* The little desktop on the home page: a live menu-bar clock, windows and stickers you can drag, a real
   game of tic-tac-toe against Rubidu (the same rules as the app: win if it can, else block, and a slip now
   and then so you can beat it), a focus timer, words that fill in as you scroll, and the "try it" chat.
   Type "rubidu" anywhere for a small surprise. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var track = function (name) { if (window.rubiduTrack) window.rubiduTrack(name); };
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // -- menu-bar clock -----------------------------------------------------------------------------
  var clock = $("mbar-clock");
  function tick() {
    if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  }
  tick(); setInterval(tick, 15000);

  // -- drag anything with data-drag (desktop widths only) ---------------------------------------------
  var top = 10, desk = $("desk");
  document.querySelectorAll("[data-drag]").forEach(function (el) {
    el.addEventListener("pointerdown", function (e) {
      if (window.innerWidth <= 820 || e.button !== 0 || e.target.closest("button")) return;
      var box = desk.getBoundingClientRect(), r = el.getBoundingClientRect();
      var dx = e.clientX - r.left, dy = e.clientY - r.top;
      el.style.zIndex = ++top; el.classList.add("dragging"); el.setPointerCapture(e.pointerId);
      function move(ev) {
        el.style.left = Math.max(-r.width / 2, Math.min(box.width - r.width / 2, ev.clientX - box.left - dx)) + "px";
        el.style.top = Math.max(0, Math.min(box.height - 40, ev.clientY - box.top - dy)) + "px";
      }
      function up() {
        el.classList.remove("dragging");
        el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up);
        track("drag-" + (el.className.split(" ")[1] || "sticker"));
      }
      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
    });
  });

  // -- tic-tac-toe ------------------------------------------------------------------------------
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var NAMES = ["top left", "top middle", "top right", "middle left", "the centre", "middle right", "bottom left", "bottom middle", "bottom right"];
  var board, over, grid = $("ttt"), say = $("ttt-say");
  function winner(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { mark: b[l[0]], line: l };
    }
    return b.every(Boolean) ? { mark: "draw", line: [] } : null;
  }
  function best() {
    var free = board.map(function (v, i) { return v ? -1 : i; }).filter(function (i) { return i >= 0; });
    var marks = ["O", "X"];
    for (var m = 0; m < 2; m++) for (var k = 0; k < free.length; k++) {
      board[free[k]] = marks[m]; var w = winner(board); board[free[k]] = "";
      if (w && w.mark === marks[m]) return free[k];
    }
    if (Math.random() < 0.2) return free[Math.floor(Math.random() * free.length)];
    var order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (var j = 0; j < order.length; j++) if (free.indexOf(order[j]) >= 0) return order[j];
    return free[0];
  }
  function draw(w) {
    grid.querySelectorAll("button").forEach(function (b, i) {
      b.textContent = board[i]; b.className = board[i] ? board[i].toLowerCase() : "";
      b.disabled = over || !!board[i];
      if (w && w.line.indexOf(i) >= 0) b.classList.add("win");
      b.setAttribute("aria-label", (board[i] ? board[i] + " in " : "Play ") + NAMES[i]);
    });
  }
  function end(text, name) {
    over = true; say.innerHTML = text + ' <button type="button">Play again</button>';
    say.querySelector("button").addEventListener("click", start);
    track("ttt-" + name);
  }
  function play(i) {
    if (over || board[i]) return;
    board[i] = "X";
    var w = winner(board);
    if (w) { draw(w); return end(w.mark === "X" ? "Three in a row. You win! Well played." : "Board's full. A draw!", w.mark === "X" ? "win" : "draw"); }
    var mine = best(); board[mine] = "O"; w = winner(board); draw(w);
    if (w) return end(w.mark === "O" ? "I'll take " + NAMES[mine] + ". Three in a row: I win!" : "I'll take " + NAMES[mine] + ". A draw!", w.mark === "O" ? "lose" : "draw");
    say.textContent = "I'll take " + NAMES[mine] + ". Your move.";
  }
  function start() {
    board = ["", "", "", "", "", "", "", "", ""]; over = false; say.textContent = "You're X. Tap a square.";
    draw(null);
  }
  if (grid) {
    for (var i = 0; i < 9; i++) {
      var b = document.createElement("button"); b.type = "button";
      b.addEventListener("click", play.bind(null, i)); grid.appendChild(b);
    }
    start();
  }

  // -- focus timer -------------------------------------------------------------------------------
  var timer = $("desk-timer"), left = 24 * 60 + 59;
  if (timer && !still) setInterval(function () {
    left = left > 0 ? left - 1 : 25 * 60;
    timer.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  }, 1000);

  // -- words fill in as you scroll ------------------------------------------------------------------
  document.querySelectorAll("[data-fill]").forEach(function (p) {
    var words = [];
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement("span"); s.className = "w"; s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) split(n);
      });
    })(p);
    function fill() {
      var r = p.getBoundingClientRect(), vh = window.innerHeight;
      var t = still ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      var n = Math.round(t * words.length);
      words.forEach(function (w, k) { w.classList.toggle("on", k < n); });
    }
    fill(); window.addEventListener("scroll", fill, { passive: true }); window.addEventListener("resize", fill);
  });

  // -- try it ------------------------------------------------------------------------------------
  function tokyo() {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Tokyo" });
  }
  var REPLIES = {
    "what time is it in tokyo": function () { return "It's " + tokyo() + " in Tokyo."; },
    "play some lo-fi": "(Spotify starts playing lo-fi. I don't say a word: you can hear it.)",
    "remember i like green tea": "Got it. I'll remember that you like green tea. You can see and delete it in Settings.",
    "study for 45 minutes": "Study session on: 45 minutes. I'll tell you when it's done.",
    "who built the james webb telescope": "NASA led it, with the European and Canadian space agencies, and Northrop Grumman built it. (Checked on Wikipedia, when you turn on Check facts online.)",
    "roast me": "You opened a website to talk to a face made of punctuation. Bold.",
    "what's today's challenge": "Today's challenge: set a timer by voice, like 'set a timer for 5 minutes'."
  };
  var log = $("try-log"), face = document.querySelector(".mbar-face");
  function msg(cls, text) {
    var p = document.createElement("p"); p.className = "msg " + cls;
    if (cls.indexOf("r") === 0 && text) { var b = document.createElement("b"); b.textContent = "○‿○"; p.appendChild(b); }
    if (text) p.appendChild(document.createTextNode(text));
    log.appendChild(p); log.scrollTop = log.scrollHeight; return p;
  }
  var chips = $("try-chips");
  if (chips && log) chips.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-q]"); if (!btn) return;
    var q = btn.getAttribute("data-q"), reply = REPLIES[q];
    msg("u", btn.textContent);
    var dots = msg("r typing", "");
    if (face) face.innerHTML = "<b>✦</b><i>‿</i><b>✦</b>";
    setTimeout(function () {
      dots.remove(); msg("r", typeof reply === "function" ? reply() : reply);
      if (face) face.innerHTML = "<b>○</b><i>‿</i><b>○</b>";
    }, still ? 0 : 700);
  });

  // -- type "rubidu" for a surprise ------------------------------------------------------------------
  var typed = "";
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    typed = (typed + (e.key || "")).slice(-6).toLowerCase();
    if (typed === "rubidu" && desk) {
      desk.classList.add("party"); track("easter-egg");
      setTimeout(function () { desk.classList.remove("party"); }, 1200);
    }
  });
})();
