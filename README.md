# Bhutan Standard Place Names

Offline-capable web app for searching standardized English and Dzongkha place names from `Places names of bhutan.xlsx`.

## Live App

https://jamyang2002.github.io/Bhutan-Standard-Place-Names/

## Install

After the site opens once, it can be installed like an app and used offline.

- Desktop Chrome/Edge: open the live app, then click the install icon in the address bar.
- Android Chrome: open the live app, tap the browser menu, then tap **Add to Home screen** or **Install app**.
- iPhone/iPad Safari: open the live app, tap Share, then tap **Add to Home Screen**.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

The app also works with VS Code Live Server at `http://127.0.0.1:5500/index.html`.

## Test

```sh
python3 -m unittest discover -s tests
```

`npm run import-data`, `npm test`, `npm run dev`, and `npm run build` are also defined for environments with Node/npm available.

## Update The Dataset

1. Replace `Places names of bhutan.xlsx` with the new workbook.
2. Run `python3 scripts/import_data.py`.
3. Review `public/data/data-validation-report.json`.
4. Run `python3 -m unittest discover -s tests`.
5. Deploy the static files in this folder.

The import keeps the workbook untouched, writes public JSON under `public/data/`, and excludes private Tshogpa, CID, mobile, phone, and contact-style fields from the app data and search index.

## Generated Data

- `public/data/places.json`: normalized public place records
- `public/data/hierarchy.json`: Dzongkhag, Gewog, Chiwog, and Village browse hierarchy
- `public/data/config.json`: app name, source metadata, and summary statistics
- `public/data/data-validation-report.json`: counts, missing values, duplicates, workbook profile, and privacy exclusions

## Notes

The app uses hash routes so it can be hosted as static files without server-side routing. Search runs entirely in the browser after the JSON dataset loads, and the service worker caches app shell and data files for offline use after the first successful visit.

GitHub Pages deploys automatically from `.github/workflows/deploy.yml` whenever changes are pushed to `main`.

Note: the original Excel workbook containing raw source data has been removed from the repository to avoid publishing private data. If you need to re-generate the public JSON dataset, keep a local copy of `Places names of bhutan.xlsx` outside this repo and run `python3 scripts/import_data.py` locally.
