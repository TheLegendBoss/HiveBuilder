# Sandbox build spec (one page)

Rules live in `docs/design.md`; look and feel lives in `docs/ui-guide.md`. This page says what to build, in what order, and how to know each step is done. Anything marked (working) is a placeholder.

## Goal

A desktop game in Phaser 4 (TypeScript, Vite) that opens on a main menu and lets DJ test the expedition loop in Sandbox Mode: one floor, unlimited sections, difficulty set by a depth dial. All three starter factions (TSC, Pressmen, Concord) are playable. Art is vector only; no image files.

## Fixed decisions

- Engine: Phaser 4.2, desktop first. Reference size 1920 by 1080, minimum 1280 by 720, Scale.RESIZE.
- Code rules: the sim (`src/sim/`) has no phaser imports and is unit tested; content is data in `src/data/`; colors only in `src/data/palette.ts`; one scene per screen; the sim never waits for animations.
- Main menu: Continue, New Game, Load Game (all three OFFLINE, "coming soon"), Sandbox Mode (live), Settings, Exit.
- Saves: one autosave plus several manual slots, and a saved quickstart preset (faction, start tier, ramp, starting Eagles and gear) loadable in one click.
- Sandbox: starts at tier 1 on a middle-hive themed floor; ramp is 2 sections per tier step, reaching tier 8 after 14 sections; tier 8 uses the endless rules. First build has the expedition loop plus home basics (packs, selling, promotion, repairs), no buildings.

## Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Scaffold and main menu (this build) | `npm run dev` opens the v5 main menu at 1920 by 1080 and 1280 by 720; number keys and mouse work; Sandbox Mode opens a placeholder setup screen; Settings saves volume, fullscreen and text size; Exit asks to confirm; typecheck, tests and build pass |
| M1 | Data and sim core (built) | CSV decks in `data/` load into typed data; results deck, hand, fuel and a 3-lane duel resolve in a headless test with fixed seeds; matches the paper-fight sims within tolerance |
| M2 | Combat screen (built) | The v5 combat layout plays one fight against a Tier 1 force with mouse and keyboard, cables, intent badges, blood bars, vox log |
| M3 | Expedition | Generate a floor section by section; room screens (Fight, Scavenge, Gamble, Hazard, Market, Rest, Clinic, Gate); supplies clock; retreat |
| M4 | Hub and economy | Packs, selling, promotion, repairs, Start Expedition; Eagles and power counters |
| M5 | Sandbox setup and saves | Sandbox Setup screen, depth dial, autosave, manual slots, quickstart preset |
| M6 | Aftermath and pressure | Injuries, afflictions, stress breaks, virtues, loot rewards |
| M7 | Control rooms and bosses | Five section functions and the drafted boss table |

Work one milestone at a time. Each ends with a commit and a short note of what to try.

## M1 and M2 as built

- `src/sim/` (no phaser): seeded RNG, 52-card results deck, hand, draw and reshuffle, fuel burning, three-lane duel, TSC starter deck effects, Scavver pack AI, win and loss. `listActions` says what the player can do right now, `perform` does it, `enemyPlan` and `enemyAct` run the other side. Events come back as a list and the view catches up from them.
- `src/data/`: the starter deck loads from `data/tsc_starting_deck.csv`; the squad, the Scavver pack and the Service corridor are in `scenarios.ts`; basic gear actions in `gearActions.ts`.
- `src/core/selection.ts`: the pick-an-item, actor, target, variant flow shared by mouse and keyboard.
- Parity with the paper sim: over 2000 seeds the stand-in player wins every fight in about 10.1 actions after setup (paper sim: 10.0), with almost nobody downed. `src/sim/*.test.ts` cover each card rule.
- Where the sim chose a rule the paper sim or the design left open, it is listed under "Sandbox build notes" in `decisions.md`.

## M0 scope in detail

Project: `package.json`, `vite.config.ts`, `tsconfig.json` (strict), `index.html` with a `#game` parent, Vitest.

Scenes: `Boot` (loads fonts, then goes to MainMenu), `MainMenu`, `SandboxSetup` (placeholder: faction choice, depth dial fields shown but not yet wired; Back), `Settings`. Quit confirmation is a modal.

UI kit in `src/ui/`: `Button`, `Panel` (with corner bolts and a hazard strip), `Lamp`, `Cable`, `Stamp`, `Modal`, `Toggle`, `Slider`, icon helpers (skull outline). Layout helper that converts the 1920 by 1080 reference to the current screen size and applies text scale.

Data: `src/data/palette.ts` (tokens and faction accents, `signal` from the chosen faction), `src/data/settings.ts` (defaults), `src/data/menu.ts` (menu items, states, key bindings).

Settings: volume, fullscreen, text size (100, 125, 150), colorblind mode and animation speed shown but disabled until used. Stored in localStorage under one key with a version number; unreadable storage falls back to defaults.

Menu content: title lockup, hive cutaway with the Middle Hive floor lit, a cable from Sandbox Mode to that floor, the bolted console with OFFLINE stamps, Expeditions Lost counter (reads 0000) with skull outlines, memorial plaque ("No names yet"), vox line at the bottom of the console.

## Checks for every milestone

1. `npm run typecheck`, `npm test` and `npm run build` pass.
2. No phaser import under `src/sim/`; no hex value outside `src/data/palette.ts`.
3. Opened in a browser at 1920 by 1080 and 1280 by 720, and at 150% text size, and looked at.
4. Mouse and keyboard both reach every action.

## Open items that do not block M0 to M2

Faction accent hexes (placeholders now), the bundled font licences check, cell capacity for prisoners, non-sandbox checklist items in `decisions.md`, DJ's edits to the boss table, and the final name of the game.
