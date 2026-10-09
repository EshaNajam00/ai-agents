# Gridzy — Product Requirements Document

**Status:** Draft v1 · **Date:** 2026-10-09 · **Owner:** Esha Najam

## 1. Overview

Gridzy is a relaxing, addictive block-puzzle game for the web browser, Android and iOS. Players drag pieces from a tray onto an 8×8 board and clear full rows and columns. It plays like the popular "block blast" genre, but the name, logo, artwork, sounds and music are all original. Nothing is copied from any existing game.

**Audience:** kids and adults. The game must be fun enough for "just one more game" while staying completely safe for children.

**Goals**

- Short, satisfying sessions that are easy to learn and hard to master.
- Smooth 60 fps play, with juicy feedback on every action.
- One shared codebase for web and mobile.

**Non-goals (v1)**

- Accounts, online leaderboards, multiplayer or chat.
- Ads, in-app purchases or any monetization.
- Collecting analytics or any personal data.

## 2. Child safety and privacy (hard requirements)

- **No ads**, no ad SDKs.
- **No in-app purchases**, no paid currency, no "watch to continue."
- **No chat** or user-generated content.
- **No personal data.** No accounts, no analytics, no tracking SDKs, no network requests at runtime. The game works fully offline.
- Only on-device storage: best score, settings, tutorial-done flag and the saved in-progress game.
- No external links inside the game, except possibly a privacy-policy page outside gameplay.
- A strict Content Security Policy on the web build (`default-src 'self'`).
- Must qualify for Google Play "Designed for Families" and the Apple App Store Kids category, and be COPPA/GDPR-K friendly.

## 3. Game rules

### 3.1 Board

- An 8×8 grid of cells. Each cell is either empty or filled with a colored block.

### 3.2 Pieces

- The tray below the board holds **3 pieces** at a time.
- **Pieces never rotate.** Each orientation is its own piece in the piece set.
- Piece set (each cell is 1 block):

| Family                      | Shapes                                 |
| --------------------------- | -------------------------------------- |
| Single                      | 1×1                                    |
| Lines                       | 1×2, 2×1, 1×3, 3×1, 1×4, 4×1, 1×5, 5×1 |
| Squares / rectangles        | 2×2, 3×3, 2×3, 3×2                     |
| Small L (3 cells)           | 4 orientations                         |
| L / J (4 cells)             | 8 orientations                         |
| Big L (5 cells, 3×3 corner) | 4 orientations                         |
| T (4 cells)                 | 4 orientations                         |
| S / Z (4 cells)             | 2 orientations each                    |

- Each piece gets a color from the palette when it is generated (yellow, orange, red, purple, blue, cyan, green).

### 3.3 Placing pieces

- The player drags a piece from the tray. While dragging, the piece is lifted above the finger/cursor so it stays visible.
- A **ghost preview** shows where the piece would land, snapped to the grid. It is highlighted when the spot is valid and hidden when it is not.
- The **rows and columns that would be cleared** by this drop are highlighted during the drag.
- Releasing on a valid spot places the piece. Releasing on an invalid spot animates the piece back to the tray.

### 3.4 Clearing lines

- After a placement, every **full row and full column** is cleared at the same time. A cell shared by a full row and a full column is cleared once.

### 3.5 Refill

- When all 3 tray pieces have been placed, 3 new pieces are generated.
- **Fair generator:** pieces come from a weighted random pool (smaller pieces slightly more common). When generating a new set, if possible, at least one piece must fit the current board (retry up to N times). Players may still lose; the board is just never unfair at the moment a new set appears.
- The random generator is seedable, so tests and replays are deterministic.

### 3.6 Game over

- After every placement (and after refill), if **none** of the remaining tray pieces fits anywhere on the board, the game ends.

## 4. Scoring

| Event                                                | Points                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Place a piece                                        | +1 per block in the piece                                             |
| Clear lines (L = rows + columns cleared in one move) | 10 × L × (L+1) / 2 → 1 line 10, 2 lines 30, 3 lines 60, 4 lines 100 … |
| Combo multiplier                                     | Line-clear points × current combo                                     |
| Perfect clear (board becomes empty)                  | +300 bonus                                                            |

**Combo rules**

- A move that clears at least one line increases the combo by 1 (first clear = combo 1).
- The combo stays alive as long as a line is cleared within **3 placements** of the previous clear. Otherwise it resets to 0.
- The combo counter is shown on the board while it is active.

**Best score**

- Stored on the device. Shown at the top with a **crown icon**.
- When the current score passes the best score during play, a one-time "New Best!" celebration plays.

**Praise popups**

| Trigger          | Popup                 |
| ---------------- | --------------------- |
| 2 lines at once  | "Great!"              |
| 3 lines at once  | "Amazing!"            |
| 4+ lines at once | "Incredible!"         |
| Combo ≥ 2        | "Combo x{n}"          |
| Beat best score  | "New Best!"           |
| Perfect clear    | "Perfect!" + confetti |

## 5. Visual design

- **Background:** a vivid blue-to-purple gradient with soft, slowly drifting, blurred square shapes for depth.
- **Board:** dark navy panel with rounded corners and subtly darker empty cells.
- **Blocks:** glossy, beveled "3D candy" look, drawn in code with gradients: a light top-left highlight, a darker bottom-right bevel and an inner shine. Colors: yellow, orange, red, purple, blue, cyan and green.
- **HUD:** crown and best score at top left, a large current score centered, and a settings gear at top right.
- **Typography:** a rounded, bold, friendly display font (open-license, bundled locally, no font CDN at runtime).
- **Logo:** an original "Gridzy" wordmark in chunky multicolor block letters, made by us (SVG).
- **Responsive:** portrait-first. Works from 320 px wide phones up to desktop, where the game is centered with the background filling the rest.
- **Accessibility:** a "Reduce motion" setting, with sufficient contrast for the HUD and buttons. Block colors also differ in brightness, so they stay distinguishable for color-blind players.

## 6. Animation and game feel (target: 60 fps)

| Moment                   | Effect                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Pick up                  | Piece scales up to full board size with a small bounce (spring). Shadow appears.                                             |
| Drag                     | Piece follows the pointer with no lag. Ghost preview snaps cell by cell.                                                     |
| Drop (valid)             | Snap into place with a quick squash-and-settle, plus a soft "thunk" sound and light haptic.                                  |
| Drop (invalid)           | Piece flies back to its tray slot.                                                                                           |
| Line clear               | Blocks in the line flash white, then pop outward in sequence (wave from the drop point) with sparkles and colored particles. |
| Score                    | Score counts up smoothly. A floating "+points" text rises from the cleared area.                                             |
| Praise popup             | Pops in with overshoot, then fades and floats up.                                                                            |
| Combo                    | Combo badge pulses, getting bigger and brighter as the combo grows.                                                          |
| Perfect clear / New Best | Full-screen confetti burst.                                                                                                  |
| New tray set             | Pieces slide/bounce in one after another.                                                                                    |
| Game over                | Remaining blocks gray out row by row, then the game-over popup appears.                                                      |

Performance rules: use object pooling for particles, avoid per-frame allocations, run animation from a single render loop and use GPU-accelerated rendering. Animations must be time-based, not frame-based, so they look the same on 60 Hz and 120 Hz screens.

## 7. Audio and haptics

- **Sound effects** (original, synthesized in code or created by us): pick up, place, invalid, line clear (pitch rises with combo), praise, new best, game over and button tap.
- **Background music:** a calm, original, loopable track.
- **Haptics (mobile):** light tap on place, medium on line clear, stronger on big combos and perfect clears.
- **Settings toggles:** Sound effects, Music and Vibration, each independent and saved on the device.

## 8. Screens

1. **Home:** Gridzy logo, best score with crown, a big "Play" button (or "Continue" if a game is saved) and a settings button. The animated background is visible behind it.
2. **Game:** HUD, board, tray and popups. The current game auto-saves after every move so closing the app never loses progress.
3. **Settings (modal):** Sound, Music, Vibration and Reduce motion toggles, "How to play" (replays the tutorial), "Restart game" with confirmation, version and a privacy note ("Gridzy collects no data").
4. **Game over (modal):** final score, best score (with a "New Best!" badge if beaten), "Play again" and "Home."
5. **Tutorial (first launch):** 2–3 guided steps on a pre-set board. An animated hand shows dragging a piece, filling a line to watch it clear, then a "You're ready!" message. It can be skipped and replayed from Settings.

## 9. Technical stack

All packages use the **latest stable version** at install time (as of 2026-10-09: TypeScript 7, Vite 8, Vitest 5, PixiJS 8, React 19, Capacitor 8). Node.js 22+ is required; the newest LTS is recommended.

| Area               | Choice                                         | Why                                                                |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------ |
| Language           | TypeScript (strict)                            | Type safety across all packages                                    |
| Monorepo           | npm workspaces                                 | Built into Node, so a beginner has nothing extra to install        |
| Game logic         | `packages/core`, pure TypeScript with no DOM   | Testable, reusable on every platform                               |
| Tests              | Vitest                                         | Fast, TypeScript-native                                            |
| Rendering          | PixiJS (WebGL/WebGPU)                          | GPU-accelerated 2D for smooth 60 fps, particles and filters        |
| UI screens         | React                                          | Menus, modals and settings as accessible HTML on top of the canvas |
| Build / dev server | Vite                                           | Fast dev server and optimized production build                     |
| Audio              | Web Audio API (small wrapper)                  | No dependency; can synthesize original sounds                      |
| Mobile             | Capacitor                                      | Wraps the same web game into real Android and iOS apps             |
| Mobile plugins     | `@capacitor/haptics`, `@capacitor/preferences` | Vibration and reliable on-device storage                           |
| Lint / format      | ESLint + Prettier                              | Consistent, high-quality code                                      |

### 9.1 Repository layout

```
gridzy/
├─ packages/
│  └─ core/            # rules, pieces, scoring, generator, game state (+ tests)
├─ apps/
│  ├─ web/             # Vite + React + PixiJS game
│  └─ mobile/          # Capacitor project (android/, ios/) — Phase 3
├─ CLAUDE.md
├─ prd.md
└─ package.json        # npm workspaces root
```

### 9.2 Architecture

- **`core`** exposes a pure state machine: `newGame(seed)`, `canPlace(board, piece, pos)`, `place(state, pieceIndex, pos) → { state, events }` (events such as `placed`, `linesCleared`, `combo`, `perfectClear`, `newBest`, `gameOver`) and `hasAnyMove(state)`. It does no rendering and no I/O.
- **`web`** turns `core` events into animations, sounds and haptics. Rendering never changes game state directly.
- **Platform services** (storage, haptics, audio) sit behind small interfaces, with a browser implementation in Phase 1 and a Capacitor implementation in Phase 3.
- **Saved data** is versioned JSON validated on load. Corrupted or old data is safely reset instead of crashing.

### 9.3 Quality and security

- Unit tests for all `core` rules: placement, line clears, scoring, combos, the generator and game over. Coverage target: 90%+ for `core`.
- Strict TypeScript, no `any`, with lint and type checks before every commit.
- No runtime network calls. Strict CSP on the web build. Dependencies are kept minimal and checked with `npm audit`.

## 10. Phases

### Phase 1: Playable web game

- Monorepo setup (npm workspaces, TypeScript, ESLint, Prettier, Vitest).
- `packages/core` with the full rules, scoring, combos, fair generator and game over, all tested.
- `apps/web`: board, tray, drag and drop with ghost preview and line highlight, line clears, score and best score with crown, simple game-over popup, restart, and best score saved locally.
- Basic glossy block rendering and the gradient background.
- **Done when:** the game is fully playable in desktop and mobile browsers and all tests pass.

### Phase 2: Animations, audio and polish

- All animations from §6, including particles, sparkles, praise popups, combo badge and confetti.
- Sound effects, music and browser vibration where supported.
- Home screen, settings modal, the full game-over screen, the tutorial and the Gridzy logo.
- Save and resume, a Reduce motion option, and responsive and performance tuning (a steady 60 fps on mid-range phones).
- **Done when:** the game feels polished and every screen in §8 works.

### Phase 3: Mobile apps

- Capacitor project for Android and iOS that uses the web build.
- Native haptics and storage, app icon, splash screen, safe-area handling, portrait lock, and handling of the back button and app pause/resume.
- Android build in Android Studio (debug APK on a phone). iOS build in Xcode, which **requires a Mac**.
- Store-readiness checklist: privacy policy ("no data collected"), family/kids category requirements.
- **Done when:** the game runs as an installed app on an Android phone, and the iOS project builds on a Mac.

## 11. Success criteria

- Fully playable offline on web, Android and iOS.
- A steady 60 fps on a mid-range phone during line clears with particles.
- Zero network requests, zero personal data and zero ads or purchases.
- All `core` tests pass. No TypeScript or lint errors.
