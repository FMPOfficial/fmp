/**
 * 404 page — Flame Mod Paradise (Cyber theme)
 * Path display, status bar clock, skip-link target.
 */
(function () {
  "use strict";

  function init() {
    var pathEl = document.getElementById("pathText");
    if (pathEl) {
      pathEl.textContent = location.pathname + location.search;
    }

    var statusTime = document.getElementById("statusTime");
    function updateClock() {
      if (!statusTime) return;
      var now = new Date();
      statusTime.textContent = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
    updateClock();
    setInterval(updateClock, 1000);

    var main = document.getElementById("main-content");
    if (main && !main.hasAttribute("tabindex")) {
      main.setAttribute("tabindex", "-1");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
