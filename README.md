# Gridzy

A relaxing block-puzzle game for the browser, Android and iOS. Drag pieces onto an 8×8 board and fill rows or columns to blast them. No ads, no purchases, no data collection.

See [prd.md](prd.md) for the full product plan.

**Play online:** https://eshanajam00.github.io/ai-agents/

Every push to `main` is checked (typecheck, lint, tests), built and published to GitHub Pages by
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Requirements

- [Node.js](https://nodejs.org) 22.12 or newer (the LTS version is recommended)

## Getting started

```sh
npm install      # once, downloads the libraries
npm run dev      # starts the game at http://localhost:5173
```

## Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Run the game locally with live reload              |
| `npm run dev:phone` | Same, but reachable from a phone on the same Wi-Fi |
| `npm test`          | Run the game-logic tests                           |
| `npm run coverage`  | Tests plus a coverage report                       |
| `npm run check`     | Typecheck, lint and test everything                |
| `npm run build`     | Production build into `apps/web/dist`              |
| `npm run preview`   | Serve the production build locally                 |

## Android app

Requirements: Android Studio installed (it provides Java 21), and `ANDROID_HOME` pointing to the
Android SDK. Gradle downloads go to `.gradle-home/` next to the project, or to `GRADLE_USER_HOME` if
you set it.

| Command                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run apk`            | Build the web game, copy it into Android, and create a debug APK |
| `npm run android:sync`   | Only rebuild the web game and copy it into the Android project   |
| `npm run android:assets` | Regenerate the launcher icons and splash images                  |

The finished APK is copied to `apk/Gridzy-<version>-debug.apk`.

### Releasing a new Android version

1. Raise `versionCode` (e.g. `10000` → `10100`) and `versionName` (e.g. `1.0.0` → `1.1.0`) in
   `apps/mobile/android/app/build.gradle`, and `APP_VERSION` in `apps/web/src/version.ts`.
2. `npm run apk:release` builds a signed APK at `apk/Gridzy.apk` (plus a versioned copy).
   The signing key is read from `../Gridzy-keys/keystore.properties`, **outside** this repository,
   or from the file named by `GRIDZY_SIGNING_PROPERTIES`. Never commit the key or its passwords.
3. Commit, tag and push: `git tag v1.1.0` then `git push --follow-tags`.
4. On GitHub, create a Release for the tag and upload `apk/Gridzy.apk`. Keep the file name
   `Gridzy.apk`: the website's download button always points to
   https://github.com/EshaNajam00/ai-agents/releases/latest/download/Gridzy.apk

## Project layout

```
packages/core   Game rules: board, pieces, scoring, combos, generator (pure TypeScript + tests)
apps/web        Browser game: React (screens) + PixiJS (board, pieces, animation)
apps/mobile     Capacitor shell that packages apps/web as the Android app
```
