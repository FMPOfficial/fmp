document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("faq-container");
  const openAllBtn = document.getElementById("openAllBtn");
  const closeAllBtn = document.getElementById("closeAllBtn");

  /** Track currently highlighted item to avoid querySelectorAll on every click */
  let activeItem = null;

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
   * Render a status message inside the container.
   */
  const showMessage = (msg) => {
    container.innerHTML = `<p class="faq-msg">${esc(msg)}</p>`;
  };

  /**
   * Toggle a single FAQ item open / closed.
   * @param {HTMLElement} item   - The .faq-item element
   * @param {boolean}     [force] - Force open (true) or closed (false). Omit to toggle.
   * @returns {boolean} Whether the item is now open.
   */
  const toggleItem = (item, force) => {
    const isOpen = force !== undefined ? force : !item.classList.contains("open");
    const answer = item.querySelector(".faq-answer");

    item.classList.toggle("open", isOpen);
    answer.classList.toggle("visible", isOpen);
    item.setAttribute("aria-expanded", String(isOpen));

    return isOpen;
  };

  /**
   * Highlight the active FAQ and update URL hash.
   * @param {HTMLElement} item
   * @param {boolean}     isOpen
   * @param {string}      faqId
   */
  const setActive = (item, isOpen, faqId) => {
    if (activeItem && activeItem !== item) {
      activeItem.classList.remove("highlight");
    }

    if (isOpen) {
      item.classList.add("highlight");
      activeItem = item;
      history.replaceState(null, "", `#${faqId}`);
    } else {
      item.classList.remove("highlight");
      activeItem = null;
      history.replaceState(null, "", " ");
    }
  };

  /**
   * If the URL has a hash like #faq-3, open and scroll to that item.
   */
  const applyHash = () => {
    const hash = location.hash.slice(1);
    if (!hash) return;

    const qEl = document.getElementById(hash);
    if (!qEl?.classList.contains("faq-question")) return;

    const item = qEl.parentElement;
    toggleItem(item, true);
    setActive(item, true, hash);
    qEl.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Fetch & render FAQ data ────────────────────────────────────
  fetch("../json/faq.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        showMessage("No FAQ items available at this time.");
        return;
      }

      const frag = document.createDocumentFragment();

      for (const [i, { question, answer }] of data.entries()) {
        const qText = question || "Untitled Question";
        const aText = answer || "No answer provided.";
        const faqId = `faq-${i}`;

        // FAQ item wrapper
        const item = document.createElement("div");
        item.className = "faq-item";
        item.setAttribute("aria-expanded", "false");

        // Question (clickable header)
        const qEl = document.createElement("h2");
        qEl.className = "faq-question";
        qEl.id = faqId;
        qEl.setAttribute("role", "button");
        qEl.setAttribute("tabindex", "0");
        qEl.textContent = qText;

        // Answer (collapsible)
        const aEl = document.createElement("p");
        aEl.className = "faq-answer";
        aEl.textContent = aText;

        // Click handler
        qEl.addEventListener("click", () => {
          const isOpen = toggleItem(item);
          setActive(item, isOpen, faqId);
        });

        // Keyboard support – Enter / Space to toggle
        qEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const isOpen = toggleItem(item);
            setActive(item, isOpen, faqId);
          }
        });

        item.append(qEl, aEl);
        frag.appendChild(item);
      }

      container.innerHTML = "";
      container.appendChild(frag);

      // Open FAQ from URL hash (e.g. #faq-2)
      applyHash();
    })
    .catch((err) => {
      console.error("FAQ load error:", err);
      showMessage("Could not load FAQs at this time.");
    });

  // ── Open / Close All controls ──────────────────────────────────
  openAllBtn?.addEventListener("click", () => {
    for (const item of container.querySelectorAll(".faq-item")) {
      toggleItem(item, true);
    }
  });

  closeAllBtn?.addEventListener("click", () => {
    for (const item of container.querySelectorAll(".faq-item")) {
      toggleItem(item, false);
      item.classList.remove("highlight");
    }
    activeItem = null;
    history.replaceState(null, "", " ");
  });
});