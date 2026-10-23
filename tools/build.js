// Builds the published site into a folder: one pre-rendered page per language
// (English at /, others at /zh/, /fr/ ...), plus sitemap.xml and robots.txt, so search engines
// can index every language. Usage: node tools/build.js _site
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const OUT = path.resolve(process.argv[2] || "_site");
const SITE = "https://lawncammw.com";

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["config.js", "assets/i18n.js", "assets/species.js", "assets/photos/manifest.js"]) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, "utf8"), ctx);
}
const { LAWNCAM_I18N: I18N, LAWNCAM_LANGS: LANGS, LAWNCAM_SPECIES: SPECIES, LAWNCAM_CONFIG: CFG } = ctx.window;
const LOCAL = ctx.window.LAWNCAM_LOCAL_PHOTOS || {};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LOCALE = { en: "en_US", zh: "zh_CN", fr: "fr_FR", pt: "pt_PT", es: "es_ES", de: "de_DE", ru: "ru_RU", ar: "ar_AR" };
const urlFor = (code) => SITE + (code === "en" ? "/" : "/" + code + "/");
const photo = (file, width) => (LOCAL[file] ? LOCAL[file].src : ctx.window.commonsImg(file, width));
const absolute = (src) => (src.startsWith("/") ? SITE + src : src);

function seoHead(code, t) {
  const alts = LANGS.map((l) => `  <link rel="alternate" hreflang="${l.code}" href="${urlFor(l.code)}">`);
  alts.push(`  <link rel="alternate" hreflang="x-default" href="${urlFor("en")}">`);
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LAWNCAM",
    url: SITE + "/",
    logo: SITE + "/assets/favicon.svg",
    description: I18N.en.meta_desc,
    address: { "@type": "PostalAddress", addressLocality: "Lilongwe", addressCountry: "MW" },
    areaServed: "Worldwide",
    knowsAbout: ["Lake Malawi cichlids", "African cichlids", "Ornamental fish export", "Mbuna", "Aulonocara peacock cichlids"],
  };
  if (CFG.email && !/example\.com$/.test(CFG.email)) org.email = CFG.email;
  return [
    `  <link rel="canonical" href="${urlFor(code)}">`,
    ...alts,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="LAWNCAM">`,
    `  <meta property="og:title" content="${esc(t.title)}">`,
    `  <meta property="og:description" content="${esc(t.meta_desc)}">`,
    `  <meta property="og:url" content="${urlFor(code)}">`,
    `  <meta property="og:image" content="${esc(absolute(photo(ctx.window.LAWNCAM_PHOTOS.hero, 1600)))}">`,
    `  <meta property="og:locale" content="${LOCALE[code] || code}">`,
    `  <script type="application/ld+json">${JSON.stringify(org)}</script>`,
  ].join("\n");
}

function fishCards(t) {
  return SPECIES.map((s) =>
    `<article class="fish"><img src="${esc(photo(s.photo, 640))}" alt="${esc(s.trade + " (" + s.name + ")")}" loading="lazy">` +
    `<div class="fish-body"><h3>${esc(s.trade)}</h3><p class="sci">${esc(s.name)}</p>` +
    `<p class="meta">${esc(t.adult_size + ": " + s.size)}</p></div></article>`
  ).join("\n");
}

function render(code) {
  const t = Object.assign({}, I18N.en, I18N[code]);
  const info = LANGS.find((l) => l.code === code);
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = html.replace('<html lang="en" dir="ltr">', `<html lang="${code}" dir="${info.rtl ? "rtl" : "ltr"}">`);
  html = html.replace("  <!--SEO-->", seoHead(code, t));
  // fill text of every data-i18n element (they contain plain text only)
  html = html.replace(/(<(\w+)[^>]*\sdata-i18n="(\w+)"[^>]*>)[^<]*(<\/\2>)/g, (m, open, tag, key, close) => open + esc(t[key] || "") + close);
  // fill translated attributes
  html = html.replace(/<[^>]*data-i18n-attr="(\w+):(\w+)"[^>]*>/g, (tagText, attr, key) => {
    const cleaned = tagText.replace(new RegExp(`\\s${attr}="[^"]*"`), "");
    return cleaned.replace(/\s*\/?>$/, (end) => ` ${attr}="${esc(t[key] || "")}"${end}`);
  });
  html = html.replace('<img id="about-img" alt="Lake Malawi"', `<img id="about-img" src="${esc(photo(ctx.window.LAWNCAM_PHOTOS.canoes, 900))}" alt="Canoes on Lake Malawi"`);
  html = html.replace('<div class="grid" id="fish-grid"></div>', `<div class="grid" id="fish-grid">\n${fishCards(t)}\n</div>`);
  const dir = code === "en" ? OUT : path.join(OUT, code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of ["config.js", "credits.html"]) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.cpSync(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });
LANGS.forEach((l) => render(l.code));

const today = new Date().toISOString().slice(0, 10);
const links = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${urlFor(l.code)}"/>`).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map((l) => `  <url>\n    <loc>${urlFor(l.code)}</loc>\n    <lastmod>${today}</lastmod>\n${links}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor("en")}"/>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`built ${LANGS.length} language pages into ${OUT}`);
