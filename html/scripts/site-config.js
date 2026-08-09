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
    "current-role": renderCurrentRole,   // logo + label/value fact rows (current-role page)
    socials: renderSocials,              // grid of external icon tiles (social-media page)
    "tech-stack": renderTechStack,       // categorised grids of tool logos (tech-stack page)
    certifications: renderCertifications, // categorised badge tiles w/ status (certifications page)
    "public-speaking": renderPublicSpeaking, // talks grouped by year (public-speaking page)
    event: renderEvent,                    // single event detail page (public-speaking/<event>/<year>)
    gallery: renderGallery                 // bootstrap photo carousel (public-speaking/*/photos/*)
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

    // Fact rows are the top-level key/value pairs, in file order.
    // Reserved keys are skipped, and empty values are omitted (no blank rows).
    var reserved = { version: 1, imageBaseUrl: 1, images: 1, items: 1 };
    Object.keys(data).forEach(function (key) {
      if (reserved[key]) return;
      var value = data[key];
      if (value == null || String(value).trim() === "") return;

      var row = el("div", "row");
      row.appendChild(el("div", "col-5"));

      var labelCol = el("div", "col-1");
      var h5 = document.createElement("h5");
      h5.textContent = key + ":";
      labelCol.appendChild(h5);
      row.appendChild(labelCol);

      var valueCol = el("div", "col-2");
      var p = document.createElement("p");
      p.textContent = String(value); // text, never HTML -> no XSS
      valueCol.appendChild(p);
      row.appendChild(valueCol);

      row.appendChild(el("div", "col-4"));
      mount.appendChild(row);
    });
  }

  // Grid of external social icons: col-2 > .socials.zoom > a[_blank] > img.
  // Same shape as the dashboard cards, different classes + links open in a new tab.
  function renderSocials(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var frag = document.createDocumentFragment();

    items.forEach(function (item) {
      var col = el("div", "col-2");
      var card = el("div", "socials zoom");

      var link = document.createElement("a");
      link.href = isSafeUrl(item.url) ? item.url : "#";
      link.title = item.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      var src = joinUrl(base, item.image);
      if (src) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = item.name;
        img.loading = "lazy";
        link.appendChild(img);
      } else {
        var label = el("span", "socials-label");
        label.textContent = item.name; // text, never HTML -> no XSS
        link.appendChild(label);
      }

      card.appendChild(link);
      col.appendChild(card);
      frag.appendChild(col);
    });

    mount.appendChild(frag);
  }

  // Categorised tool logos: for each category, an <h4> heading + a row of
  // col-sm-1 external icon tiles, with <hr> between categories. Reads
  // data.categories (each { name, items:[{ name, url, image }] }).
  function renderTechStack(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var categories = (data.categories || [])
      .filter(function (c) { return c && c.enabled !== false; })
      .sort(function (a, b) { return (a.order ?? 999) - (b.order ?? 999); });

    categories.forEach(function (cat, idx) {
      var headRow = el("div", "row");
      var headCol = el("div", "col");
      var h4 = document.createElement("h4");
      h4.textContent = cat.name || "";
      headCol.appendChild(h4);
      headRow.appendChild(headCol);
      mount.appendChild(headRow);

      var tilesRow = el("div", "row");
      (cat.items || [])
        .filter(function (it) { return it && it.enabled !== false; })
        .sort(function (a, b) { return (a.order ?? 999) - (b.order ?? 999); })
        .forEach(function (item) {
          var col = el("div", "col-sm-1");
          var link = document.createElement("a");
          link.href = isSafeUrl(item.url) ? item.url : "#";
          link.title = item.name;
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          var src = joinUrl(base, item.image);
          if (src) {
            var img = document.createElement("img");
            img.src = src;
            img.alt = item.name;
            img.className = "techstack";
            img.loading = "lazy";
            link.appendChild(img);
          }
          col.appendChild(link);
          tilesRow.appendChild(col);
        });
      mount.appendChild(tilesRow);

      if (idx < categories.length - 1) {
        mount.appendChild(document.createElement("hr"));
      }
    });
  }

  // Categorised certification badges. Same category shape as tech-stack, but
  // each tile wraps the link in .certification.zoom and shows a status label
  // (active / in progress / to do) driven by item.status.
  function renderCertifications(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var STATUS_TEXT = { active: "active", inprogress: "in progress", todo: "to do" };
    var byOrder = function (a, b) { return (a.order ?? 999) - (b.order ?? 999); };

    var categories = (data.categories || [])
      .filter(function (c) { return c && c.enabled !== false; })
      .sort(byOrder);

    categories.forEach(function (cat, idx) {
      var headRow = el("div", "row");
      var headCol = el("div", "col");
      var h4 = document.createElement("h4");
      h4.textContent = cat.name || "";
      headCol.appendChild(h4);
      headRow.appendChild(headCol);
      mount.appendChild(headRow);

      var tilesRow = el("div", "row text-center");
      (cat.items || [])
        .filter(function (it) { return it && it.enabled !== false; })
        .sort(byOrder)
        .forEach(function (item) {
          var col = el("div", "col-sm-1");
          var card = el("div", "certification zoom");
          var link = document.createElement("a");
          link.href = isSafeUrl(item.url) ? item.url : "#";
          link.title = item.name || "";
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          if (item.status) {
            var label = document.createElement("label");
            label.className = item.status;
            label.textContent = STATUS_TEXT[item.status] || item.status;
            link.appendChild(label);
          }

          var src = joinUrl(base, item.image);
          if (src) {
            var img = document.createElement("img");
            img.src = src;
            img.alt = item.name || "";
            img.loading = "lazy";
            link.appendChild(img);
          }

          card.appendChild(link);
          col.appendChild(card);
          tilesRow.appendChild(col);
        });
      mount.appendChild(tilesRow);

      if (idx < categories.length - 1) {
        mount.appendChild(document.createElement("hr"));
      }
    });
  }

  // Talks grouped by year: each category (a year) is an <h4> heading + a row
  // of col-4 .publicspeaking.zoom tiles linking to the event page. <hr> between.
  function renderPublicSpeaking(mount, items, data) {
    var base = data.imageBaseUrl || "";
    var byOrder = function (a, b) { return (a.order ?? 999) - (b.order ?? 999); };

    var categories = (data.categories || [])
      .filter(function (c) { return c && c.enabled !== false; })
      .sort(byOrder);

    categories.forEach(function (cat, idx) {
      var headRow = el("div", "row");
      var headCol = el("div", "col");
      var h4 = document.createElement("h4");
      h4.textContent = cat.name || "";
      headCol.appendChild(h4);
      headRow.appendChild(headCol);
      mount.appendChild(headRow);

      var tilesRow = el("div", "row");
      (cat.items || [])
        .filter(function (it) { return it && it.enabled !== false; })
        .sort(byOrder)
        .forEach(function (item) {
          var col = el("div", "col-4");
          var card = el("div", "publicspeaking zoom");
          var link = document.createElement("a");
          link.href = isSafeUrl(item.url) ? item.url : "#";
          link.title = item.name || "";

          var src = joinUrl(base, item.image);
          if (src) {
            var img = document.createElement("img");
            img.src = src;
            img.alt = item.name || "";
            img.loading = "lazy";
            link.appendChild(img);
          }
          card.appendChild(link);
          col.appendChild(card);
          tilesRow.appendChild(col);
        });
      mount.appendChild(tilesRow);

      if (idx < categories.length - 1) {
        mount.appendChild(document.createElement("hr"));
      }
    });
  }

  // Single public-speaking event page: title/year heading, linked header
  // image, talk heading + description paragraphs, and a row of link icons
  // (external links open in a new tab; relative ones — e.g. photos — don't).
  function renderEvent(mount, items, data) {
    var base = data.assetBaseUrl || data.imageBaseUrl || "";
    var isExternal = function (u) { return /^https?:\/\//i.test(u || ""); };

    var titleRow = el("div", "row heading");
    var titleCol = el("div", "col");
    var h1 = document.createElement("h1");
    if (data.title) h1.appendChild(document.createTextNode(data.title));
    if (data.year) {
      h1.appendChild(document.createElement("br"));
      h1.appendChild(document.createTextNode(data.year));
    }
    titleCol.appendChild(h1);
    titleRow.appendChild(titleCol);
    mount.appendChild(titleRow);

    if (data.header && data.header.image) {
      var hRow = el("div", "row heading");
      var hCol = el("div", "col");
      var hImg = document.createElement("img");
      hImg.src = joinUrl(base, data.header.image);
      hImg.className = "eventheader";
      hImg.alt = data.header.alt || data.title || "";
      if (data.header.url && isSafeUrl(data.header.url)) {
        var hLink = document.createElement("a");
        hLink.href = data.header.url;
        if (isExternal(data.header.url)) { hLink.target = "_blank"; hLink.rel = "noopener noreferrer"; }
        hLink.title = data.header.alt || data.title || "";
        hLink.appendChild(hImg);
        hCol.appendChild(hLink);
      } else {
        hCol.appendChild(hImg);
      }
      hRow.appendChild(hCol);
      mount.appendChild(hRow);
    }

    var bodyRow = el("div", "row");
    bodyRow.appendChild(el("div", "col-2"));
    var bodyCol = el("div", "col-8");
    if (data.heading) {
      var bh = document.createElement("h1");
      bh.textContent = data.heading;
      bodyCol.appendChild(bh);
    }
    (data.body || []).forEach(function (para) {
      if (!para) return;
      var p = document.createElement("p");
      p.textContent = para; // text, never HTML -> no XSS
      bodyCol.appendChild(p);
    });
    bodyRow.appendChild(bodyCol);
    bodyRow.appendChild(el("div", "col-2"));
    mount.appendChild(bodyRow);

    var links = (data.links || []).filter(function (l) { return l && l.enabled !== false && l.url; });
    if (links.length) {
      var lRow = el("div", "row heading");
      links.forEach(function (link) {
        var lCol = el("div", "col");
        if (link.label) {
          var lbl = el("h2", "eventheaderlink");
          lbl.textContent = link.label;
          lCol.appendChild(lbl);
        }
        var a = document.createElement("a");
        a.href = isSafeUrl(link.url) ? link.url : "#";
        if (isExternal(link.url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
        a.title = link.title || "";
        var img = document.createElement("img");
        img.src = joinUrl(base, link.image);
        img.className = "eventlink";
        img.alt = link.alt || link.title || "";
        a.appendChild(img);
        lCol.appendChild(a);
        lRow.appendChild(lCol);
      });
      mount.appendChild(lRow);
    }
  }

  // Event photo gallery: a heading ("Event Photos" / title / year) + a
  // Bootstrap carousel built from data.photos (base = assetBaseUrl + photoBase),
  // then initialised (2s auto-cycle, no touch) once Bootstrap is available.
  function renderGallery(mount, items, data) {
    var base = data.assetBaseUrl || "";
    var photoBase = data.photoBase || "";

    var titleRow = el("div", "row heading");
    var titleCol = el("div", "col");
    var h1 = document.createElement("h1");
    h1.appendChild(document.createTextNode("Event Photos"));
    if (data.title) { h1.appendChild(document.createElement("br")); h1.appendChild(document.createTextNode(data.title)); }
    if (data.year) { h1.appendChild(document.createElement("br")); h1.appendChild(document.createTextNode(data.year)); }
    titleCol.appendChild(h1);
    titleRow.appendChild(titleCol);
    mount.appendChild(titleRow);

    var photos = (data.photos || []).filter(function (p) { return p && p.image; });
    if (!photos.length) return;

    var row = el("div", "row");
    var col = el("div", "col");
    var carousel = el("div", "carousel slide");
    carousel.id = "carouselExample";

    var inner = el("div", "carousel-inner");
    photos.forEach(function (p, i) {
      var item = el("div", "carousel-item" + (i === 0 ? " active" : ""));
      var img = document.createElement("img");
      img.src = joinUrl(base, photoBase + p.image);
      img.className = "d-block w-45";
      img.alt = p.alt || ("Photo " + (i + 1));
      item.appendChild(img);
      inner.appendChild(item);
    });
    carousel.appendChild(inner);

    ["prev", "next"].forEach(function (dir) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel-control-" + dir;
      btn.setAttribute("data-bs-target", "#carouselExample");
      btn.setAttribute("data-bs-slide", dir);
      var icon = el("span", "carousel-control-" + dir + "-icon");
      icon.setAttribute("aria-hidden", "true");
      var hidden = el("span", "visually-hidden");
      hidden.textContent = dir === "prev" ? "Previous" : "Next";
      btn.appendChild(icon);
      btn.appendChild(hidden);
      carousel.appendChild(btn);
    });

    col.appendChild(carousel);
    row.appendChild(col);
    mount.appendChild(row);

    try {
      if (window.bootstrap && window.bootstrap.Carousel) {
        new window.bootstrap.Carousel(carousel, { interval: 2000, touch: false });
      }
    } catch (e) {
      console.error("[site-config] carousel init failed", e);
    }
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
