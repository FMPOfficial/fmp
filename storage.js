/* ===================================================
   storage.js — Centralized localStorage Manager
   for Flame Mod Paradise

   Bump STORAGE_VERSION when you ship a breaking
   storage change (keys / format / schema).
   =================================================== */

/* === VERSIONED RESET === */
const STORAGE_VERSION = "1";
const VERSION_KEY     = "fmp_storage_version";

const STORAGE_KEYS = {
  THEME:     "theme",
  SEARCH:    "fmp_search",
  SORT:      "fmp_sort",
  FILTERS:   "fmp_filters",
  BANNER:    "hideBanner",
  RECENTS:   "recentSearches",
  FAVORITES: "fmp_favorites"
};

/** All app-owned keys (used for targeted reset) */
const ALL_APP_KEYS = Object.values(STORAGE_KEYS);

const MAX_RECENTS = 5;

/* --- Run version check on load --- */
(function checkStorageVersion() {
  const saved = localStorage.getItem(VERSION_KEY);
  if (saved !== STORAGE_VERSION) {
    ALL_APP_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    console.info(`[FMP Storage] Reset to v${STORAGE_VERSION} (was v${saved || "none"})`);
  }
})();

/* === Safe Helper === */
function safeGetJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/* === Theme === */
function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

function setTheme(value) {
  localStorage.setItem(STORAGE_KEYS.THEME, value);
}

/* === Banner === */
function isBannerHidden() {
  return !!localStorage.getItem(STORAGE_KEYS.BANNER);
}

function hideBanner() {
  localStorage.setItem(STORAGE_KEYS.BANNER, "1");
}

/* === Search === */
function getStoredSearch() {
  return localStorage.getItem(STORAGE_KEYS.SEARCH) || "";
}

function saveSearch(value) {
  localStorage.setItem(STORAGE_KEYS.SEARCH, value);
}

/* === Sort === */
function getStoredSort() {
  return localStorage.getItem(STORAGE_KEYS.SORT) || "name";
}

function saveSort(value) {
  localStorage.setItem(STORAGE_KEYS.SORT, value);
}

/* === Filters === */
function getStoredFilters() {
  const parsed = safeGetJSON(STORAGE_KEYS.FILTERS, ["all"]);
  return Array.isArray(parsed) && parsed.length ? parsed : ["all"];
}

function saveFilters(arr) {
  localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(arr));
}

/* === Favorites === */
function getFavorites() {
  return safeGetJSON(STORAGE_KEYS.FAVORITES, []);
}

function saveFavorites(arr) {
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(arr));
}

function toggleFavorite(name) {
  const favs = getFavorites();
  const idx = favs.indexOf(name);
  if (idx > -1) favs.splice(idx, 1);
  else favs.push(name);
  saveFavorites(favs);
  return favs.includes(name);
}

function isFavorite(name) {
  return getFavorites().includes(name);
}

/* === Recent Searches === */
function getRecents() {
  return safeGetJSON(STORAGE_KEYS.RECENTS, []);
}

function saveRecent(name) {
  const r = [name, ...getRecents().filter(x => x !== name)].slice(0, MAX_RECENTS);
  localStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(r));
}

function clearRecents() {
  localStorage.removeItem(STORAGE_KEYS.RECENTS);
}

/* === Manual Reset (for UI "Reset" button) === */
function resetApp() {
  ALL_APP_KEYS.forEach(k => localStorage.removeItem(k));
  localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  location.reload();
}

/* === Export Everything === */
window.FMPStorage = {
  KEYS: STORAGE_KEYS,
  VERSION: STORAGE_VERSION,
  // Theme
  getTheme,
  setTheme,
  // Banner
  isBannerHidden,
  hideBanner,
  // Search
  getStoredSearch,
  saveSearch,
  // Sort
  getStoredSort,
  saveSort,
  // Filters
  getStoredFilters,
  saveFilters,
  // Favorites
  getFavorites,
  saveFavorites,
  toggleFavorite,
  isFavorite,
  // Recents
  getRecents,
  saveRecent,
  clearRecents,
  // Reset
  resetApp
};