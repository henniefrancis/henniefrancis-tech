/*
 * site-config.js — one generic, dependency-free loader for config-driven pages.
 *
 * Usage on any page that needs it:
 *   <div class="row" data-config="/config/dashboard.json" data-render="cards" aria-busy="true"></div>
 *   <script src="/scripts/site-config.js" defer></script>
 *
 * What varies per page is declared in HTML, not in JS:
 *   data-config  -> which JSON file to load (root-absolute, works at any page depth)
 *   data-render  -> which layout/renderer to use (defaults to "cards")
 *
 * Add a NEW layout = add one function to `renderers`.
 * Add a NEW page with an existing layout = add a data-config element. No JS change.
 *
 * Safe by construction: config values are written via textContent / element
 * properties (never innerHTML), and URLs are passed through an allowlist.
 */
(function () {
  "use strict";

  // One entry per LAYOUT, reused across pages.
  var renderers = {
    cards: renderCards,                  // image tiles that link out (the dashboard)
    list: renderList,                    // title + description rows
    biography: renderBiography,          // portrait + ordered paragraphs (biography page)
    "current-role": renderCurrentRole    // logo + label/value fact rows (current-role page)
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    document.querySelectorAll("[data-config]").forEach(load);
  }

  async function load(mount) {
    var url = mount.getAttribute("data-config");
    var type = mount.getAttribute("data-render") || "cards";
    var render = renderers[type];

    if (!url || !render) {
      console.error("[site-config] missing config url or unknown renderer:", url, type);
      return;
    }

    try {
      var res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();

      var items = (data.items || [])
        .filter(function (it) { return it && it.enabled !== false; }) // opt-out via "enabled": false
        .sort(function (a, b) { return (a.order ?? 999) - (b.order ?? 999); });

      mount.textContent = "";
      render(mount, items, data);
      mount.removeAttribute("aria-busy");
    } catch (err) {
      console.error("[site-config] could not load", url, err);
      mount.innerHTML = '<p class="text-center py-4">Content is temporarily unavailable.</p>';
    }
  }

  // ---- Renderers ----

  function renderCards(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var frag = document.createDocumentFragment();

    items.forEach(function (item) {
      var col = el("div", "col-4");
      var card = el("div", "home-card zoom");

      var link = document.createElement("a");
      link.href = isSafeUrl(item.url) ? item.url : "#";
      link.title = item.name;

      var src = joinUrl(base, item.image);
      if (src) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = item.name;
        img.loading = "lazy";
        link.appendChild(img);
      } else {
        var label = el("span", "home-card-label");
        label.textContent = item.name; // text, never HTML -> no XSS
        link.appendChild(label);
      }

      card.appendChild(link);
      col.appendChild(card);
      frag.appendChild(col);
    });

    mount.appendChild(frag);
  }

  function renderList(mount, items, data) {
    var frag = document.createDocumentFragment();

    items.forEach(function (item) {
      var row = el("div", "col-12 config-list-item");

      var link = document.createElement("a");
      link.href = isSafeUrl(item.url) ? item.url : "#";

      var title = el("span", "config-list-title");
      title.textContent = item.name;
      link.appendChild(title);

      if (item.description) {
        var desc = el("span", "config-list-desc");
        desc.textContent = item.description;
        link.appendChild(desc);
      }

      row.appendChild(link);
      frag.appendChild(row);
    });

    mount.appendChild(frag);
  }

  // Portrait (from data.images[0]) + ordered bio paragraphs (from items).
  // Rebuilds the same two-column layout the page had hardcoded.
  function renderBiography(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var portrait = (data.images || [])[0];

    var colImg = el("div", "col-3");
    if (portrait) {
      var src = joinUrl(base, portrait.image);
      if (src) {
        var img = document.createElement("img");
        img.src = src;
        img.className = "portrait";
        img.alt = portrait.name || "";
        colImg.appendChild(img);
      }
    }

    var colText = el("div", "col-9");
    var wrap = el("div", "biography");
    items.forEach(function (item) {
      if (!item.description) return;
      var p = document.createElement("p");
      p.textContent = item.description; // text, never HTML -> no XSS
      wrap.appendChild(p);
    });
    colText.appendChild(wrap);

    mount.appendChild(colImg);
    mount.appendChild(colText);
  }

  // Linked logo (from data.images[0]) + label/value fact rows (from items),
  // reusing the page's existing col-5 / col-1 / col-2 / col-4 grid.
  function renderCurrentRole(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var logo = (data.images || [])[0];

    if (logo) {
      var src = joinUrl(base, logo.image);
      if (src) {
        var row = el("div", "row heading");
        var col = el("div", "col");
        var img = document.createElement("img");
        img.src = src;
        img.className = logo.className || "";
        img.alt = logo.name || "";
        if (logo.url && isSafeUrl(logo.url)) {
          var a = document.createElement("a");
          a.href = logo.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.title = logo.name || "";
          a.appendChild(img);
          col.appendChild(a);
        } else {
          col.appendChild(img);
        }
        row.appendChild(col);
        mount.appendChild(row);
      }
    }

    items.forEach(function (item) {
      var row = el("div", "row");
      row.appendChild(el("div", "col-5"));

      var labelCol = el("div", "col-1");
      var h5 = document.createElement("h5");
      h5.textContent = item.label || "";
      labelCol.appendChild(h5);
      row.appendChild(labelCol);

      var valueCol = el("div", "col-2");
      var p = document.createElement("p");
      p.textContent = item.value || ""; // text, never HTML -> no XSS
      valueCol.appendChild(p);
      row.appendChild(valueCol);

      row.appendChild(el("div", "col-4"));
      mount.appendChild(row);
    });
  }

  // ---- Shared helpers ----

  function el(tag, className) {
    var node = document.createElement(tag);
    node.className = className;
    return node;
  }

  // Join a base URL and a filename, tolerating stray slashes.
  // If the value is already absolute (http(s):// or //), it is used as-is.
  function joinUrl(base, file) {
    if (!file) return null;
    if (/^(https?:)?\/\//i.test(file)) return file;
    if (!base) return file;
    return base.replace(/\/+$/, "") + "/" + file.replace(/^\/+/, "");
  }

  // Only allow site-relative paths or http(s) — blocks javascript:, data:, etc.
  function isSafeUrl(url) {
    if (!url) return false;
    if (/^(\/|\.\/|\.\.\/)/.test(url)) return true;
    try {
      var u = new URL(url, window.location.origin);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch (e) {
      return false;
    }
  }
})();
