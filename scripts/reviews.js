document.addEventListener("DOMContentLoaded", () => {
  const overview = document.getElementById("categoryOverview");
  const detail = document.getElementById("categoryDetail");
  const backBtn = document.getElementById("backButton");
  const detailTitle = document.getElementById("detailTitle");
  const detailPhotos = document.getElementById("detailPhotos");

  const PLACEHOLDER = "../assets/placeholder.jpg";
  let grouped = {};

  /**
   * Escape HTML-special characters to prevent XSS.
   */
  const esc = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  /**
   * Render a status message inside a given container.
   */
  const showMessage = (container, msg) => {
    container.innerHTML = `<p class="gallery-msg">${esc(msg)}</p>`;
  };

  // ── Fetch & Init ──────────────────────────────────
  fetch("../json/reviews.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        showMessage(overview, "No reviews available at this time.");
        return;
      }

      // Build lookup: { category: [images] }
      for (const { category = "Others", images = [] } of data) {
        grouped[category] = images;
      }

      renderOverview();
    })
    .catch((err) => {
      console.error("Reviews load error:", err);
      showMessage(overview, "Sorry, no reviews are available at this time.");
    });

  // ── Category Overview ─────────────────────────────
  function renderOverview() {
    const frag = document.createDocumentFragment();

    for (const [cat, images] of Object.entries(grouped)) {
      const card = document.createElement("div");
      card.className = "category-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.category = cat;

      // Build stacked collage (up to 3 images)
      const covers = images.slice(0, 3);
      const collageHTML = covers
        .map(
          (src, i) =>
            `<img src="${esc(src) || esc(PLACEHOLDER)}"
                  alt="${esc(cat)} cover ${i + 1}"
                  class="stacked-${i + 1}"
                  loading="lazy"
                  onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';">`
        )
        .join("");

      card.innerHTML = `
        <div class="stacked-collage">${collageHTML}</div>
        <h3>${esc(cat)} (${images.length} image${images.length !== 1 ? "s" : ""})</h3>`;

      frag.appendChild(card);
    }

    overview.innerHTML = "";
    overview.appendChild(frag);

    // Event delegation — single listener for all cards
    overview.addEventListener("click", (e) => {
      const card = e.target.closest(".category-card");
      if (!card) return;
      showDetail(card.dataset.category);
    });

    // Keyboard support for category cards
    overview.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".category-card");
      if (!card) return;
      e.preventDefault();
      showDetail(card.dataset.category);
    });
  }

  // ── Detail Gallery ────────────────────────────────
  function showDetail(category) {
    overview.classList.add("hidden");
    detail.classList.remove("hidden");
    detailTitle.textContent = category;

    const images = grouped[category] || [];
    if (images.length === 0) {
      showMessage(detailPhotos, "No images found for this category.");
      return;
    }

    const frag = document.createDocumentFragment();

    for (const src of images) {
      const img = document.createElement("img");
      img.src = src || PLACEHOLDER;
      img.alt = `${category} review`;
      img.loading = "lazy";
      img.onerror = () => {
        img.onerror = null;
        img.src = PLACEHOLDER;
      };
      frag.appendChild(img);
    }

    detailPhotos.innerHTML = "";
    detailPhotos.appendChild(frag);

    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Back Button ───────────────────────────────────
  backBtn?.addEventListener("click", () => {
    detail.classList.add("hidden");
    overview.classList.remove("hidden");
    overview.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ── Image Modal (event delegation) ────────────────
  detailPhotos.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      openModal(e.target.src, e.target.alt);
    }
  });

  /**
   * Open a full-screen image modal with keyboard & click-to-close support.
   */
  function openModal(src, alt) {
    const modal = document.createElement("div");
    modal.className = "image-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Enlarged image");

    modal.innerHTML = `
      <div class="image-modal-content">
        <button class="close-btn" aria-label="Close image">&times;</button>
        <img src="${esc(src)}" alt="${esc(alt)}"
             onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';">
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    // Focus the close button for accessibility
    const closeBtn = modal.querySelector(".close-btn");
    closeBtn.focus();

    const close = () => {
      modal.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };

    // Click outside image or on close button
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".close-btn")) close();
    });

    // Escape key
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
  }
});