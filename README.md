# Philately Passport (unofficial companion)

An **unofficial**, offline-friendly companion web app for India Post's state **Philately Passport** booklets:

| Passport | Edition | Booklet slots | Price | In this app |
|---|---|---|---|---|
| Karnataka | v3 2026 | 100 PPCs | ₹600 | 100 locations, 30 districts |
| Tamil Nadu | Oct 2026 | 58 PPCs | ₹650 | 59 candidate PPCs (TN circle incl. Puducherry), 27 districts |

> Not affiliated with India Post or the Department of Posts. A tick in this app is a personal note, never an official cancellation.

## Features

- **Map** (Leaflet + OpenStreetMap tiles): filter by passport, district and collected/to-collect. Approximate pins have a dashed ring.
- **Digital passport pages** in order, with short guide text, the PPC design name, post office/PIN/office type, a "collected" tick and an editable date. A drawn SVG "postmark" inks in when you tick a page.
- **Progress** per passport and per district (each district links to a filtered map). JSON **backup export/import**.
- **Photo log** of your real ink impressions: stored on the device in **IndexedDB**, downscaled to max 1600 px. No backend.
- **Near me**: sort by distance from your GPS position or a preset city, plus **weekend clusters** (greedy radius clustering + nearest-neighbour visiting order, 25–100 km).
- **Guide**: how it works, where to buy (with sources), collector tips, data provenance, disclaimer.
- **PWA**: Angular service worker. The app shell and `data/locations.json` are prefetched; OSM tiles are cached as you browse (performance strategy, 30 days).
- **i18n**: signal-based runtime translation (`src/app/i18n`). English is complete; `kn`/`ta`/`hi` dictionaries are typed `Partial<>` stubs (nav labels only, draft) that fall back to English.

## Tech

Angular 22 (standalone components, signals, `httpResource`, `input()`/`linkedSignal`, zoneless, new control flow, lazy routes with component input binding), Leaflet 1.9, `idb`. No UI library. Styling is plain SCSS with CSS custom properties: paper, postal red and ink blue, perforated edges and serif display type.

```
src/app/
  core/          models, LocationsStore (httpResource), VisitsStore (localStorage), PhotoStore (IndexedDB),
                 GeolocationStore, geo.ts (haversine + clustering)
  shared/        cancellation-mark (SVG postmark), location-card, progress bar, confidence badge
  features/      home, map, passport, location (detail + photos), nearby, progress, guide
  i18n/          en.ts (source of truth, typed keys), kn/ta/hi stubs, I18n service + `t` pipe
public/data/locations.json   compiled dataset
scripts/compile_data.py      builds the dataset from data-sources/
scripts/nominatim_cache.py   one-off, rate-limited (1 req/s) Nominatim geocoding with cache
scripts/screenshots.py       Playwright screenshots of the served build
data-sources/                cached raw inputs (so the build is reproducible offline)
```

## Run

```bash
npm install
npm start                      # dev server at http://localhost:4200
npx ng build                   # production build -> dist/philately-passport/browser
# serve the production build with SPA fallback:
npx http-server dist/philately-passport/browser -p 4321 -c-1 --gzip --proxy "http://localhost:4321?"
```

Rebuild the data: `python3 scripts/compile_data.py`. Refresh geocoding with `python3 scripts/nominatim_cache.py` first; it only queries uncached rows.

## Live site

Unofficial companion, hosted on GitHub Pages: <https://gokulsenthilk.github.io/philately-passport/>

Production build for that subpath:

```bash
npx ng build --base-href=/philately-passport/
# copy dist/philately-passport/browser/index.html to 404.html so SPA deep links work on GitHub Pages
```


## Data: sources, confidence and gaps

Each record has `id, passport, order, state, district, place, ppcTheme, ppcSince, guide, postOffice, postOfficeRank, officeType, pin, lat, lng, booklet{status,note}, confidence{…per field}, geocode{method,note}, notes[], sources[]`.

Sources (fetched 17 Nov 2026):
1. Community PPC list with post office + rank, district and PIN: <https://praneethsaichunduru.github.io/ppcsofindia.github.io/list-pincode.html> (111 KA, 57 TN, 2 PY rows).
2. Unofficial list of the 100 Karnataka passport locations: <https://philatelypassport.web.app/cancellations/>
3. Press coverage of the TN launch: New Indian Express (17 Nov 2026), DT Next (13 Nov 2026), TNC News (31 Oct 2026), Vikatan (29 Oct 2026), and CN Traveller (21 Aug 2026) for the KA sale counters.
4. OpenStreetMap `amenity=post_office` via the Overpass API (ODbL), and Nominatim for town/village centres.
5. GeoNames postal codes (CC-BY 4.0) for PIN-area fallbacks.

**Booklet coverage**
- **Karnataka: 100/100** locations come from the unofficial tracker's list. All 100 were matched to a known PPC in source 1. This is *not* verified against the printed booklet, so `booklet.status = "listed"`.
  - **3 PIN conflicts** are flagged in `notes` with `pin: low`: Halashi (591142 vs 591120), Nagarahole (571258 vs 571250) and KGF Miner (Oorgaum 563120 vs Championreefs 563117).
  - **3 ambiguous theme matches**: Bandipur has two PPCs (Tiger Face and Tiger Paw), Srirangapatna has two (Gumbaz and Tipu's crown and sword), and "Mysuru Dasara Emblem" is matched only by guess.
- **Tamil Nadu: 0/58 confirmed from a booklet list.** The official circle page (`tamilnadupost.cept.gov.in/pictorial-cancellation-available.php`) returns HTTP 403 to automated fetches. Vikatan says TN "currently has 58 PPCs", and the passport gathers these existing cancellations. Source 1 has 59 candidates for the circle (57 TN + 2 Puducherry), so one candidate is probably not in the booklet. **11** are named in press coverage (`press-mentioned`); the other 48 are `candidate`.

**Coordinates.** No coordinate is invented; each one traces to a source row:

| method | KA | TN | confidence |
|---|---|---|---|
| `osm-post-office`: OSM post office matched by name near the town | 17 | 7 | medium |
| `nominatim-locality`: town/village centre | 59 | 43 | approximate |
| `geonames-locality`: GeoNames place in that PIN | 19 | 5 | approximate |
| `pin-centroid`: median of GeoNames points for the PIN | 5 | 4 | approximate (can be several km off) |

**Other gaps:** post-office **hours** are not included (no reliable source). The **guide text** is short original wording written for this app (`confidence.guide = "editorial"`) and should be reviewed. Booklet page order is unknown, so the app orders KA by district and TN by PIN. The office type comes from the rank in source 1 (GPO/HO/SO/BO). One entry (Tiruchirappalli PB, the Philatelic Bureau) has no rank and is left unknown.

## Next steps

- Get the official TN 58-list (TN circle page, or a photo of the booklet index) and the KA booklet index, then set `booklet.status = confirmed` and the real page order.
- Verify post-office coordinates and hours with the India Post locator, crowd corrections, or a partnership.
- Translate the guide text and UI (kn/ta/hi). Add sale-alert routines. Wrap the app with Capacitor for the stores.
