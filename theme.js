/* ===================================================
   theme.js — Dark/Light mode for all pages
   Uses same localStorage key as storage.js ("theme")
   Load after layout.js so #darkToggle exists.
   =================================================== */

(function () {
  "use strict";
  const THEME_KEY = "theme";

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  function setStoredTheme(value) {
    localStorage.setItem(THEME_KEY, value);
  }

  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored === "dark") {
      applyTheme(true);
    } else if (stored === "light") {
      applyTheme(false);
    } else {
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark);
      setStoredTheme(prefersDark ? "dark" : "light");
    }

    var btn = document.getElementById("darkToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var isDark = document.body.classList.toggle("dark");
        setStoredTheme(isDark ? "dark" : "light");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }
})();
