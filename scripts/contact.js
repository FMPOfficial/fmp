document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("contact-card-wrapper");
  const FALLBACK = "../assets/icons/default-contact.png";

  /**
   * Escape HTML-special characters to prevent XSS when
   * interpolating user-supplied / JSON-sourced strings.
   */
  const esc = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  /**
   * Render an error / empty-state message inside the wrapper.
   */
  const showMessage = (msg) => {
    wrapper.innerHTML = `<p class="contact-msg">${esc(msg)}</p>`;
  };

  fetch("../json/contact.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        showMessage("No contact methods found.");
        return;
      }

      const frag = document.createDocumentFragment();

      for (const item of data) {
        const type    = item.type        || "Contact";
        const icon    = item.icon        || FALLBACK;
        const title   = item.title       || "Untitled";
        const desc    = item.description || "";
        const link    = item.link        || "#";
        const btnText = item.buttonText  || "Contact";

        const card = document.createElement("div");
        card.className = "flip-card";

        card.innerHTML = `
          <div class="flip-card-inner">
            <div class="flip-card-front" title="${esc(type)}">
              <img src="${esc(icon)}"
                   alt="${esc(type)} Icon"
                   loading="lazy"
                   width="70"
                   height="70"
                   onerror="this.onerror=null;this.src='${esc(FALLBACK)}';">
              <h3>${esc(title)}</h3>
              <p>${esc(desc)}</p>
            </div>
            <div class="flip-card-back">
              <h3>${esc(title)}</h3>
              <p>${esc(desc)}</p>
              <a href="${esc(link)}"
                 target="_blank"
                 rel="noopener noreferrer">
                ${esc(btnText)}
              </a>
            </div>
          </div>`;

        card.addEventListener("click", (e) => {
          if (e.target.closest("a")) return;
          card.firstElementChild.classList.toggle("flipped");
        });

        frag.appendChild(card);
      }

      wrapper.innerHTML = "";
      wrapper.appendChild(frag);
    })
    .catch((err) => {
      console.error("Contact load error:", err);
      showMessage("Unable to load contact information at this time.");
    });
});