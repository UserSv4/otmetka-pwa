# Past-day clear/reset — 2026-09-21

Installed directly into the existing Chrome PWA cache, keeping the previous deleted-person screenshot fix. Modified cached model, app, styles, and both HTML entry points. No public repository or remote site changes. The active installed cache remains shell-v2; local source is prepared as shell-v4 for any future authorized release.

Select a past day in the seven-day strip and choose **Сбросить день**. **Очистить день** removes every mark for that date, including archived-person history, and leaves dashes in the PNG. **Заполнить по привычке** replaces that date with current active-person defaults. Neither operation changes another day or a person's default. Both provide a 12-second undo restoring the exact day's entries. Cleared days retain their initialized marker so they remain empty on reopening.

Deployment was handed off before optional tests. Syntax checks passed; 11 focused model/overview tests passed. Browser smoke checks used synthetic data on localhost port 4191, verified both buttons and undo, confirmed clearing persists on reload, preserved other days and defaults, and captured the actual share-button PNG for visual inspection. Removed people remain excluded. No runtime errors. Test-origin data and the test tab were removed afterward.

The real installed app's controls were inspected without changing attendance; installed-final.json confirms the user's exact saved JSON remained unchanged after reopening the PWA. Private backups and original/replacement cache asset bodies are in installed-before.json and installed-changes.json.

browser-smoke.py is an optional test script, not part of installation. It needs a root-accessible Chrome DevTools socket, an empty test origin, and a tab served by the existing local server on port 4191. Mobile dialog screenshots through CDP stalled on Android, so the test checks settled dialog bounds and inspects the generated PNG instead. An Agent Workspace WebAPK startup timeout was recorded through its feedback tool.
