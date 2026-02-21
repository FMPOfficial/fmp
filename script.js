/* === CONSTANTS === */
const DATA_FILES = [
  "data/tools.json", "data/bots.json", "data/checkers.json",
  "data/game.json", "data/others.json", "data/cookies.json",
  "data/methods.json", "data/membership.json"
];

const THEME_KEY    = "theme";
const SEARCH_KEY   = "fmp_search";
const SORT_KEY     = "fmp_sort";
const FILTER_KEY   = "fmp_filters";
const BANNER_KEY   = "hideBanner";
const RECENT_KEY   = "recentSearches";
const FAV_KEY      = "fmp_favorites";
const MAX_RECENTS  = 5;
const WEEK_MS      = 6048e5;
const SITE_URL     = "https://flamemodparadise.github.io/My-Site/";
const CACHE_BUST   = "v=" + Date.now();

const FUSE_OPTS = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.35,
  distance: 120,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "name",             weight: 1.0 },
    { name: "keywords",         weight: 0.6 },
    { name: "tags",             weight: 0.5 },
    { name: "description",      weight: 0.3 },
    { name: "long_description", weight: 0.2 },
    { name: "type",             weight: 0.1 },
    { name: "_boost",           weight: 0.8 }
  ]
};

const CONTACT_MAP = {
  telegram: "https://t.me/fmpChatBot",
  discord:  "https://discord.gg/WVq522fsr3"
};

/** Default OG values to restore when leaving detail view */
const DEFAULT_OG = {
  title:       "Flame Mod Paradise - Premium Mods & Tools for Automation",
  description: "Flame Mod Paradise offers premium mods, custom tools, and automation scripts along with exclusive free offers like Netflix cookies, Spotify cookies, Hotstar, and ChatGPT cookies.",
  url:         SITE_URL,
  image:       "assets/icons/fmp-icon.gif"
};

/* === DOM REFS === */
const $ = (id) => document.getElementById(id);

const container        = $("main-tool-list");
const filtersEl        = $("filters");
const searchInput      = $("searchInput");
const sortSelect       = $("sortSelect");
const scrollTopBtn     = $("scrollToTopBtn");
const darkToggle       = $("darkToggle");
const banner           = $("announcement-banner");
const closeBannerBtn   = $("close-banner");
const navToggle        = $("navbarToggle");
const navMenu          = $("navbarMenu");
const imageModal       = $("imageModal");
const modalImage       = $("modalImage");
const modalCloseBtn    = $("modalCloseBtn");
const modalThumbStrip  = $("modalThumbStrip");
const autocompleteBox  = $("autocompleteBox");
const scrollProgress   = $("scrollProgress");
const popupBox         = $("popupMessage");
const popupText        = $("popupText");
const closePopupBtn    = $("closePopupBtn");
const clearHistoryBtn  = $("clearSearchHistory");
const emptyState       = $("emptyState");
const emptyStateClear  = $("emptyStateClear");
const breadcrumbNav    = $("breadcrumbNav");
const breadcrumbHome   = $("breadcrumbHome");
const breadcrumbCat    = $("breadcrumbCategory");
const breadcrumbCur    = $("breadcrumbCurrent");
const liveRegion       = $("liveRegion");
const dataLoadProgress = $("dataLoadProgress");
const dataLoadBar      = $("dataLoadBar");
const scrollPercent    = $("scrollPercent");
const stickyBackBtn    = $("stickyBackBtn");
const pullToRefresh    = $("pullToRefresh");
const statTotalTools   = $("statTotalTools");
const statCategories   = $("statCategories");
const statFavorites    = $("statFavorites");
const skipLink         = $("skipLink");

/* === STATE === */
let allTools            = [];
let fuseInstance        = null;
let selectedIdx         = -1;
let scrollTicking       = false;
let savedScrollY        = 0;
let currentModalImages  = [];
let currentModalIdx     = 0;
let isDetailMode        = false;
let renderBatchSize     = 20;
let renderedCount       = 0;
let currentFilteredList = [];
let intersectionRenderObs = null;

/* === UTILITIES === */
const debounce = (fn, ms) => {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
};

/**
 * Escape HTML-special characters to prevent XSS.
 * Also escapes single quotes for safe use in HTML attributes.
 */
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (s = "") => s.replace(/\n/g, "<br>");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 864e5));
const isRecent = (dateStr) => dateStr && (Date.now() - new Date(dateStr) < WEEK_MS);
const getContact = (t) => CONTACT_MAP[t?.toLowerCase()] || "#";

const getStock = (v) =>
  typeof v === "number"
    ? v === 0 ? "Out of stock" : `${v} in stock`
    : typeof v === "string"
      ? ({ unlimited: "Unlimited", "very limited": "Very limited" }[v.toLowerCase()] || v)
      : "Contact owner";

function formatTimeLeft(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 6e4);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `⏳ ${d ? d + "d " : ""}${h ? h + "h " : ""}${m}m left`.trim();
}

function formatDescription(text) {
  if (!text) return "No description available.";
  const lines = text.split("\n");
  const emojiLineRx = /^\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}✅⚡🔥💎🎯🛡️📋🎁💰🔑🌐📦🔒])\s*(.+)/u;
  return lines.map(line => {
    const m = line.match(emojiLineRx);
    if (m) return `<span class="feature-line"><span class="feature-icon">${m[1]}</span><span>${esc(m[2])}</span></span>`;
    return esc(line);
  }).join("<br>");
}

/** Announce to screen readers via live region */
function announce(msg) {
  if (liveRegion) liveRegion.textContent = msg;
}

/* === SAFE localStorage HELPERS === */
function safeGetJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

/* === FAVORITES (localStorage) === */
function getFavorites() { return safeGetJSON(FAV_KEY, []); }

function saveFavorites(arr) {
  localStorage.setItem(FAV_KEY, JSON.stringify(arr));
  updateFavStat();
}

function toggleFavorite(name) {
  const favs = getFavorites();
  const idx = favs.indexOf(name);
  if (idx > -1) favs.splice(idx, 1);
  else favs.push(name);
  saveFavorites(favs);
  return favs.includes(name);
}

function isFavorite(name) { return getFavorites().includes(name); }

/* === PERSISTENT FILTERS (localStorage) === */
function getStoredFilters() {
  const parsed = safeGetJSON(FILTER_KEY, ["all"]);
  return Array.isArray(parsed) && parsed.length ? parsed : ["all"];
}

function saveFilters(arr) { localStorage.setItem(FILTER_KEY, JSON.stringify(arr)); }
function getStoredSort()   { return localStorage.getItem(SORT_KEY) || "name"; }
function saveSort(v)       { localStorage.setItem(SORT_KEY, v); }
function getStoredSearch()  { return localStorage.getItem(SEARCH_KEY) || ""; }
function saveSearch(v)      { localStorage.setItem(SEARCH_KEY, v); }

/* === HIGHLIGHT MATCHING === */
function highlightMatch(text, matches, key) {
  if (!text) return "";
  const m = matches?.find((x) => x.key === key);
  if (!m?.indices?.length) return esc(text);

  const merged = m.indices
    .slice()
    .sort((a, b) => a[0] - b[0])
    .reduce((acc, [s, e]) => {
      const last = acc[acc.length - 1];
      if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
      else acc.push([s, e]);
      return acc;
    }, [])
    .filter(([s, e]) => e - s >= 1);

  let out = "", prev = 0;
  for (const [s, e] of merged) {
    out += esc(text.slice(prev, s));
    out += `<mark>${esc(text.slice(s, e + 1))}</mark>`;
    prev = e + 1;
  }
  return out + esc(text.slice(prev));
}

/* === LAZY IMAGE SYSTEM === */
const imgObserver = new IntersectionObserver(
  (entries) => {
    for (const { target: img, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      loadImage(img);
      imgObserver.unobserve(img);
    }
  },
  { rootMargin: "150px" }
);

function loadImage(img) {
  const src = img.dataset.src;
  if (!src) return;
  const temp = new Image();
  temp.onload = () => {
    img.src = src;
    img.removeAttribute("data-src");
  };
  temp.onerror = () => handleImgError(img);
  temp.src = src;
}

function handleImgError(img) {
  let fbs;
  try { fbs = JSON.parse(img.dataset.fallbacks || "[]"); }
  catch { fbs = []; }

  let idx = (Number(img.dataset.fbIdx) || 0) + 1;
  if (idx < fbs.length) {
    img.dataset.fbIdx = idx;
    img.dataset.src = fbs[idx];
    loadImage(img);
  } else {
    const div = document.createElement("div");
    div.className = "no-image";
    div.textContent = img.alt || "No image";
    img.replaceWith(div);
  }
}

function buildImgHTML(src, alt = "") {
  const safeSrc = esc(src);
  const safeAlt = esc(alt);
  const fbs = [src, "/assets/placeholder.jpg", "../assets/placeholder.jpg", "assets/placeholder.jpg"];
  const safeFbs = JSON.stringify(fbs).replace(/'/g, "&#39;");
  return `<img loading="lazy" data-src="${safeSrc}" data-fallbacks='${safeFbs}' data-fb-idx="0" src="assets/placeholder.jpg" alt="${safeAlt}">`;
}

function activateLazy(root = document) {
  for (const img of root.querySelectorAll("img[data-src]")) {
    imgObserver.observe(img);
  }
}

/* === DARK MODE (auto-detect on first visit, simple toggle after) === */
function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark") {
    document.body.classList.add("dark");
  } else if (stored === "light") {
    document.body.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.toggle("dark", prefersDark);
    localStorage.setItem(THEME_KEY, prefersDark ? "dark" : "light");
  }

  darkToggle?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  });
}

/* === BANNER === */
function initBanner() {
  if (!banner || !closeBannerBtn || localStorage.getItem(BANNER_KEY)) return;
  setTimeout(() => banner.classList.remove("hidden"), 500);
  closeBannerBtn.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem(BANNER_KEY, "1");
  });
}

/* === SCROLL HANDLERS (RAF-throttled) === */
function initScroll() {
  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const top = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = height > 0 ? clamp(top / height, 0, 1) : 0;

      if (scrollProgress && height > 0) {
        scrollProgress.style.transform = `scaleX(${pct})`;
      }

      const show = top > 300;
      scrollTopBtn?.classList.toggle("show", show);
      if (scrollPercent) scrollPercent.textContent = Math.round(pct * 100) + "%";

      if (isDetailMode && stickyBackBtn) {
        const detailHeader = container.querySelector(".tool-detail-header");
        if (detailHeader) {
          stickyBackBtn.classList.toggle("visible", detailHeader.getBoundingClientRect().bottom < 0);
        } else {
          stickyBackBtn.classList.remove("visible");
        }
      }

      scrollTicking = false;
    });
  }, { passive: true });

  scrollTopBtn?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
}

/* === NAV MENU === */
function initNav() {
  if (!navToggle || !navMenu) return;
  navToggle.addEventListener("click", () => navMenu.classList.toggle("show-menu"));
  navMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) navMenu.classList.remove("show-menu");
  });
}

/* === CONSOLIDATED BADGE FUNCTION === */
function renderBadges(tool, mode = "card") {
  const now = Date.now();
  const discEnd = tool.discount_expiry ? +new Date(tool.discount_expiry) : Infinity;
  const offEnd  = tool.offer_expiry    ? +new Date(tool.offer_expiry)    : Infinity;
  const hasDisc = tool.discount && discEnd > now;
  const hasOff  = tool.offer    && offEnd  > now;
  const isNum   = !isNaN(parseFloat(tool.discount));
  const isCard  = mode === "card";
  const cls     = isCard ? "tool-badge" : "badge";
  const badges  = [];

  if (!isCard) {
    if (isRecent(tool.release_date)) badges.push(`<span class="${cls} new-badge">NEW</span>`);
    if (isRecent(tool.update_date))  badges.push(`<span class="${cls} updated-badge">UPDATED</span>`);
  }

  if (hasDisc) {
    const label = isNum ? `-${tool.discount}%` : esc(String(tool.discount));
    badges.push(`<span class="${cls} discount-badge">${label}</span>`);
    if (isNum && discEnd < Infinity) {
      const t = formatTimeLeft(tool.discount_expiry);
      if (t) badges.push(`<span class="${cls} discount-badge" data-expiry="${esc(tool.discount_expiry)}">${t}</span>`);
    }
  }

  if (hasOff) badges.push(`<span class="${cls} offer-badge">${esc(tool.offer)}</span>`);
  return badges.join("");
}

/* === RECENT TAGS ON CARDS === */
function recentTags(t) {
  let h = "";
  if (isRecent(t.release_date)) h += '<span class="tag">new</span>';
  if (isRecent(t.update_date))  h += '<span class="tag">updated</span>';
  return h;
}

/* === SMARTER SKELETON COUNT === */
function getSkeletonCount() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let cols = 4;
  if (w < 560) cols = 1;
  else if (w < 768) cols = 2;
  else if (w < 1200) cols = 3;
  const cardH = w < 560 ? 110 : 180;
  return cols * Math.ceil(h / cardH);
}

/* === VIRTUAL / INCREMENTAL RENDERING === */
function renderCards(list, target = container) {
  target.className = "main-grid";
  currentFilteredList = list;
  renderedCount = 0;

  if (!list.length) {
    target.innerHTML = "";
    emptyState?.classList.remove("hidden");
    announce("No tools found. Try adjusting your search or filters.");
    return;
  }

  emptyState?.classList.add("hidden");

  const frag = document.createDocumentFragment();
  const firstBatch = list.slice(0, renderBatchSize);
  for (const tool of firstBatch) {
    frag.appendChild(createCardElement(tool));
  }
  renderedCount = firstBatch.length;

  if (list.length > renderBatchSize) {
    frag.appendChild(createSentinel());
  }

  target.replaceChildren(frag);
  activateLazy(target);
  setupIncrementalRender(list, target);
  announce(`${list.length} tool${list.length !== 1 ? "s" : ""} found.`);
}

/** Create a sentinel element for intersection-based incremental loading */
function createSentinel() {
  const sentinel = document.createElement("div");
  sentinel.id = "renderSentinel";
  sentinel.className = "tool-card placeholder";
  sentinel.setAttribute("aria-hidden", "true");
  return sentinel;
}

function createCardElement(tool) {
  const card = document.createElement("div");
  card.className = "tool-card fade-in";
  card.dataset.name = tool.name;
  card.setAttribute("role", "article");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `${tool.name}. ${tool.description || ""}`);

  const m = tool._matches || [];
  const name = highlightMatch(tool.name || "Unnamed", m, "name");
  const desc = nl2br(highlightMatch(tool.description || "", m, "description"));
  const tags = (tool.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("");
  const fav = isFavorite(tool.name);
  const favLabel = fav ? "Remove from" : "Add to";

  card.innerHTML = `
    <div class="tool-thumb-wrapper">
      ${renderBadges(tool, "card")}
      <button class="fav-btn ${fav ? "active" : ""}"
              data-fav="${esc(tool.name)}"
              aria-label="${favLabel} favorites"
              title="${favLabel} favorites">${fav ? "♥" : "♡"}</button>
      ${buildImgHTML(tool.image || "assets/placeholder.jpg", tool.name)}
    </div>
    <div class="tool-card-body">
      <h3 class="tool-title">${name}</h3>
      <p class="tool-desc">${desc}</p>
      <div class="tool-tags">
        ${tags}
        ${tool.popular ? '<span class="tag">popular</span>' : ""}
        ${recentTags(tool)}
      </div>
    </div>`;

  return card;
}

function setupIncrementalRender(list, target) {
  if (intersectionRenderObs) intersectionRenderObs.disconnect();

  intersectionRenderObs = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      intersectionRenderObs.unobserve(entry.target);
      entry.target.remove();

      const nextBatch = list.slice(renderedCount, renderedCount + renderBatchSize);
      if (!nextBatch.length) return;

      const frag = document.createDocumentFragment();
      for (const tool of nextBatch) {
        frag.appendChild(createCardElement(tool));
      }
      renderedCount += nextBatch.length;

      if (renderedCount < list.length) {
        frag.appendChild(createSentinel());
      }

      target.appendChild(frag);
      activateLazy(target);

      const newSentinel = target.querySelector("#renderSentinel");
      if (newSentinel) intersectionRenderObs.observe(newSentinel);
    }
  }, { rootMargin: "300px" });

  const sentinel = target.querySelector("#renderSentinel");
  if (sentinel) intersectionRenderObs.observe(sentinel);
}

/* === ADVANCED SEARCH & RANKING === */
function buildFuse(list) { return new Fuse(list, FUSE_OPTS); }

function getBoostList() {
  const recents = getRecents();
  return allTools.map(t => ({ ...t, _boost: recents.includes(t.name) ? 1 : 0 }));
}

function advancedSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [...allTools];

  const exact = allTools.filter(t => t.name.toLowerCase() === q);
  const startsWith = allTools.filter(t =>
    t.name.toLowerCase().startsWith(q) && t.name.toLowerCase() !== q
  );

  const matchedNames = new Set([...exact.map(t => t.name), ...startsWith.map(t => t.name)]);

  const contains = allTools.filter(t => {
    if (matchedNames.has(t.name)) return false;
    const n = t.name.toLowerCase();
    const kw = (t.keywords || []).join(" ").toLowerCase();
    const tg = (t.tags || []).join(" ").toLowerCase();
    return n.includes(q) || kw.includes(q) || tg.includes(q);
  });

  for (const t of contains) matchedNames.add(t.name);

  const fuse = buildFuse(getBoostList());
  const fuzzy = fuse.search(query)
    .filter(({ item }) => !matchedNames.has(item.name))
    .map(({ item, matches }) => ({ ...item, _matches: matches }));

  const mark = (arr) => arr.map(t => ({ ...t, _matches: t._matches || [] }));
  return [...mark(exact), ...mark(startsWith), ...mark(contains), ...fuzzy];
}

/* === FILTER & SORT === */
function applyAll() {
  const query   = getStoredSearch();
  const sort    = getStoredSort();
  const filters = getStoredFilters();

  let list;
  if (filters.includes("all") || !filters.length) {
    list = [...allTools];
  } else {
    list = allTools.filter(t => filters.includes((t.type || "").toLowerCase()));
  }

  if (query.trim()) {
    const searched = advancedSearch(query);
    const filterSet = new Set(list.map(t => t.name));
    list = searched.filter(t => filterSet.has(t.name));
  }

  switch (sort) {
    case "release_date":
      list.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
      break;
    case "update_date":
      list.sort((a, b) => new Date(b.update_date || 0) - new Date(a.update_date || 0));
      break;
    case "discount": {
      const now = Date.now();
      list = list
        .filter(t =>
          (t.discount && (!t.discount_expiry || new Date(t.discount_expiry) > now)) ||
          (t.offer && (!t.offer_expiry || new Date(t.offer_expiry) > now))
        )
        .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0));
      break;
    }
    default:
      if (!query.trim()) {
        list.sort((a, b) => {
          const aR = isRecent(a.release_date) || isRecent(a.update_date);
          const bR = isRecent(b.release_date) || isRecent(b.update_date);
          if (aR !== bR) return bR - aR;
          return (a.name || "").localeCompare(b.name || "");
        });
      }
  }

  renderCards(list);

  filtersEl?.querySelectorAll("button").forEach(b => {
    const type = b.dataset.filter;
    b.classList.toggle("active",
      filters.includes("all") ? type === "all" : filters.includes(type)
    );
  });

  if (searchInput) searchInput.value = query;
  if (sortSelect) sortSelect.value = sort;
}

/* === FILTER BUTTONS (with count badges, multi-select) === */
function initFilters() {
  if (!filtersEl) return;

  const typeCounts = {};
  for (const t of allTools) {
    const type = (t.type || "").toLowerCase();
    if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  const types = Object.keys(typeCounts).sort();
  const frag = document.createDocumentFragment();

  const mkBtn = (label, count) => {
    const b = document.createElement("button");
    b.dataset.filter = label.toLowerCase();
    b.setAttribute("role", "checkbox");
    b.setAttribute("aria-checked", "false");
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
    b.innerHTML = count !== undefined
      ? `${esc(displayLabel)}<span class="filter-count">${count}</span>`
      : esc(displayLabel);
    b.addEventListener("click", () => handleFilterClick(label.toLowerCase()));
    return b;
  };

  frag.appendChild(mkBtn("All"));
  for (const t of types) frag.appendChild(mkBtn(t, typeCounts[t]));
  filtersEl.replaceChildren(frag);
}

function handleFilterClick(type) {
  let filters = getStoredFilters();

  if (type === "all") {
    filters = ["all"];
  } else {
    filters = filters.filter(f => f !== "all");
    if (filters.includes(type)) {
      filters = filters.filter(f => f !== type);
    } else {
      filters.push(type);
    }
    if (!filters.length) filters = ["all"];
  }

  saveFilters(filters);

  filtersEl?.querySelectorAll("button").forEach(b => {
    const ft = b.dataset.filter;
    const checked = filters.includes("all") ? ft === "all" : filters.includes(ft);
    b.setAttribute("aria-checked", String(checked));
  });

  applyAll();
}

/* === CARD CLICK → DETAIL (event delegation) === */
container?.addEventListener("click", (e) => {
  const favBtn = e.target.closest(".fav-btn");
  if (favBtn) {
    e.stopPropagation();
    const name = favBtn.dataset.fav;
    const nowFav = toggleFavorite(name);
    const label = nowFav ? "Remove from" : "Add to";
    favBtn.classList.toggle("active", nowFav);
    favBtn.textContent = nowFav ? "♥" : "♡";
    favBtn.setAttribute("aria-label", `${label} favorites`);
    favBtn.setAttribute("title", `${label} favorites`);
    announce(nowFav ? `${name} added to favorites` : `${name} removed from favorites`);
    return;
  }

  const card = e.target.closest(".tool-card");
  if (!card) return;
  const tool = allTools.find(t => t.name === card.dataset.name);
  if (tool) showDetail(tool);
});

container?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".tool-card");
  if (!card) return;
  e.preventDefault();
  const tool = allTools.find(t => t.name === card.dataset.name);
  if (tool) showDetail(tool);
});

/* === SIMILAR TOOLS === */
function getSimilarTools(tool, limit = 6) {
  const toolTags = new Set((tool.tags || []).map(t => t.toLowerCase()));
  const toolKws  = new Set((tool.keywords || []).map(k => k.toLowerCase()));
  const toolType = (tool.type || "").toLowerCase();

  return allTools
    .filter(t => t.name !== tool.name)
    .map(t => {
      let score = 0;
      for (const tag of (t.tags || []).map(x => x.toLowerCase())) {
        if (toolTags.has(tag)) score += 3;
      }
      if ((t.type || "").toLowerCase() === toolType && toolType) score += 2;
      for (const kw of (t.keywords || []).map(x => x.toLowerCase())) {
        if (toolKws.has(kw)) score += 1;
      }
      if (t.popular) score += 0.5;
      if (isRecent(t.update_date)) score += 0.5;
      return { tool: t, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.tool);
}

function buildRecommendationHTML(tools) {
  if (!tools.length) return "";

  const cards = tools.map(t => {
    const tags = (t.tags || []).slice(0, 2).map(tag => `<span class="tag">${esc(tag)}</span>`).join("");
    const rawDesc = t.description || "";
    const desc = rawDesc.length > 60 ? esc(rawDesc.slice(0, 60)) + "…" : esc(rawDesc);

    return `
      <div class="rec-card" data-name="${esc(t.name)}" role="article" tabindex="0" aria-label="${esc(t.name)}">
        <div class="rec-thumb">${buildImgHTML(t.image || "assets/placeholder.jpg", t.name)}</div>
        <div class="rec-body">
          <h4 class="rec-title">${esc(t.name)}</h4>
          <p class="rec-desc">${desc}</p>
          <div class="rec-tags">${tags}</div>
        </div>
      </div>`;
  }).join("");

  return `
    <section class="tool-recommendations">
      <h3>You Might Also Like</h3>
      <div class="rec-grid">${cards}</div>
    </section>`;
}

/* === DETAIL VIEW === */
function showDetail(tool, fromHash = false) {
  if (!fromHash) {
    savedScrollY = window.scrollY;
    location.hash = `tool=${encodeURIComponent(tool.name)}`;
  }

  isDetailMode = true;
  document.body.classList.add("detail-mode");
  stickyBackBtn?.classList.remove("hidden");

  // Breadcrumb
  if (breadcrumbNav) {
    breadcrumbNav.classList.remove("hidden");
    if (breadcrumbCat) {
      breadcrumbCat.textContent = tool.type || "Tools";
      breadcrumbCat.href = "#";
    }
    if (breadcrumbCur) breadcrumbCur.textContent = tool.name;
  }

  updateMeta(tool);
  updateBreadcrumbLD(tool);
  container.className = "detail-wrapper";

  // Pricing
  let pricingHTML = "";
  if (tool.pricing) {
    const li = Object.entries(tool.pricing)
      .map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join("");
    pricingHTML = `<div class="pricing-block"><strong>Pricing</strong><ul class="pricing-list">${li}</ul></div>`;
  } else if (tool.price) {
    pricingHTML = `<div class="pricing-block"><strong>Price</strong><p class="price-single">${nl2br(esc(tool.price))}</p></div>`;
  }

  // Meta grid
  const meta = [];
  if (tool.discount) {
    const isNum = !isNaN(parseFloat(tool.discount));
    meta.push({ label: "Discount", value: esc(String(tool.discount)) + (isNum ? "%" : "") });
  }
  if (tool.offer_expiry) meta.push({ label: "Offer Ends", value: `${daysLeft(tool.offer_expiry)} days left` });
  meta.push({ label: "Stock",    value: getStock(tool.stock) });
  meta.push({ label: "Released", value: esc(tool.release_date || "N/A") });
  meta.push({ label: "Updated",  value: esc(tool.update_date  || "N/A") });
  if (tool.type) meta.push({ label: "Type", value: esc(tool.type) });
  if (tool.version) meta.push({ label: "Version", value: esc(tool.version) });

  const metaHTML = meta.map(m =>
    `<div class="meta-item"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`
  ).join("");

  // Gallery
  const allImages = [tool.image, ...(tool.images || [])].filter(Boolean);
  const gallery = allImages.length > 1
    ? `<div class="tool-gallery" role="list" aria-label="Image gallery">${allImages.map((img, idx) =>
        buildImgHTML(img, "gallery image " + (idx + 1))
          .replace("<img ", `<img role="listitem" data-gallery-idx="${idx}" ${idx === 0 ? 'class="active"' : ''} `)
      ).join("")}</div>`
    : "";

  currentModalImages = allImages;
  currentModalIdx = 0;

  // Video
  const video = tool.video
    ? `<iframe src="${esc(tool.video)}" class="tool-video" allowfullscreen loading="lazy"
        title="Tool video preview"
        style="width:100%;aspect-ratio:16/9;border:none;border-radius:var(--radius-md);margin-top:.5rem"></iframe>`
    : "";

  // Description
  const summary = tool.description || (tool.long_description ? tool.long_description.split("\n")[0] : "No description available.");
  const fullDesc = tool.long_description || tool.description || "No description available.";
  const isLongDesc = fullDesc.length > 400;

  // Tags
  const tagsHTML = (tool.tags || []).length
    ? `<div class="tool-detail-tags">${(tool.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}${tool.popular ? '<span class="tag">popular</span>' : ""}</div>`
    : "";

  // Favorite state
  const fav = isFavorite(tool.name);
  const safeName = esc(tool.name);
  const favLabel = fav ? "Remove from" : "Add to";

  container.innerHTML = `
    <div class="tool-detail fade-in" role="article" aria-label="${safeName} details">
      <header class="tool-detail-header">
        <button class="back-btn" id="detailBackBtn" aria-label="Go back to tools list">← Back</button>
        <div class="tool-detail-title">
          <div>
            <h2>${safeName}</h2>
            <div class="tool-detail-badges">${renderBadges(tool, "detail")}</div>
          </div>
          <div style="display:flex;gap:.4rem;flex-shrink:0">
            <button class="detail-fav-btn ${fav ? "active" : ""}" id="detailFavBtn"
                    data-fav="${safeName}"
                    aria-label="${favLabel} favorites">${fav ? "♥ Saved" : "♡ Save"}</button>
            <button class="share-btn" id="shareBtn"
                    title="Copy link to this tool"
                    aria-label="Copy link to this tool">🔗 Copy Link</button>
          </div>
        </div>
        <p class="tool-detail-summary">${esc(summary)}</p>
      </header>

      <div class="tool-detail-main">
        <div class="tool-detail-left">
          ${buildImgHTML(tool.image || "assets/placeholder.jpg", tool.name).replace("<img ", '<img class="tool-main-img" ')}
          ${gallery}
          ${video}
        </div>
        <div class="tool-detail-right">
          ${pricingHTML}
          <div class="tool-meta-grid">${metaHTML}</div>
          <div class="tool-detail-actions">
            <a href="${esc(getContact(tool.contact))}" target="_blank" class="contact-btn"
               rel="noopener noreferrer"
               aria-label="Contact seller on ${esc(tool.contact || "Telegram")}">💬 Contact Seller</a>
            <button class="requirements-btn" data-tool="${safeName}"
                    aria-label="View requirements for ${safeName}">📋 Requirements</button>
          </div>
        </div>
      </div>

      ${tagsHTML}

      <section class="tool-detail-description">
        <h3>Full Description</h3>
        <div class="desc ${isLongDesc ? "desc-collapsible" : ""}" id="descContent">${formatDescription(fullDesc)}</div>
        ${isLongDesc ? '<button class="desc-toggle-btn" id="descToggleBtn" aria-expanded="false">Show more ▾</button>' : ""}
      </section>

      ${buildRecommendationHTML(getSimilarTools(tool))}
    </div>`;

  wireDetailEvents(tool);
  activateLazy(container);

  requestAnimationFrame(() => {
    const el = container.querySelector(".tool-detail");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  });
}

/** Wire all interactive events inside the detail view */
function wireDetailEvents(tool) {
  // Back button
  $("detailBackBtn")?.addEventListener("click", clearHash);

  // Share button
  $("shareBtn")?.addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#tool=${encodeURIComponent(tool.name)}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = $("shareBtn");
      if (btn) {
        btn.textContent = "✓ Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "🔗 Copy Link";
          btn.classList.remove("copied");
        }, 2000);
      }
    }).catch(() => {
      prompt("Copy this link:", url);
    });
  });

  // Favorite in detail
  $("detailFavBtn")?.addEventListener("click", () => {
    const btn = $("detailFavBtn");
    const name = btn.dataset.fav;
    const nowFav = toggleFavorite(name);
    const label = nowFav ? "Remove from" : "Add to";
    btn.classList.toggle("active", nowFav);
    btn.textContent = nowFav ? "♥ Saved" : "♡ Save";
    btn.setAttribute("aria-label", `${label} favorites`);
    announce(nowFav ? `${name} added to favorites` : `${name} removed from favorites`);
  });

  // Collapsible description
  const descToggle = $("descToggleBtn");
  const descContent = $("descContent");
  if (descToggle && descContent) {
    descToggle.addEventListener("click", () => {
      const expanded = descContent.classList.toggle("expanded");
      descToggle.textContent = expanded ? "Show less ▴" : "Show more ▾";
      descToggle.setAttribute("aria-expanded", String(expanded));
    });
  }

  // Main image click → modal
  const mainImg = container.querySelector(".tool-main-img");
  if (mainImg) {
    mainImg.style.cursor = "pointer";
    if (mainImg.dataset.src) mainImg.src = mainImg.dataset.src;
    mainImg.addEventListener("click", () => {
      currentModalIdx = 0;
      openModal(mainImg.src);
    });
  }

  // Gallery images
  container.querySelectorAll(".tool-gallery img").forEach(img => {
    if (img.dataset.src) img.src = img.dataset.src;
    img.style.cursor = "pointer";
    img.addEventListener("click", () => {
      const src = img.dataset.src || img.src;
      const idx = parseInt(img.dataset.galleryIdx) || 0;
      if (mainImg) {
        mainImg.src = src;
        mainImg.dataset.src = src;
      }
      container.querySelectorAll(".tool-gallery img").forEach(i => i.classList.remove("active"));
      img.classList.add("active");
      currentModalIdx = idx;
    });
  });

  // Requirements
  container.querySelector(".requirements-btn")?.addEventListener("click", (e) => {
    showRequirements(e.currentTarget.dataset.tool);
  });

  // Recommendations
  container.querySelectorAll(".rec-card").forEach(card => {
    const handler = () => {
      const t = allTools.find(x => x.name === card.dataset.name);
      if (t) showDetail(t);
    };
    card.addEventListener("click", handler);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
    });
  });
}

function clearHash() {
  isDetailMode = false;
  document.body.classList.remove("detail-mode");
  stickyBackBtn?.classList.add("hidden");
  stickyBackBtn?.classList.remove("visible");
  breadcrumbNav?.classList.add("hidden");
  history.replaceState(null, "", location.pathname + location.search);
  resetMeta();
  resetBreadcrumbLD();
  applyAll();
  requestAnimationFrame(() => {
    window.scrollTo({ top: savedScrollY, behavior: "instant" });
  });
}

/* === HASH ROUTING === */
function applyHash() {
  const h = decodeURIComponent(location.hash).replace("#", "");
  if (!h.startsWith("tool=")) return;
  const name = h.slice(5).toLowerCase();
  const tool = allTools.find(t => (t.name || "").toLowerCase() === name);
  if (tool) showDetail(tool, true);
}

/* === DYNAMIC META / OG / TITLE === */
function setMetaTags(values) {
  document.title = values.title;
  const ogTitle = $("og-title");
  const ogDesc  = $("og-description");
  const ogUrl   = $("og-url");
  const ogImage = $("og-image");
  const canon   = $("canonical-link");
  if (ogTitle) ogTitle.content = values.ogTitle || values.title;
  if (ogDesc)  ogDesc.content  = values.description;
  if (ogUrl)   ogUrl.content   = values.url;
  if (ogImage) ogImage.content = values.image;
  if (canon)   canon.href      = values.url;
}

function updateMeta(tool) {
  const toolUrl = `${SITE_URL}#tool=${encodeURIComponent(tool.name)}`;
  setMetaTags({
    title:       `${tool.name} - Flame Mod Paradise`,
    description: tool.description || DEFAULT_OG.description,
    url:         toolUrl,
    image:       tool.image || DEFAULT_OG.image
  });
}

function resetMeta() {
  setMetaTags({
    title:       "Flame Mod Paradise - Premium Mods, Tools, and Free Offers",
    ogTitle:     DEFAULT_OG.title,
    description: DEFAULT_OG.description,
    url:         DEFAULT_OG.url,
    image:       DEFAULT_OG.image
  });
}

/* === JSON-LD BREADCRUMB === */
function updateBreadcrumbLD(tool) {
  const el = $("ld-json-breadcrumb");
  if (!el) return;
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": tool.type || "Tools", "item": SITE_URL },
      { "@type": "ListItem", "position": 3, "name": tool.name }
    ]
  });
}

function resetBreadcrumbLD() {
  const el = $("ld-json-breadcrumb");
  if (!el) return;
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": []
  });
}

/* === IMAGE MODAL (fullscreen gallery with thumbnail strip) === */
function openModal(src) {
  if (!imageModal || !modalImage) return;
  modalImage.src = src;
  imageModal.classList.remove("hidden");
  imageModal.setAttribute("aria-hidden", "false");

  // Clean up old nav arrows
  imageModal.querySelectorAll(".modal-nav").forEach(n => n.remove());

  // Build thumbnail strip
  if (modalThumbStrip && currentModalImages.length > 1) {
    modalThumbStrip.classList.remove("hidden");
    modalThumbStrip.innerHTML = currentModalImages.map((img, i) =>
      `<img class="modal-thumb-item ${i === currentModalIdx ? "active" : ""}"
            src="${esc(img)}" data-idx="${i}"
            alt="Thumbnail ${i + 1}" role="listitem">`
    ).join("");

    modalThumbStrip.querySelectorAll(".modal-thumb-item").forEach(thumb => {
      thumb.addEventListener("click", () => {
        const idx = parseInt(thumb.dataset.idx);
        currentModalIdx = idx;
        modalImage.src = currentModalImages[idx];
        modalThumbStrip.querySelectorAll(".modal-thumb-item").forEach((t, i) =>
          t.classList.toggle("active", i === idx)
        );
        updateGalleryActive();
      });
    });
  } else if (modalThumbStrip) {
    modalThumbStrip.classList.add("hidden");
  }

  // Nav arrows for multi-image galleries
  if (currentModalImages.length > 1) {
    const content = imageModal.querySelector(".image-modal-content");
    if (content) {
      const makeNavBtn = (dir, symbol, label) => {
        const btn = document.createElement("button");
        btn.className = `modal-nav ${dir}`;
        btn.innerHTML = symbol;
        btn.title = label;
        btn.setAttribute("aria-label", label);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          navigateModal(dir === "prev" ? -1 : 1);
        });
        return btn;
      };
      content.appendChild(makeNavBtn("prev", "‹", "Previous image"));
      content.appendChild(makeNavBtn("next", "›", "Next image"));
    }
  }

  trapFocus(imageModal);
}

function navigateModal(dir) {
  if (!currentModalImages.length) return;
  currentModalIdx = (currentModalIdx + dir + currentModalImages.length) % currentModalImages.length;
  if (modalImage) modalImage.src = currentModalImages[currentModalIdx];
  updateGalleryActive();

  if (modalThumbStrip) {
    modalThumbStrip.querySelectorAll(".modal-thumb-item").forEach((t, i) =>
      t.classList.toggle("active", i === currentModalIdx)
    );
  }
}

function updateGalleryActive() {
  const mainImg = container.querySelector(".tool-main-img");
  if (mainImg && currentModalImages[currentModalIdx]) {
    mainImg.src = currentModalImages[currentModalIdx];
    mainImg.dataset.src = currentModalImages[currentModalIdx];
  }
  container.querySelectorAll(".tool-gallery img").forEach((img, i) => {
    img.classList.toggle("active", i === currentModalIdx);
  });
}

function closeModal() {
  imageModal?.classList.add("hidden");
  imageModal?.setAttribute("aria-hidden", "true");
  releaseFocusTrap();
}

modalCloseBtn?.addEventListener("click", closeModal);
imageModal?.addEventListener("click", (e) => {
  if (e.target === imageModal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (!imageModal || imageModal.classList.contains("hidden")) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") navigateModal(-1);
  if (e.key === "ArrowRight") navigateModal(1);
});

/* === FOCUS TRAPPING === */
let previousFocus = null;
let focusTrapEl = null;
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(el) {
  previousFocus = document.activeElement;
  focusTrapEl = el;
  const focusable = el.querySelectorAll(FOCUSABLE_SELECTOR);
  if (focusable.length) focusable[0].focus();
  document.addEventListener("keydown", handleFocusTrap);
}

function handleFocusTrap(e) {
  if (e.key !== "Tab" || !focusTrapEl) return;
  const focusable = focusTrapEl.querySelectorAll(FOCUSABLE_SELECTOR);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function releaseFocusTrap() {
  document.removeEventListener("keydown", handleFocusTrap);
  focusTrapEl = null;
  if (previousFocus) previousFocus.focus();
  previousFocus = null;
}

/* === REQUIREMENTS POPUP === */
function showRequirements(name) {
  const tool = allTools.find(t => t.name === name);
  const msg = tool?.requirements || `Requirements for ${name}…\n\nPlease contact the owner.`;
  if (popupText) popupText.innerHTML = nl2br(esc(msg));
  popupBox?.classList.remove("hidden");
  trapFocus(popupBox);
}

function closePopup() {
  popupBox?.classList.add("hidden");
  releaseFocusTrap();
}

closePopupBtn?.addEventListener("click", closePopup);
popupBox?.addEventListener("click", (e) => { if (e.target === popupBox) closePopup(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && popupBox && !popupBox.classList.contains("hidden")) closePopup();
});

/* === AUTOCOMPLETE === */
function getRecents() { return safeGetJSON(RECENT_KEY, []); }

function saveRecent(name) {
  const r = [name, ...getRecents().filter(x => x !== name)].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENT_KEY, JSON.stringify(r));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
  autocompleteBox?.classList.add("hidden");
  clearHistoryBtn?.classList.add("hidden");
  announce("Search history cleared.");
}

function setACExpanded(expanded) {
  searchInput?.setAttribute("aria-expanded", String(expanded));
  if (!expanded) autocompleteBox?.classList.add("hidden");
}

function renderAutoItems(items, onPick) {
  autocompleteBox.innerHTML = items
    .map(n => `<div class="ac-item" role="option" data-name="${esc(n)}">${esc(n)}</div>`).join("");
  autocompleteBox.classList.remove("hidden");
  setACExpanded(true);
  selectedIdx = -1;
  autocompleteBox.querySelectorAll(".ac-item").forEach(d =>
    d.addEventListener("mousedown", () => onPick(d.dataset.name))
  );
}

function showRecents() {
  const r = getRecents();
  if (!r.length) { clearHistoryBtn?.classList.add("hidden"); return; }
  clearHistoryBtn?.classList.remove("hidden");
  renderAutoItems(r, (name) => {
    saveRecent(name);
    searchInput.value = name;
    saveSearch(name);
    applyAll();
    setACExpanded(false);
  });
}

function updateACSelection(items) {
  items.forEach((el, i) => el.classList.toggle("selected", i === selectedIdx));
}

const debouncedApply = debounce((q) => {
  saveSearch(q);
  applyAll();
}, 220);

function initAutocomplete() {
  if (!searchInput || !autocompleteBox) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    clearHistoryBtn?.classList.add("hidden");

    if (!q) {
      setACExpanded(false);
      debouncedApply("");
      return;
    }

    const results = advancedSearch(q).slice(0, 6);
    if (results.length) {
      renderAutoItems(results.map(t => t.name), (name) => {
        saveRecent(name);
        saveSearch(name);
        applyAll();
        setACExpanded(false);
      });
    } else {
      setACExpanded(false);
    }

    debouncedApply(q);
  });

  searchInput.addEventListener("keydown", (e) => {
    const items = autocompleteBox.querySelectorAll(".ac-item");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % items.length;
      updateACSelection(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
      updateACSelection(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0) items[selectedIdx].dispatchEvent(new Event("mousedown"));
      else debouncedApply(searchInput.value);
      setACExpanded(false);
    } else if (e.key === "Escape") {
      setACExpanded(false);
    }
  });

  searchInput.addEventListener("focus", () => {
    if (!searchInput.value.trim()) showRecents();
  });

  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      setACExpanded(false);
      clearHistoryBtn?.classList.add("hidden");
    }, 150);
  });

  clearHistoryBtn?.addEventListener("click", clearRecentSearches);
}

/* === SORT SELECT === */
sortSelect?.addEventListener("change", () => {
  saveSort(sortSelect.value);
  applyAll();
});

/* === EMPTY STATE CLEAR BUTTON === */
emptyStateClear?.addEventListener("click", () => {
  saveSearch("");
  saveFilters(["all"]);
  if (searchInput) searchInput.value = "";
  applyAll();
});

/* === BREADCRUMB NAVIGATION === */
breadcrumbHome?.addEventListener("click", (e) => { e.preventDefault(); clearHash(); });
breadcrumbCat?.addEventListener("click", (e) => {
  e.preventDefault();
  const cat = breadcrumbCat.textContent.toLowerCase();
  clearHash();
  if (cat && cat !== "tools") {
    saveFilters([cat]);
    applyAll();
  }
});

/* === STICKY BACK BUTTON === */
stickyBackBtn?.addEventListener("click", clearHash);

/* === ANIMATED STATS === */
function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const startTime = performance.now();
  function update(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function updateStats() {
  const types = new Set(allTools.map(t => (t.type || "").toLowerCase()).filter(Boolean));
  if (statTotalTools) {
    statTotalTools.dataset.target = allTools.length;
    animateCounter(statTotalTools, allTools.length);
  }
  if (statCategories) {
    statCategories.dataset.target = types.size;
    animateCounter(statCategories, types.size);
  }
  updateFavStat();
}

function updateFavStat() {
  if (statFavorites) statFavorites.textContent = getFavorites().length;
}

/* === PULL TO REFRESH (mobile) === */
function initPullToRefresh() {
  if (!pullToRefresh) return;
  let startY = 0;
  let pulling = false;
  const threshold = 80;

  document.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0 && !isDetailMode) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 30 && diff < threshold * 2) {
      pullToRefresh.classList.add("visible");
    }
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if (!pulling) return;
    pulling = false;
    if (pullToRefresh.classList.contains("visible")) {
      pullToRefresh.classList.remove("visible");
      loadData();
    }
  }, { passive: true });
}

/* === LIVE COUNTDOWN === */
setInterval(() => {
  const now = Date.now();
  for (const el of document.querySelectorAll("[data-expiry]")) {
    const exp = Date.parse(el.dataset.expiry);
    if (isNaN(exp)) continue;
    if (exp <= now) { el.remove(); continue; }
    el.textContent = formatTimeLeft(el.dataset.expiry);
  }
}, 60_000);

/* === DATA LOADING PROGRESS === */
function showLoadProgress(pct) {
  if (!dataLoadProgress || !dataLoadBar) return;
  dataLoadProgress.classList.add("active");
  dataLoadProgress.setAttribute("aria-valuenow", String(Math.round(pct)));
  dataLoadBar.style.width = pct + "%";
}

function hideLoadProgress() {
  if (!dataLoadProgress || !dataLoadBar) return;
  dataLoadBar.style.width = "100%";
  setTimeout(() => {
    dataLoadProgress.classList.remove("active");
    dataLoadBar.style.width = "0";
  }, 400);
}

/* === LOAD DATA === */
async function loadData() {
  container.className = "main-grid";
  container.innerHTML = '<div class="tool-card skeleton"></div>'.repeat(getSkeletonCount());
  emptyState?.classList.add("hidden");
  showLoadProgress(5);

  try {
    const total = DATA_FILES.length;
    let loaded = 0;

    const results = await Promise.allSettled(
      DATA_FILES.map(url => {
        const fetchUrl = url + (url.includes("?") ? "&" : "?") + CACHE_BUST;
        return fetch(fetchUrl).then(r => {
          loaded++;
          showLoadProgress(5 + (loaded / total) * 85);
          return r.ok ? r.json() : Promise.reject(r.statusText);
        });
      })
    );

    const merged = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value);

    const seen = new Set();
    allTools = merged.filter(t => {
      if (!t.name || !t.type) return false;
      const key = t.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Normalize tags & keywords
    for (const t of allTools) {
      if (typeof t.tags === "string") t.tags = t.tags.split(",").map(s => s.trim());
      if (typeof t.keywords === "string") t.keywords = t.keywords.split(",").map(s => s.trim());
      if (!Array.isArray(t.tags)) t.tags = [];
      if (!Array.isArray(t.keywords)) t.keywords = [];
    }

    showLoadProgress(95);
    initFilters();
    applyAll();
    updateStats();
    applyHash();
    hideLoadProgress();
  } catch (err) {
    console.error("Data load error:", err);
    hideLoadProgress();
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-muted)">
        <p>Error loading data.</p>
        <button onclick="loadData()"
          style="margin-top:.5rem;padding:.4rem .8rem;border-radius:var(--radius-md);background:var(--color-primary);color:#fff;border:none;cursor:pointer">
          Retry
        </button>
      </div>`;
  }
}

/* === HASH CHANGE === */
window.addEventListener("hashchange", () => {
  if (!location.hash || location.hash === "#") clearHash();
  else applyHash();
});

/* === INIT === */
initTheme();
initBanner();
initScroll();
initNav();
initAutocomplete();
initPullToRefresh();
if (container) loadData();