// Fish catalogue. "photo" is a Wikimedia Commons file name; credits are listed on credits.html.
window.LAWNCAM_SPECIES = [
  { id: "demasoni",   name: "Pseudotropheus demasoni",       trade: "Demasoni",                 group: "mbuna", size: "8 cm",  photo: "Pseudotropheus_demasoni.jpg" },
  { id: "yellowlab",  name: "Labidochromis caeruleus",       trade: "Electric Yellow Lab",      group: "mbuna", size: "10 cm", photo: "Electric_Yellow_Lab_Cichlid.jpg" },
  { id: "redzebra",   name: "Maylandia estherae",            trade: "Red Zebra",                group: "mbuna", size: "12 cm", photo: "Red_zebra_cichlid.jpg" },
  { id: "lombardoi",  name: "Maylandia lombardoi",           trade: "Kenyi / Lombardoi",        group: "mbuna", size: "13 cm", photo: "Maylandia_lombardoi_male_Lake_Malawi_Cichlid_yellow.jpg" },
  { id: "auratus",    name: "Melanochromis auratus",         trade: "Golden Mbuna",             group: "mbuna", size: "11 cm", photo: "Melanochromis_auratus_(male).jpg" },
  { id: "eurekared",  name: "Aulonocara jacobfreibergi",     trade: "Peacock 'Eureka Red'",     group: "peacock", size: "13 cm", photo: "Aulonocara_jacobfreibergi_eureka_red.jpg" },
  { id: "baenschi",   name: "Aulonocara baenschi",           trade: "Yellow Regal Peacock",     group: "peacock", size: "12 cm", photo: "Aulonocara_baenschi_20241123.jpg" },
  { id: "steveni",    name: "Aulonocara steveni",            trade: "Peacock 'Usisya'",         group: "peacock", size: "14 cm", photo: "Aulonocara_steveni_Usisya.jpg" },
  { id: "fryeri",     name: "Sciaenochromis fryeri",         trade: "Electric Blue Hap",        group: "hap", size: "16 cm", photo: "Fryeri6.jpg" },
  { id: "borleyi",    name: "Copadichromis borleyi",         trade: "Redfin Hap",               group: "hap", size: "15 cm", photo: "Copadichromis_borleyi2.jpg" },
  { id: "venustus",   name: "Nimbochromis venustus",         trade: "Venustus / Giraffe Hap",   group: "hap", size: "25 cm", photo: "Nimbochromis_venustus.JPG" },
  { id: "electra",    name: "Placidochromis electra",        trade: "Deep Water Hap",           group: "hap", size: "16 cm", photo: "Placidochromis_electra_Aquarium_fish_stock_photo.jpg" }
];

window.LAWNCAM_PHOTOS = {
  hero: "Cichlids-of-Lake-Malawi.jpg",
  canoes: "Canoes_on_Lake_Malawi.jpg"
};

// Local copies (assets/photos/) are downloaded at deploy time by tools/fetch_photos.py;
// without them the browser loads the photo straight from Wikimedia Commons.
window.commonsImg = function (file, width) {
  var local = (window.LAWNCAM_LOCAL_PHOTOS || {})[file];
  if (local) return local.src;
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + (width || 800);
};
window.commonsPage = function (file) {
  return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file);
};

// One fish card as HTML, shared by the browser (assets/app.js) and the page builder (tools/build.js).
window.fishCardHTML = function (s, t, inCart) {
  var esc = function (v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var group = String(t["filter_" + s.group] || "").replace(/\s*[(（].*[)）]\s*$/, "");
  return '<article class="fish" data-group="' + s.group + '">' +
    '<figure class="fish-media"><img src="' + esc(window.commonsImg(s.photo, 640)) + '" alt="' + esc(s.trade + " (" + s.name + ")") +
    '" loading="lazy" width="640" height="480"><span class="tag">' + esc(group) + '</span></figure>' +
    '<div class="fish-body"><h3>' + esc(s.trade) + '</h3><p class="sci">' + esc(s.name) + '</p>' +
    '<p class="meta"><svg class="ico" aria-hidden="true"><use href="#i-ruler"></use></svg>' + esc(t.adult_size + ": " + s.size) + '</p>' +
    '<button type="button" class="btn btn-card' + (inCart ? ' done' : '') + '" data-add="' + s.id + '">' +
    (inCart ? '<svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg>' + esc(t.added) : esc(t.add_to_order)) +
    '</button></div></article>';
};
