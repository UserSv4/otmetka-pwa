# Compact half-shift option — 2026-09-23

Applied directly to the installed Otmetka PWA cache: all five status buttons now share one row with equal widths and a 47px height. Marks sit above their labels. Removed the half-shift button's full-row span.

The half-shift diagonal uses the exact present orange (#F28C28) and absent red (#D94D48). CSS references the existing present/absent color variables, including the soft backgrounds; PNG metadata uses matching colors. The shared-image layout is unchanged.

Only cached `styles.css` and `src/constants.js` were replaced. Local source matches those assets; local service-worker version is shell-v7 for any future authorized release. No public deployment or additional app features. Exact originals, replacements, and data backup are in the private `installed-before.json` and `installed-changes.json` files.

Handed off before the visual check. The installed PWA at its actual 411px viewport shows five equal ~66.34px-wide buttons on the same row, all labels fully inside their buttons, matching orange colors, and ready-offline status. Saved attendance JSON is byte-for-byte unchanged. See `verification.json` and `installed-screen.png`.

No deployment or startup helper was added.
