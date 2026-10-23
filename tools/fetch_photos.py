"""Download the site's Wikimedia Commons photos into assets/photos/ and record author and licence.

Run from the site root: python3 tools/fetch_photos.py
Writes assets/photos/<file> and assets/photos/manifest.js (read by species.js and credits.html).
Files that cannot be fetched are skipped; the site then loads them straight from Commons.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "photos")
API = "https://commons.wikimedia.org/w/api.php"
UA = "LAWNCAM-website-photo-fetch/1.0 (https://github.com/afridavvv/lawncam)"
WIDE = {"Cichlids-of-Lake-Malawi.jpg": 1600}


def site_photos():
    src = open(os.path.join(ROOT, "assets", "species.js"), encoding="utf-8").read()
    return sorted(set(re.findall(r'(?:photo|hero|canoes):\s*"([^"]+)"', src)))


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def plain(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def info(file, width):
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": 2,
        "titles": "File:" + file, "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": width,
    })
    page = json.loads(get(API + "?" + q))["query"]["pages"][0]
    if page.get("missing") or not page.get("imageinfo"):
        return None
    ii = page["imageinfo"][0]
    meta = ii.get("extmetadata", {})
    val = lambda k: meta.get(k, {}).get("value", "")
    return {
        "url": ii.get("thumburl") or ii["url"],
        "author": plain(val("Artist")) or plain(val("Credit")),
        "license": plain(val("LicenseShortName")),
        "licenseUrl": val("LicenseUrl"),
        "page": ii.get("descriptionurl", ""),
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest, failed = {}, []
    for file in site_photos():
        try:
            meta = info(file, WIDE.get(file, 900))
            if not meta:
                raise RuntimeError("not found on Commons")
            ext = os.path.splitext(urllib.parse.urlparse(meta["url"]).path)[1].lower() or ".jpg"
            name = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.splitext(file)[0]) + ext
            with open(os.path.join(OUT, name), "wb") as f:
                f.write(get(meta["url"]))
            manifest[file] = {"src": "/assets/photos/" + name, **{k: meta[k] for k in ("author", "license", "licenseUrl", "page")}}
            print(f"ok   {file}  [{meta['license']}] {meta['author']}")
        except Exception as e:  # keep going; the site falls back to the Commons URL
            failed.append(file)
            print(f"FAIL {file}: {e}", file=sys.stderr)
        time.sleep(0.5)
    with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as f:
        f.write("window.LAWNCAM_LOCAL_PHOTOS = " + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n")
    print(f"{len(manifest)} downloaded, {len(failed)} failed")


if __name__ == "__main__":
    main()
