"""List large landscape JPEGs in some Commons categories and download 900px previews into candidates/."""
import json, os, re, sys, time, urllib.parse, urllib.request
API = "https://commons.wikimedia.org/w/api.php"
UA = "LAWNCAM-website-photo-fetch/1.0 (https://github.com/afridavvv/lawncam)"
CATS = ["Fish of Lake Malawi", "Lake Malawi cichlids", "Cichlidae of Lake Malawi", "Lake Malawi", "Cape Maclear", "Nkhata Bay",
        "Likoma Island", "Aulonocara", "Sciaenochromis fryeri", "Labidochromis caeruleus", "Pseudotropheus", "Maylandia",
        "Melanochromis", "Nimbochromis", "Copadichromis", "Protomelas", "Placidochromis", "Mbuna", "Lake Malawi National Park",
        "Cichlid aquariums", "Aulonocara stuartgranti", "Aulonocara jacobfreibergi", "Metriaclima", "Cynotilapia", "Otopharynx"]
OUT = "candidates"
SKIP = re.compile(r"map|satellite|orbit|nasa|landsat|chart|diagram|flag|logo", re.I)

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def members(cat):
    cont = {}
    while True:
        q = {"action": "query", "format": "json", "formatversion": 2, "generator": "categorymembers",
             "gcmtitle": "Category:" + cat, "gcmtype": "file", "gcmlimit": 50, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 900}
        q.update(cont)
        try:
            data = json.loads(get(API + "?" + urllib.parse.urlencode(q)))
        except Exception as e:
            print("FAIL cat", cat, e, file=sys.stderr); return
        for p in data.get("query", {}).get("pages", []):
            yield p
        if "continue" in data: cont = data["continue"]
        else: return
        time.sleep(0.3)

def plain(h): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h or "")).strip()

os.makedirs(OUT, exist_ok=True)
seen, index = set(), []
for cat in CATS:
    for p in members(cat):
        title = p.get("title", "")
        if title in seen or not p.get("imageinfo"): continue
        seen.add(title)
        ii = p["imageinfo"][0]
        w, h = ii.get("width", 0), ii.get("height", 0)
        if ii.get("mime") != "image/jpeg" or w < 1400 or h == 0 or w / h < 1.2 or SKIP.search(title): continue
        meta = ii.get("extmetadata", {}); val = lambda k: meta.get(k, {}).get("value", "")
        n = len(index) + 1
        try:
            open(os.path.join(OUT, f"{n:03d}.jpg"), "wb").write(get(ii.get("thumburl") or ii["url"]))
        except Exception as e:
            print("FAIL dl", title, e, file=sys.stderr); continue
        index.append({"n": n, "file": title.replace("File:", ""), "cat": cat, "w": w, "h": h,
                      "license": plain(val("LicenseShortName")), "author": plain(val("Artist")), "page": ii.get("descriptionurl", "")})
        print(n, title, w, h, plain(val("LicenseShortName")))
        time.sleep(0.3)
        if len(index) >= 160: break
    if len(index) >= 160: break
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)
print(len(index), "candidates")
