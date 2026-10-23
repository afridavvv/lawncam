# LAWNCAM website

Static website for LAWNCAM, a Lake Malawi ornamental fish exporter. English by default, plus Chinese, French, Portuguese, Spanish, German, Russian and Arabic (right-to-left).

## Files

- `index.html`: the whole site (about, fish catalogue, export process, order form, contact)
- `credits.html`: photo credits
- `config.js`: **edit this** for the order email key (Web3Forms), contact email, WhatsApp, phone, address
- `assets/i18n.js`: all text in 8 languages
- `assets/species.js`: fish catalogue and photo file names (Wikimedia Commons)
- `tools/fetch_photos.py`: downloads the photos plus author and licence into `assets/photos/`
- `tools/build.js`: builds one pre-rendered page per language (`/`, `/zh/`, `/fr/` ...) with hreflang tags, plus `sitemap.xml` and `robots.txt`, for Google indexing
- `.github/workflows/deploy.yml`: on every push to `main`, downloads the photos and publishes to GitHub Pages

## Orders

The order form emails each order through [Web3Forms](https://web3forms.com). Put the access key for the receiving inbox in `config.js`. Without a key the form opens the buyer's mail app with the order filled in, addressed to `email` in `config.js`.

## Preview locally

```
python3 tools/fetch_photos.py   # optional
node tools/build.js _site
cd _site && python3 -m http.server 8000
```
