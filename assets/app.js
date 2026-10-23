(function () {
  var CFG = window.LAWNCAM_CONFIG || {};
  var I18N = window.LAWNCAM_I18N;
  var LANGS = window.LAWNCAM_LANGS;
  var SPECIES = window.LAWNCAM_SPECIES;
  var lang = "en";
  var cart = [];

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }
  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  // ---------- language ----------
  // Each language is its own pre-rendered page (/ for English, /zh/, /fr/ ...), built by tools/build.js.
  function langPath(code) { return code === "en" ? "/" : "/" + code + "/"; }
  function isLang(c) { return LANGS.some(function (l) { return l.code === c; }); }

  function pickLang() {
    var q = new URLSearchParams(location.search).get("lang");
    var page = document.documentElement.lang;
    if (q && isLang(q) && q !== page) { location.replace(langPath(q) + location.hash); }
    return isLang(page) ? page : "en";
  }

  function applyLang(code) {
    lang = code;
    var info = LANGS.filter(function (l) { return l.code === code; })[0];
    document.documentElement.lang = code;
    document.documentElement.dir = info.rtl ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (n) {
      var p = n.dataset.i18nAttr.split(":");
      n.setAttribute(p[0], t(p[1]));
    });
    $("#lang").value = code;
    renderFish();
    renderCart();
    renderSpeciesSelect();
  }

  // ---------- catalogue ----------
  var filter = "all";
  function renderFish() {
    var T = Object.assign({}, I18N.en, I18N[lang]);
    $("#fish-grid").innerHTML = SPECIES.filter(function (s) { return filter === "all" || s.group === filter; }).map(function (s) {
      return fishCardHTML(s, T, cart.some(function (c) { return c.id === s.id; }));
    }).join("");
  }

  $("#fish-grid").addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (b) addItem(b.dataset.add);
  });

  document.querySelectorAll(".filters button").forEach(function (b) {
    b.onclick = function () {
      filter = b.dataset.filter;
      document.querySelectorAll(".filters button").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderFish();
    };
  });

  // ---------- cart ----------
  function speciesLabel(item) {
    if (item.id === "other") return item.custom;
    var s = SPECIES.filter(function (x) { return x.id === item.id; })[0];
    return s ? s.trade + " (" + s.name + ")" : item.id;
  }

  function addItem(id, custom) {
    if (id !== "other" && cart.some(function (c) { return c.id === id; })) {
      location.hash = "#order";
      return;
    }
    cart.push({ id: id, custom: custom || "", size: "m", qty: 50 });
    saveCart();
    renderCart();
    renderFish();
  }

  function saveCart() { store("lawncam_cart", JSON.stringify(cart)); }

  function renderCart() {
    var body = $("#cart-body");
    body.innerHTML = "";
    $("#cart-empty").hidden = cart.length > 0;
    $("#cart-table").hidden = cart.length === 0;
    cart.forEach(function (item, i) {
      var tr = el("tr");
      tr.appendChild(el("td", { "data-label": t("col_species") }, speciesLabel(item)));
      var tdSize = el("td", { "data-label": t("col_size") });
      var sel = el("select", { "aria-label": t("col_size") });
      ["s", "m", "l", "mix"].forEach(function (k) {
        var o = el("option", { value: k }, t("size_" + k));
        if (item.size === k) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = function () { item.size = sel.value; saveCart(); };
      tdSize.appendChild(sel);
      var tdQty = el("td", { "data-label": t("col_qty") });
      var qty = el("input", { type: "number", min: "1", step: "1", value: item.qty, "aria-label": t("col_qty") });
      qty.oninput = function () { item.qty = Math.max(1, parseInt(qty.value, 10) || 1); saveCart(); };
      tdQty.appendChild(qty);
      var tdRm = el("td");
      var rm = el("button", { type: "button", "class": "link-remove" }, t("remove"));
      rm.onclick = function () { cart.splice(i, 1); saveCart(); renderCart(); renderFish(); };
      tdRm.appendChild(rm);
      tr.appendChild(tdSize); tr.appendChild(tdQty); tr.appendChild(tdRm);
      body.appendChild(tr);
    });
  }

  function renderSpeciesSelect() {
    var sel = $("#add-species");
    var prev = sel.value;
    sel.innerHTML = "";
    SPECIES.forEach(function (s) { sel.appendChild(el("option", { value: s.id }, s.trade + " (" + s.name + ")")); });
    sel.appendChild(el("option", { value: "other" }, t("other_species")));
    if (prev) sel.value = prev;
    $("#add-other").hidden = sel.value !== "other";
  }
  $("#add-species").onchange = function () { $("#add-other").hidden = this.value !== "other"; };
  $("#add-btn").onclick = function () {
    var id = $("#add-species").value;
    if (id === "other") {
      var name = $("#add-other").value.trim();
      if (!name) { $("#add-other").focus(); return; }
      addItem("other", name);
      $("#add-other").value = "";
    } else {
      addItem(id);
    }
  };

  // ---------- submit ----------
  var SIZE_EN = { s: "Small (3-5 cm)", m: "Medium (5-8 cm)", l: "Large (8 cm+)", mix: "Mixed / any" };

  function orderRef() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "LC-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function orderText(ref, f) {
    var lines = [
      "New order request " + ref,
      "",
      "Company: " + f.company,
      "Contact: " + f.name,
      "Email: " + f.email,
      "Phone/WhatsApp: " + (f.phone || "-"),
      "Country: " + f.country,
      "Destination airport: " + f.airport,
      "Preferred shipping date: " + (f.date || "-"),
      "Website language: " + lang,
      "",
      "Items:"
    ];
    cart.forEach(function (c, i) {
      lines.push((i + 1) + ". " + speciesLabel(c) + " | " + SIZE_EN[c.size] + " | " + c.qty + " pcs");
    });
    lines.push("", "Notes:", f.notes || "-");
    return lines.join("\n");
  }

  $("#order-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var msg = $("#form-msg");
    msg.className = "form-msg";
    if (!cart.length) { msg.textContent = t("need_items"); msg.classList.add("err"); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (form.botcheck.checked) return;

    var f = {};
    ["company", "name", "email", "phone", "country", "airport", "date", "notes"].forEach(function (k) { f[k] = form[k].value.trim(); });
    var ref = orderRef();
    var text = orderText(ref, f);
    var subject = "LAWNCAM order " + ref + " - " + f.company + " (" + f.country + ")";
    var done = function () {
      msg.textContent = t("success").replace("{ref}", ref);
      msg.classList.add("ok");
      cart = []; saveCart(); renderCart(); renderFish(); form.reset();
    };

    if (!CFG.web3formsKey) {
      location.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
      msg.textContent = t("mail_fallback");
      msg.classList.add("ok");
      return;
    }

    var btn = $("#submit-btn");
    btn.disabled = true;
    btn.textContent = t("sending");
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: CFG.web3formsKey,
        subject: subject,
        from_name: "LAWNCAM website",
        replyto: f.email,
        order_ref: ref,
        message: text
      })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res.success) throw new Error(res.message);
      done();
    }).catch(function () {
      msg.textContent = t("error");
      msg.classList.add("err");
    }).then(function () {
      btn.disabled = false;
      btn.textContent = t("submit");
    });
  });

  // ---------- contact ----------
  function renderContact() {
    var list = $("#contact-list");
    list.innerHTML = "";
    var add = function (key, icon, val, href) {
      if (!val) return;
      var item = el(href ? "a" : "div", { "class": "c-item" });
      if (href) item.setAttribute("href", href);
      item.innerHTML = '<span class="c-ico"><svg class="ico" aria-hidden="true"><use href="#' + icon + '"></use></svg></span>';
      item.appendChild(el("span", { "class": "c-label", "data-i18n": key }, t(key)));
      item.appendChild(el("span", { "class": "c-val", dir: "ltr" }, val));
      list.appendChild(item);
    };
    add("c_email", "i-mail", CFG.email, "mailto:" + CFG.email);
    add("c_phone", "i-phone", CFG.phone, "tel:" + (CFG.phone || "").replace(/\s/g, ""));
    add("c_whatsapp", "i-chat", CFG.whatsapp && "+" + CFG.whatsapp, "https://wa.me/" + CFG.whatsapp);
    add("c_address", "i-pin", CFG.address);
    var fe = $("#footer-email");
    if (CFG.email) { fe.textContent = CFG.email; fe.href = "mailto:" + CFG.email; }
    $("#footer-address").textContent = CFG.address || "";
  }

  // ---------- look and feel ----------
  function fillPhotos() {
    document.querySelectorAll("img[data-photo]").forEach(function (img) {
      if (!img.getAttribute("src")) img.src = commonsImg(img.dataset.photo, +img.dataset.width || 900);
    });
  }

  function fillMarquee() {
    var track = $("#marquee");
    if (track.children.length) return;
    var html = SPECIES.map(function (s) { return "<span><i>" + s.name + "</i></span>"; }).join("");
    track.innerHTML = html + html;
  }

  function watchHeader() {
    var bar = $("#topbar");
    var update = function () { bar.classList.toggle("scrolled", window.scrollY > 30); };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function reveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (n) { io.observe(n); });
  }

  // ---------- init ----------
  try { cart = JSON.parse(store("lawncam_cart") || "[]"); } catch (e) { cart = []; }
  var langSel = $("#lang");
  LANGS.forEach(function (l) { langSel.appendChild(el("option", { value: l.code }, l.label)); });
  langSel.onchange = function () { location.href = langPath(langSel.value) + location.hash; };

  fillPhotos();
  fillMarquee();
  watchHeader();
  reveal();
  $("#year").textContent = new Date().getFullYear();

  var menuBtn = $(".menu-btn");
  menuBtn.onclick = function () {
    var open = document.body.classList.toggle("menu-open");
    $("#topbar").classList.toggle("scrolled", open || window.scrollY > 30);
    menuBtn.setAttribute("aria-expanded", open);
  };
  document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { document.body.classList.remove("menu-open"); }); });

  renderContact();
  applyLang(pickLang());
})();
