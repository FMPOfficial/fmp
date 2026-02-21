/* ===================================================
   favorites.js — Favorites Page Logic
   Reads favorites from FMPStorage (storage.js)
   Fetches tool data to display full card info
   =================================================== */

   const S = window.FMPStorage;

   const SITE_ROOT    = "../";
   const CACHE_BUST   = "v=" + Date.now();
   const DATA_FILES   = [
     "data/tools.json", "data/bots.json", "data/checkers.json",
     "data/game.json", "data/others.json", "data/cookies.json",
     "data/methods.json", "data/membership.json"
   ];
   
   /* === DOM === */
   const favGrid         = document.getElementById("favGrid");
   const favEmpty        = document.getElementById("favEmpty");
   const favNoResults    = document.getElementById("favNoResults");
   const favCount        = document.getElementById("favCount");
   const favSearch       = document.getElementById("favSearch");
   const favSortBtn      = document.getElementById("favSortBtn");
   const favClearBtn     = document.getElementById("favClearBtn");
   const favClearSearch  = document.getElementById("favClearSearch");
   const confirmOverlay  = document.getElementById("favConfirmOverlay");
   const confirmCancel   = document.getElementById("favConfirmCancel");
   const confirmDelete   = document.getElementById("favConfirmDelete");
   
   /* === STATE === */
   let allTools       = [];
   let favToolsCache  = [];
   let sortOrder      = "name";   // "name" | "name-desc" | "type"
   
   /* === HELPERS === */
   const esc = (s = "") =>
     String(s)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#39;");
   
   /* === LOAD ALL TOOL DATA === */
   async function loadAllTools() {
     try {
       const results = await Promise.allSettled(
         DATA_FILES.map(url => {
           const full = SITE_ROOT + url + (url.includes("?") ? "&" : "?") + CACHE_BUST;
           return fetch(full).then(r => r.ok ? r.json() : Promise.reject(r.statusText));
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
     } catch (err) {
       console.error("Failed to load tool data:", err);
       allTools = [];
     }
   }
   
   /* === GET FAVORITE TOOLS (with full data) === */
   function getFavTools() {
     const favNames = S.getFavorites();
     const nameSet = new Set(favNames.map(n => n.toLowerCase()));
     return allTools.filter(t => nameSet.has(t.name.toLowerCase()));
   }
   
   /* === RENDER === */
   function render() {
     const query = (favSearch?.value || "").trim().toLowerCase();
     let tools = getFavTools();
   
     // Sort
     if (sortOrder === "name") {
       tools.sort((a, b) => a.name.localeCompare(b.name));
     } else if (sortOrder === "name-desc") {
       tools.sort((a, b) => b.name.localeCompare(a.name));
     } else if (sortOrder === "type") {
       tools.sort((a, b) => (a.type || "").localeCompare(b.type || "") || a.name.localeCompare(b.name));
     }
   
     // Search filter
     if (query) {
       tools = tools.filter(t => {
         const name = (t.name || "").toLowerCase();
         const desc = (t.description || "").toLowerCase();
         const type = (t.type || "").toLowerCase();
         const tags = (t.tags || []).join(" ").toLowerCase();
         return name.includes(query) || desc.includes(query) || type.includes(query) || tags.includes(query);
       });
     }
   
     favToolsCache = tools;
   
     // Update count
     const totalFavs = S.getFavorites().length;
     if (favCount) {
       favCount.textContent = totalFavs === 0
         ? "No saved tools yet"
         : `${totalFavs} saved tool${totalFavs !== 1 ? "s" : ""}`;
     }
   
     // No favorites at all
     if (totalFavs === 0) {
       favGrid.innerHTML = "";
       favEmpty?.classList.remove("hidden");
       favNoResults?.classList.add("hidden");
       return;
     }
   
     favEmpty?.classList.add("hidden");
   
     // Have favorites but search returned nothing
     if (tools.length === 0 && query) {
       favGrid.innerHTML = "";
       favNoResults?.classList.remove("hidden");
       return;
     }
   
     favNoResults?.classList.add("hidden");
   
     // Build cards
     const frag = document.createDocumentFragment();
     tools.forEach(tool => {
       frag.appendChild(buildCard(tool));
     });
     favGrid.replaceChildren(frag);
   }
   
   /* === BUILD CARD === */
   function buildCard(tool) {
     const card = document.createElement("div");
     card.className = "fav-card";
     card.dataset.name = tool.name;
   
     const imgSrc = tool.image || "../assets/placeholder.jpg";
     const safeName = esc(tool.name);
     const desc = esc(tool.description || "No description available.");
     const type = esc(tool.type || "Tool");
     const tags = (tool.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join("");
     const toolUrl = `${SITE_ROOT}index.html#tool=${encodeURIComponent(tool.name)}`;
   
     // Price display
     let priceText = "";
     if (tool.pricing) {
       const first = Object.entries(tool.pricing)[0];
       if (first) priceText = `${esc(first[0])}: ${esc(first[1])}`;
     } else if (tool.price) {
       priceText = esc(tool.price.split("\n")[0]);
     }
   
     card.innerHTML = `
       <div class="fav-card-thumb">
         <span class="fav-type-badge">${type}</span>
         <button class="fav-remove-btn" data-name="${safeName}" aria-label="Remove ${safeName} from favorites" title="Remove from favorites">✕</button>
         <a href="${esc(toolUrl)}">
           <img src="${esc(imgSrc)}" alt="${safeName}" loading="lazy"
                onerror="this.src='../assets/placeholder.jpg'" />
         </a>
       </div>
       <div class="fav-card-body">
         <h3 class="fav-card-name"><a href="${esc(toolUrl)}">${safeName}</a></h3>
         <p class="fav-card-desc">${desc}</p>
         <div class="fav-card-tags">${tags}</div>
       </div>
       ${priceText ? `
       <div class="fav-card-footer">
         <span class="fav-card-price">${priceText}</span>
         <a href="${esc(toolUrl)}" class="fav-card-view">View →</a>
       </div>` : `
       <div class="fav-card-footer">
         <span class="fav-card-price"></span>
         <a href="${esc(toolUrl)}" class="fav-card-view">View →</a>
       </div>`}`;
   
     return card;
   }
   
   /* === REMOVE SINGLE FAVORITE === */
   function removeFavorite(name) {
     S.toggleFavorite(name);
     const card = favGrid.querySelector(`.fav-card[data-name="${CSS.escape(name)}"]`);
     if (card) {
       card.classList.add("removing");
       card.addEventListener("animationend", () => {
         render();
       }, { once: true });
     } else {
       render();
     }
   }
   
   /* === EVENT: Remove button clicks (delegation) === */
   favGrid?.addEventListener("click", (e) => {
     const removeBtn = e.target.closest(".fav-remove-btn");
     if (!removeBtn) return;
     e.preventDefault();
     e.stopPropagation();
     removeFavorite(removeBtn.dataset.name);
   });
   
   /* === EVENT: Search === */
   favSearch?.addEventListener("input", () => {
     render();
   });
   
   /* === EVENT: Clear search === */
   favClearSearch?.addEventListener("click", () => {
     if (favSearch) favSearch.value = "";
     render();
   });
   
   /* === EVENT: Sort toggle === */
   favSortBtn?.addEventListener("click", () => {
     if (sortOrder === "name") {
       sortOrder = "name-desc";
       favSortBtn.innerHTML = '<span class="fav-action-icon">↕</span> Z → A';
     } else if (sortOrder === "name-desc") {
       sortOrder = "type";
       favSortBtn.innerHTML = '<span class="fav-action-icon">↕</span> Type';
     } else {
       sortOrder = "name";
       favSortBtn.innerHTML = '<span class="fav-action-icon">↕</span> A → Z';
     }
     render();
   });
   
   /* === EVENT: Clear all (with confirm) === */
   favClearBtn?.addEventListener("click", () => {
     if (S.getFavorites().length === 0) return;
     confirmOverlay?.classList.remove("hidden");
   });
   
   confirmCancel?.addEventListener("click", () => {
     confirmOverlay?.classList.add("hidden");
   });
   
   confirmDelete?.addEventListener("click", () => {
     S.saveFavorites([]);
     confirmOverlay?.classList.add("hidden");
     render();
   });
   
   confirmOverlay?.addEventListener("click", (e) => {
     if (e.target === confirmOverlay) confirmOverlay.classList.add("hidden");
   });
   
   document.addEventListener("keydown", (e) => {
     if (e.key === "Escape" && confirmOverlay && !confirmOverlay.classList.contains("hidden")) {
       confirmOverlay.classList.add("hidden");
     }
   });
   
   /* === INIT === */
   (async function init() {
     await loadAllTools();
     render();
   })();