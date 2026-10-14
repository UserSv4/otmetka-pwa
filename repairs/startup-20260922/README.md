# Installed Otmetka startup recovery — 2026-09-22

The installed WebAPK (`org.chromium.webapk.afbddfe8cfe3cac28_v2`, user 0) hung on its splash screen. Chrome's ordinary pages also failed to render. DevTools could enumerate pages but renderer commands timed out. The PWA JavaScript had not started.

Android's crash buffer recorded repeated Chrome app-zygote child SIGSEGVs during `SpecializeCommon` / `nativeSpecializeAppProcess`, with PC `0x3053ac970c`. That address falls within Zygisk Next's `libzygisk.so` mapping in the system zygote but was unmapped in the crashing child. This implicates a stale root-framework hook in the old Chrome app zygote; the precise trigger was not established.

Force-stopping Chrome and Otmetka alone initially reused the old Chrome app zygote (PID 19118). Android retired that old process at 07:55:20 MSK. Relaunching after it exited created a fresh app zygote (PID 22404) and healthy renderer children. Otmetka then opened normally. No phone reboot, app reinstall, storage clear, source/cache modification, Chrome flag change, or root-framework configuration change was needed.

Before restarting, `browser-storage-before.tar` preserved Chrome Local Storage, the usersv4.github.io IndexedDB, and Service Worker storage. This archive includes other origins' browser storage and must remain private. `recovered-state.json` is a separate exact copy of Otmetka's recovered localStorage JSON.

After the recovery was handed off, visual inspection and an ordinary WebAPK close/relaunch confirmed:

- Standalone Otmetka interface loads completely with 15 active people (30 including archived), 18 recorded dates and 132 entries, revision 259.
- The app reports its complete offline shell, retains `otmetka-pwa-fresh-shell-v2`, and enables the share-summary button.
- Saved JSON is byte-for-byte unchanged across the follow-up relaunch; no attendance controls were used.

See `recovered-summary.json`, `relaunch-summary.json`, `recovered.png`, and `chrome-startup-crashes.log` for evidence. No deployment or startup helper was added. If this exact splash-screen failure recurs, restart Chrome only after its old `com.android.chrome_zygote` process has actually exited. Do not clear Otmetka's browser data.
