# 📍 Punjab OOAT Clinics Mapper – Project Documentation

*Version: 1.0 | Last updated: 2026‑01‑21*

---

## 1. Overview

A lightweight web application that visualises (OOAT) clinics across Punjab, India.
- **Map UI** shows clinic locations, status (functional / non‑functional), and lets users filter by district.
- Clicking a marker opens an info panel with distances to other clinics in the same district.
- Data originates from an Excel sheet that is **masked** before being shipped as JSON.

---

## 2. Architecture & Data Flow

```
Excel (source) ──► scripts/mask_excel.js ──► data/clinics.json
                (masking)                     (public API)

index.html (Leaflet) ──► js/app.js ──► fetch(data/clinics.json)
                         │
                         ├─► js/map.js   (Google Maps fallback)
                         ├─► js/ui.js    (UI controls)
                         └─► js/distance.js (distance calculations)

←→ Browser ←→ Leaflet/CARTO tiles (OpenStreetMap)
```

- **Masking step** runs locally (or in CI) before any `npm run dev` / `npm run build`.
- The front‑end loads the sanitized JSON via `fetch` and builds the map with **Leaflet** (primary) and a legacy **Google Maps** page (`index-google-maps.html`).

---

## 3. Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| **HTML/CSS** | Plain HTML5, vanilla CSS | Full control over design, no framework bloat |
| **JS** | ES6 modules, async/await | Modern, lightweight |
| **Map** | **Leaflet** + CARTO Positron tiles | Open‑source, no API key needed |
| **Fallback** | Google Maps JavaScript API | Legacy demo (`index-google-maps.html`) |
| **Data** | Excel → JSON (masked) | Easy authoring, privacy‑preserving |
| **Build / Dev** | Node.js scripts, `npm` | Simple task runner |
| **Version Control** | Git (ignore raw `.xlsx`) | Prevent accidental data leakage |

---

## 4. Repository Layout

```
clinic_mapping/
├─ data/
│   ├─ clinics.json          ← sanitized data consumed by the app
│   └─ punjab_districts.geojson
├─ js/
│   ├─ app.js                ← entry point (init, fetch data)
│   ├─ map.js                ← Leaflet map logic
│   ├─ ui.js                 ← UI controls, filters
│   └─ distance.js           ← Haversine distance helper
├─ css/
│   └─ styles.css            ← UI styling (gradient header, glassmorphism)
├─ assets/                    ← images/icons (generated via generate_image)
├─ scripts/
│   └─ mask_excel.js         ← masks Excel → JSON (run before build)
├─ index.html                ← main Leaflet app
├─ index-google-maps.html    ← legacy Google Maps demo
├─ convert-excel.js          ← original conversion helper (kept for reference)
├─ README.md                 ← this document
└─ .gitignore                ← ignores *.xlsx, node_modules, etc.
```

---

## 5. Masking the Excel Data

**Why:** The original Excel may contain PII (patient names, phone numbers, etc.).

**How:**
1. **`.gitignore`** – add `*.xlsx` so the raw file never enters the repo.
2. **`scripts/mask_excel.js`** – reads the workbook, removes columns listed in `SENSITIVE_COLUMNS`, hashes any column in `HASHED_COLUMNS`, normalises keys, adds a UUID, and writes `data/clinics.json`.
3. Run automatically via `npm run mask-data` (hooked into `dev` and `build` scripts) or as a CI step.

*Result:* Only the fields required for mapping (id, name, district, lat, lng, status) are exposed.

---

## 6. Development & Build

```bash
# Install dependencies
npm ci

# Mask data & start dev server
npm run dev        # runs mask-data → npm start (or your own server)

# Build for production (if you have a bundler)
npm run build
```

**Scripts in `package.json` (example):**

```json
{
  "scripts": {
    "mask-data": "node scripts/mask_excel.js",
    "dev": "npm run mask-data && serve .",
    "build": "npm run mask-data && npm run build:static"
  }
}
```

---

## 7. Deployment

The app is **static** – just serve the `clinic_mapping/` folder on any static host (GitHub Pages, Netlify, Vercel, S3, etc.).

**CI example (GitHub Actions)** – see the workflow file `.agent/workflows/mask_excel_data.md` generated earlier:
1. Checkout → `npm ci`
2. Run `npm run mask-data` (produces clean JSON)
3. Build (optional) → Deploy artifact

Because the map uses open‑source tiles, no API key or server‑side component is required.

---

## 8. Extending the Project

| Goal | Suggested Change |
|------|------------------|
| **Add new data fields** | Extend `mask_excel.js` with new columns in `HASHED_COLUMNS` or keep them as‑is. |
| **Switch to a modern UI framework** | Wrap the existing Leaflet logic in a React/Vue component; keep the data layer unchanged. |
| **Enable offline use** | Add a Service Worker (Workbox) to cache `clinics.json` and tile assets. |
| **Add authentication** | Serve the static site behind a simple auth proxy (e.g., Netlify Identity) if you ever need restricted access. |

---

## 9. Known Limitations

- **Google Maps page** (`index-google-maps.html`) lacks a valid API key; it’s kept only as a reference.
- No server‑side validation – all data is client‑side; ensure the masked JSON truly removes any PII.
- The map tiles are public; heavy traffic may be rate‑limited by CARTO/OSM – consider self‑hosting tiles for large scale.

---

## 10. Contact & Credits

- **Author:** Arya Dey (original code)
- **Maintainer:** Antigravity (AI‑assisted enhancements)
- **License:** MIT – feel free to fork, improve, and deploy.

---

*End of documentation.*
