/**
 * MCA Attribution Tracker
 * ------------------------
 * Drop this script on your landing page(s) to capture the Meta click ID
 * (fbclid), Meta browser ID (_fbp cookie), UTMs, referrer, and landing URL.
 *
 * Usage on the landing:
 *   <script src="https://YOUR_APP/mca-tracker.js" async defer></script>
 *
 * The tracker:
 *   1. Persists the first-touch fbclid (+ capture timestamp) in localStorage
 *      so it survives navigation within the site.
 *   2. Auto-fills hidden form inputs on submit (see the `MCA_FIELDS` list).
 *   3. Exposes a global `window.MCATracker` with helpers for manual wiring.
 *
 * Hidden form fields to add to your lead form (they'll be filled automatically):
 *   <input type="hidden" name="mca_fbclid">
 *   <input type="hidden" name="mca_fbc">
 *   <input type="hidden" name="mca_fbp">
 *   <input type="hidden" name="mca_utm_source">
 *   <input type="hidden" name="mca_utm_medium">
 *   <input type="hidden" name="mca_utm_campaign">
 *   <input type="hidden" name="mca_utm_content">
 *   <input type="hidden" name="mca_utm_term">
 *   <input type="hidden" name="mca_landing_url">
 *   <input type="hidden" name="mca_referrer">
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mca_attribution_v1";
  var FBC_TTL_DAYS = 90;

  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  function readCookie(name) {
    var match = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
    );
    return match ? decodeURIComponent(match[1]) : "";
  }

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      if (parsed.fbclid_ts) {
        var ageMs = Date.now() - Number(parsed.fbclid_ts);
        if (ageMs > FBC_TTL_DAYS * 24 * 60 * 60 * 1000) {
          delete parsed.fbclid;
          delete parsed.fbc;
          delete parsed.fbclid_ts;
        }
      }
      return parsed;
    } catch (e) {
      return {};
    }
  }

  function saveStored(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full or blocked — not fatal */
    }
  }

  function captureFromUrl() {
    var store = loadStored();
    var query = {};
    try {
      var params = new URLSearchParams(window.location.search);
      params.forEach(function (v, k) {
        query[k] = v;
      });
    } catch (e) {
      /* ignore */
    }

    // First-touch persistence: if we already have fbclid, don't overwrite it.
    if (query.fbclid && !store.fbclid) {
      var ts = Date.now();
      store.fbclid = query.fbclid;
      store.fbclid_ts = ts;
      store.fbc = "fb.1." + ts + "." + query.fbclid;
    }

    // UTMs: capture on first touch with any of these present
    var hasNewUtms = UTM_KEYS.some(function (k) {
      return query[k];
    });
    if (hasNewUtms && !store.utm_campaign) {
      UTM_KEYS.forEach(function (k) {
        if (query[k]) store[k] = query[k];
      });
    }

    // Landing URL + referrer: first-touch
    if (!store.landing_url) {
      store.landing_url = window.location.href;
    }
    if (!store.referrer && document.referrer) {
      store.referrer = document.referrer;
    }

    saveStored(store);
    return store;
  }

  function getAllAttribution() {
    var store = loadStored();
    return {
      fbclid: store.fbclid || "",
      fbc: store.fbc || "",
      fbp: readCookie("_fbp") || "",
      utm_source: store.utm_source || "",
      utm_medium: store.utm_medium || "",
      utm_campaign: store.utm_campaign || "",
      utm_content: store.utm_content || "",
      utm_term: store.utm_term || "",
      landing_url: store.landing_url || window.location.href,
      referrer: store.referrer || document.referrer || "",
    };
  }

  function fillFormFields(form) {
    if (!form || form.__mcaFilled) return;
    var attr = getAllAttribution();
    Object.keys(attr).forEach(function (key) {
      var input = form.querySelector('[name="mca_' + key + '"]');
      if (input && !input.value) {
        input.value = attr[key] || "";
      }
    });
    form.__mcaFilled = true;
  }

  function autoWire() {
    var forms = document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) {
      fillFormFields(forms[i]);
    }
  }

  // Run capture + wire on page load
  captureFromUrl();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoWire);
  } else {
    autoWire();
  }

  // Re-fill right before submit (in case the form was injected later)
  document.addEventListener(
    "submit",
    function (e) {
      if (e.target && e.target.tagName === "FORM") fillFormFields(e.target);
    },
    true,
  );

  window.MCATracker = {
    capture: captureFromUrl,
    get: getAllAttribution,
    fill: fillFormFields,
    /** Helper: POST the lead directly to MCA's leads capture endpoint. */
    send: function (endpoint, apiKey, payload) {
      var attribution = getAllAttribution();
      return fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          Object.assign({ api_key: apiKey }, attribution, payload || {}),
        ),
      });
    },
  };
})();
