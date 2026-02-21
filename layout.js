// Shared navbar & footer renderer for all pages

(function renderSharedLayout() {
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");
  if (!headerHost && !footerHost) return;

  const path = window.location.pathname || "";
  const file = path.split("/").pop() || "index.html";
  const inSubdir = path.includes("/pages/") || path.includes("/resources/");
  const prefix = inSubdir ? "../" : "./";

  const isHome    = file === "" || file === "index.html";
  const isReviews = file === "reviews.html";
  const isContact = file === "contact.html";
  const isFaq     = file === "faq.html";

  const navHTML = `
    <nav class="navbar" role="navigation">
      <div class="navbar-left">
        <a class="logo" href="${prefix}index.html">
          <img src="${prefix}assets/icons/fmp-icon.gif" alt="FMP Logo" />
        </a>
      </div>
      <button aria-label="Toggle menu" class="navbar-toggle" id="navbarToggle">☰</button>
      <div class="navbar-right" id="navbarMenu">
        <a href="${prefix}index.html"${isHome ? ' class="active"' : ""}>Home</a>
        <a href="${prefix}pages/reviews.html"${isReviews ? ' class="active"' : ""}>Reviews</a>
        <a href="${prefix}pages/contact.html"${isContact ? ' class="active"' : ""}>Contact</a>
        <a href="${prefix}pages/faq.html"${isFaq ? ' class="active"' : ""}>FAQ</a>
        <button id="darkToggle" title="Toggle Dark Mode">💡</button>
      </div>
    </nav>
  `;

  const footerHTML = `
    <footer class="footer" id="contact">
      <div class="footer-content">
        <div class="footer-section contact">
          <h2>
            <img src="${prefix}assets/icons/contact.gif" alt="Contact Icon" class="footer-icon" />
            Contact
          </h2>
          <p>For purchases, support, or custom orders, reach out via:</p>
          <ul>
            <li>
              <a href="https://t.me/fmpChatBot" target="_blank">
                <img src="${prefix}assets/icons/footers-icons/bot.png" alt="Telegram Bot Icon" class="footer-subicon" />
                Telegram Bot: @fmpChatBot
              </a>
            </li>
            <li>
              <a href="https://t.me/flamemodparadise" target="_blank">
                <img src="${prefix}assets/icons/footers-icons/telegram.png" alt="Personal Telegram Icon" class="footer-subicon" />
                Personal Telegram: @flamemodparadise
              </a>
            </li>
            <li>
              <a href="#" target="_blank">
                <img src="${prefix}assets/icons/footers-icons/discord.png" alt="Discord Icon" class="footer-subicon" />
                Discord: YourDiscordHandle
              </a>
            </li>
          </ul>
        </div>

        <div class="footer-section links">
          <h2>Quick Links</h2>
          <ul>
            <li>
              <a href="${prefix}index.html">
                <img src="${prefix}assets/icons/footers-icons/house.png" alt="Home Icon" class="footer-subicon" />
                Home
              </a>
            </li>
            <li>
              <a href="${prefix}pages/reviews.html">
                <img src="${prefix}assets/icons/footers-icons/reviews.png" alt="Reviews Icon" class="footer-subicon" />
                Reviews
              </a>
            </li>
            <li>
              <a href="${prefix}pages/contact.html">
                <img src="${prefix}assets/icons/footers-icons/phone.png" alt="Contact Icon" class="footer-subicon" />
                Contact
              </a>
            </li>
            <li>
              <a href="${prefix}pages/faq.html">
                <img src="${prefix}assets/icons/footers-icons/faq.png" alt="FAQ Icon" class="footer-subicon" />
                FAQ
              </a>
            </li>
          </ul>
        </div>

        <div class="footer-section resources">
          <h2>Resources</h2>
          <ul>
            <li>
              <a href="${prefix}resources/tos.html">
                <img src="${prefix}assets/icons/footers-icons/terms.png" alt="Terms &amp; Conditions" class="footer-subicon" />
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a href="${prefix}resources/privacy.html">
                <img src="${prefix}assets/icons/footers-icons/privacy.png" alt="Privacy Policy" class="footer-subicon" />
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="${prefix}resources/about.html">
                <img src="${prefix}assets/icons/footers-icons/info.png" alt="About Us" class="footer-subicon" />
                About Us
              </a>
            </li>
            <li>
              <a href="${prefix}resources/sitemap.html">
                <img src="${prefix}assets/icons/footers-icons/site.png" alt="Sitemap" class="footer-subicon" />
                Sitemap
              </a>
            </li>
          </ul>
        </div>
      </div>
      <hr class="footer-divider" />
      <div class="footer-bottom">
        <p>© 2025 Flame Mod Paradise. All rights reserved.</p>
        <p>Use these tools responsibly. No refunds for digital items after purchase.</p>
      </div>
    </footer>
  `;

  if (headerHost) headerHost.innerHTML = navHTML.trim();
  if (footerHost) footerHost.innerHTML = footerHTML.trim();
})();

