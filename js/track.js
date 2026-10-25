/* Rubidu website analytics (site.toml [analytics]; privacy.html#visits says what each one does).
   - GoatCounter: no cookies, no personal data; counts pages, referrers, countries, devices. Runs for everyone.
   - Google Analytics 4, Microsoft Clarity, LinkedIn Insight Tag: set cookies, so they load only after the
     visitor presses "Allow" on the banner. "No thanks" is remembered and nothing of theirs loads.
   - Do Not Track or Global Privacy Control: nothing here runs at all.
   Clicks on links and buttons are sent as events, so the reports show what people press, not only views. */
(function () {
  "use strict";
  var site = window.RUBIDU_SITE || {}, ids = site.analytics || {};
  var KEY = "rubidu-analytics-consent";
  var real = !site.countOn || location.hostname === site.countOn;
  var optedOut = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (!real || optedOut) return;

  function load(src, attrs) {
    var s = document.createElement("script");
    s.async = true; s.src = src;
    for (var k in attrs || {}) s.setAttribute(k, attrs[k]);
    document.head.appendChild(s);
  }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ask again next time */ } }

  // -- cookieless, for everyone -------------------------------------------------------------
  if (ids.goatcounter) load("https://gc.zgo.at/count.js", { "data-goatcounter": "https://" + ids.goatcounter + ".goatcounter.com/count" });

  // -- with consent ---------------------------------------------------------------------------
  var withConsent = !!(ids.ga4 || ids.clarity || ids.linkedin), started = false;
  function startConsented() {
    if (started) return; started = true;
    if (ids.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
      gtag("js", new Date());
      gtag("config", ids.ga4);
      load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids.ga4));
    }
    if (ids.clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      load("https://www.clarity.ms/tag/" + encodeURIComponent(ids.clarity));
      window.clarity("consent");
    }
    if (ids.linkedin) {
      window._linkedin_partner_id = ids.linkedin;
      window._linkedin_data_partner_ids = (window._linkedin_data_partner_ids || []).concat(ids.linkedin);
      window.lintrk = window.lintrk || function (a, b) { (window.lintrk.q = window.lintrk.q || []).push([a, b]); };
      load("https://snap.licdn.com/li.lms-analytics/insight.min.js");
    }
  }

  function banner() {
    var b = document.createElement("div");
    b.className = "consent"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Analytics choice");
    b.innerHTML = '<p><b>Can I count your visit?</b> Google Analytics, Microsoft Clarity and LinkedIn would set cookies to show me ' +
      'where visitors come from and what they click. Rubidu itself never tracks you. <a href="privacy.html#visits">Details</a></p>' +
      '<div class="consent-row"><button type="button" class="btn btn-sm btn-ghost" data-c="no">No thanks</button>' +
      '<button type="button" class="btn btn-sm btn-primary" data-c="yes">Allow</button></div>';
    b.addEventListener("click", function (e) {
      var c = e.target.getAttribute && e.target.getAttribute("data-c");
      if (!c) return;
      store(c); b.remove();
      if (c === "yes") startConsented();
      event("consent-" + c);
    });
    document.body.appendChild(b);
  }

  // The footer's "Analytics choice" link (privacy page too) asks again.
  window.rubiduAnalyticsChoice = function () { try { localStorage.removeItem(KEY); } catch (e) {} if (withConsent) banner(); };

  // -- events -----------------------------------------------------------------------------------
  function event(name) {
    name = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    if (!name) return;
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "click-" + name, title: name, event: true });
    if (window.gtag && started) window.gtag("event", "rubidu_click", { label: name });
    if (window.clarity && started) window.clarity("event", name);
  }
  window.rubiduTrack = event;
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button, [data-track]");
    if (!el) return;
    var label = el.getAttribute("data-track") || el.getAttribute("aria-label") || (el.textContent || "").trim();
    if (el.tagName === "A" && el.host && el.host !== location.host) label = "out-" + el.host + "-" + label;
    event(label);
  }, true);

  function ready() {
    var choice = stored();
    if (choice === "yes") startConsented();
    else if (choice !== "no" && withConsent) banner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
