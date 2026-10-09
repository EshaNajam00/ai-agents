# Gridzy

A relaxing block-puzzle game for the browser, Android and iOS. Drag pieces onto an 8×8 board and fill rows or columns to blast them. No ads, no purchases, no data collection.

See [prd.md](prd.md) for the full product plan.

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

## Project layout

```
packages/core   Game rules: board, pieces, scoring, combos, generator (pure TypeScript + tests)
apps/web        Browser game: React (screens) + PixiJS (board, pieces, animation)
```
