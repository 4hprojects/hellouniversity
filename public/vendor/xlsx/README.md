# Vendored SheetJS (xlsx.full.min.js)

- **Version:** 0.20.3
- **Source:** https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js
- **Vendored:** 2026-07-06 (EXECUTION-TRACKER P2-7)

Single client-side copy used by every page that imports/exports spreadsheets
(student `/attendance` + the CRFV attendance/reports/admin-register/audit/payment pages).
Do **not** re-add CDN `<script>` tags for xlsx — versions ≤0.19.2 have known
prototype-pollution/ReDoS CVEs, and the npm `xlsx` package is frozen at 0.18.5.
To upgrade, download a newer build from cdn.sheetjs.com, replace this file, and
update the version here.
