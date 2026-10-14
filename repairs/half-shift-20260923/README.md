# Пол смены — installed PWA update, 2026-09-23

Added only the requested `Пол смены` attendance option (`half`). Its mark, selected button, card indicator, summary chip, and shared PNG use a sharp diagonal yellow/red split. The existing four choices remain in their row; the new option has a full-width row below them. Summary chips wrap so the fifth count is visible.

The new value participates in the existing save/restore, remembered-default, count, and PNG flows. PNG totals list half shifts separately, and the legend identifies the new mark. No other features were introduced.

Applied directly to the installed user-0 Chrome WebAPK cache `otmetka-pwa-fresh-shell-v2`: constants, model, app, overview, and styles. No GitHub/public deployment was made. Local source matches the installed assets; local service worker version is shell-v6 for a future authorized release. A future upstream worker update could replace these device-local changes.

Private backup: `installed-before.json` retains exact attendance JSON and original cached text assets. `installed-changes.json` records the five original/replacement assets. The installed update was handed off before optional verification.

Verification: all 15 installed cards expose the new option, the shell reports ready offline, and the saved attendance JSON remains byte-for-byte unchanged after reload. Seventeen focused model/constants/overview checks pass, including half-shift normalization, backup/restore, next-day defaults, and counts. The installed modules generated `sample-half-shift.png`, inspected visually for its split marks, legend, and totals; `installed-screen.png` shows the live status picker. `installed-final.json` confirms the final summary wrapping and unchanged data. An optional isolated browser form test could not create a new Chrome tab and was not run; its temporary localhost server was stopped. No test attendance was written to the installed app.

Installation used one-off browser CacheStorage calls; no deployment or startup helper was added.
