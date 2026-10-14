# Installed PWA deletion fix — 2026-09-21

The installed Chrome PWA at https://usersv4.github.io/otmetka-pwa/ was repaired directly through its CacheStorage API. Only the cached `src/model.js` was changed. `getOverviewPeople` now returns the active roster, so removed people are excluded from PNG rows, pagination, and totals even when they have history in the selected week. Existing restore/undo behavior is retained.

The installed cache remains `otmetka-pwa-fresh-shell-v2`, controlled by the existing service worker. No remote site or GitHub repository was modified. The local source has the same fix and a shell-v3 cache version for a future authorized release. A future upstream service-worker release could replace this device-local repair.

`installed-before.json` contains the original cached text assets and exact localStorage data backup; keep it private. `installed-model.before.js` and `installed-model.after.js` record the exact runtime change. Data was byte-for-byte unchanged after patching and reloading.

Verification after handoff: 8 focused model/overview tests passed; the installed app loaded the fixed function and showed 15 current people with no removed people in the overview. The actual share button PNG was captured locally without sending anything, then visually inspected: 1400 × 1496, 15 rows, totals denominator 15. See `verification.json` and `shared-overview-1.png`.
