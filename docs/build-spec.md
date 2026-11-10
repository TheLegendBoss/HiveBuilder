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
| M3 | Expedition (built, with stub rooms) | Generate a floor section by section; room screens (Fight, Scavenge, Gamble, Hazard, Market, Rest, Clinic, Gate); supplies clock; retreat |
| M4 | Hub and economy (built) | Packs, selling, promotion, repairs, Start Expedition; Eagles and power counters |
| M5 | Sandbox setup and saves (built) | Sandbox Setup screen, depth dial, autosave, manual slots, quickstart preset |
| M6 | Aftermath and pressure (built for TSC; humanoid side dormant) | Injuries, afflictions, stress breaks, virtues, loot rewards |
| M7 | Control rooms and bosses (built) | Five section functions and the drafted boss table |

Work one milestone at a time. Each ends with a commit and a short note of what to try.

## M1 and M2 as built

- `src/sim/` (no phaser): seeded RNG, 52-card results deck, hand, draw and reshuffle, fuel burning, three-lane duel, TSC starter deck effects, Scavver pack AI, win and loss. `listActions` says what the player can do right now, `perform` does it, `enemyPlan` and `enemyAct` run the other side. Events come back as a list and the view catches up from them.
- `src/data/`: the starter deck loads from `data/tsc_starting_deck.csv`; the squad, the Scavver pack and the Service corridor are in `scenarios.ts`; basic gear actions in `gearActions.ts`.
- `src/core/selection.ts`: the pick-an-item, actor, target, variant flow shared by mouse and keyboard.
- Parity with the paper sim: over 2000 seeds the stand-in player wins every fight in about 10.1 actions after setup (paper sim: 10.0), with almost nobody downed. `src/sim/*.test.ts` cover each card rule.
- Where the sim chose a rule the paper sim or the design left open, it is listed under "Sandbox build notes" in `decisions.md`.

## M3 as built

- `src/sim/expedition.ts` (no phaser): the seeded section generator and the expedition state. A section starts at an entrance Gate and draws rooms from a freshly shuffled copy of the 21-card room deck. When the squad first enters a room it draws an exit card off the results deck (A to 5 gives 1 door, 6 to 9 gives 2, 10 to K gives 3, counting the door you came in by); each new door spawns the next room card on the grid, or may join an existing room (50%). You see the type of every room next to a room you have entered. The generator never seals a section without a way onward. Moving costs 1 ration, fights cost none, a loss ends the run, and `retreat` is free at the section entrance and marks ground lost anywhere else.
- `src/data/forces.ts`: Straggler band, Toll gang and Rat swarm from `data/tier1_patrols_new.csv`, with tier scaling. New enemy action kinds in the sim: attack with Suppressed, rally with a per-lane cap (Breed), soak buff to self or a lane friend (Dig In, Take Cover, Hold the Line). Pipe gang (needs Burning) and Ash cult (needs stress) are not in yet.
- `src/data/rooms.ts`: the room deck from `data/starter_room_deck.csv`, the working expedition numbers, and `startFight` / `settleFight`, which carry the squad's HP into a fight and back.
- `src/scenes/ExpeditionMap.ts`: the map (fog, current room, doors you can take with 1 to 3 or the arrows), the squad and ration panel, the retreat and gate modals and the end summary. Combat now takes its fight from the expedition when one is running; Quick fight on the setup screen still plays the old single Scavver fight.
- Rooms: Clinic heals. Scavenge draws 1 loot card. Gamble runs the push-your-luck ladder. Market sells spares and buys packs. Hazard and Rest are still walk-through stubs (Hazard needs unit attributes, Rest needs exhausted cards).
- Loot and Eagles: `src/data/loot.ts` loads the 30-item pool from `data/loot_pool_base_items.csv` into a shuffled loot deck drawn without replacement. Winning a fight pays its Eagles into a purse and offers its loot draws. The pack holds 8; take offers, drop to make room, click a pack item to use it (Hive rations, Healing supplies and Combat stim work on the map). Gear is equipped at the HQ (see the gear equipping note below).
- Gamble: `src/data/gambles.ts` holds four of the six drafted cards (Back-alley dice, Scavver's wager, Pit side bet, Quartermaster's crate) with ladders from `data/hazard_gamble_tiers.csv`. Commit pays the stake; each push draws the top results card (10 to K climbs, 6 to 9 holds, A to 5 busts); cash out any time; the third rung pays by itself.
- Market: a Basic pack (5 loot draws) costs 10 Eagles; a spare item sells for 1.
- Tests: `expedition.test.ts` (1500 seeds all build a connected grid with a gate; loot, pack, gamble and market rules) and `forces.test.ts`.

## M4 as built

- `src/sim/campaign.ts` (no phaser): the state that outlives an expedition. Eagles (the bank), power (counted, nothing to spend it on yet), a stash of loot items (24), the crew (tier, XP, damage, bench), `fallen` names, and the aftermath deck. `src/data/campaign.ts` holds the TSC config and parses `data/aftermath_deck_droid.csv`. The campaign lives in `session.campaign` in memory; saves are M5.
- `src/scenes/Hub.ts`: the HQ. Crew rows with one contextual button each (Repair when damaged, otherwise Promote; keys 1 to 5), the market (Buy pack, B; Sell mode, S), the stash grid (click or arrows and Space to put an item in the pack, or sell it in sell mode), the pack, the purse stepper (- and +), Auto pack (A), Clear (C), Start expedition (Enter), and a debrief modal when a run comes home. Counters: Eagles, power, crew fit, runs.
- **Going out:** `launch` takes the purse (Eagles) and the chosen stash items off the books and sends the crew who are fit. Damaged or benched crew stay home, so the squad can be 1 to 5 droids; combat and the map already handle any size.
- **Coming home:** `returnHome` banks the purse and pack (lost on a wipe), adds power (1 per section cleared), shares XP, draws aftermath for crew who ended a fight downed, finishes major repairs that were on the bench, and returns a debrief. Abandoning a run from the pause menu loses the purse and pack and nothing else.
- **XP:** a won fight pays every squad member its tier in XP (patrol threat 1 times the fight tier); a finished floor pays 5; the Pit side bet pays its XP to the lowest tier member.
- **Promotion:** costs XP and the same number of Eagles (20, 40, 80, 160 for tiers 2 to 5). Each tier adds 1 max HP and a perk slot (counted, unused).
- **Aftermath:** each time a crew member ends a fight downed, they draw once from the 35-card droid deck at home. Short-term results are free reboots (Firmware Patch gives 3 XP); lasting results need a repair; Core Breach counts as major; Head Destroyed removes the droid for good. The combat effects of the results (Suppressed or Stunned at the start of the next fight) are not wired.
- **Repairs:** a minor repair costs 1 Eagle and is instant; a major repair costs 3, and the droid sits out the next expedition. Unrepaired damage also sits out.
- Tests: `campaign.test.ts` (23 cases: market, stash cap, launch and return, wipe, abandon, promotion, aftermath, repairs).

## M5 as built

- **Dials:** `src/data/sandbox.ts` holds `SandboxSetup` (faction, start tier 1 to 8, ramp 1 to 4 sections per step, sections 1 to 14, start Eagles 0 to 200 by 10, start items 0 to 12) with `clampSetup` and `stepDial`. The sim reads them through `ExpeditionConfig.startTier/ramp` and `tierAt(cfg, section)`.
- **Saves:** `src/core/saves.ts` (no phaser): plain JSON in localStorage, keys `hivedeck.save.auto|1|2|3` and `hivedeck.quickstart`, `SAVE_VERSION` 1. Unreadable or hostile data reads as an empty slot. The campaign config is reattached from code on load; the expedition is saved whole.
- **Screens:** Sandbox Setup now has steppers (mouse, or Up/Down to pick a dial and Left/Right or +/- to turn it), Save preset (P), Load preset (L), Quickstart (Q, loads the preset and goes straight to the HQ), Quick fight (F), Enter HQ (starts a new campaign; asks first if one is in memory). New Saves screen (autosave plus 3 slots: Load, Save, Delete). Main menu Continue loads the autosave; Load Game opens Saves. The HQ and the expedition map each have a Saves button (V).
- **Autosave:** written whenever the HQ or the map redraws, so after every move, room and purchase. A fight in progress is not saved; reloading mid-contact shows the Contact prompt again and the fight restarts with the crew's HP as it stood.
- Tests: `src/core/saves.test.ts`.

## M6 as built

- **What is live for the TSC crew.** Aftermath results that ride into the next fight: Glitching starts it Suppressed for 2 rounds, Rebooting starts it Stunned. They are set on the crew member when the run comes home, shown on the HQ crew row, passed to the next expedition as `startFx` and used up by its first fight. (Lasting droid damage never reaches a fight, because damaged droids sit out until repaired.)
- **Burning.** New status on a unit: a number of rounds, and at the end of each round the unit takes 1 damage through its soak (working rule; the design's burn clog cards are not built, so Burning ticks instead). Shown as `BURN n` on the unit card.
- **Pipe gang** is in the Fight room pool (from the CSV: Torch sets a unit alight, Flare is a wind-up). **Ash cult** is still out: its Dread Chant adds stress and droids have no stress track.
- **New enemy action rules** (all data on `EnemyActionDef`): `burn`, `stun`, `area` (every unit in the most crowded squad lane), `anyLane` (healthiest live unit, preferring one not already stunned), `windup` (the unit spends one action charging, a stun cancels it) and `count` (rally two at once). A stun on a squad member outlasts the round it lands in, then clears. Scenarios can also set `startLanes`, `surviveRounds`, `bossTag` and `linked` (a leader's death kills its followers).
- **Humanoid aftermath engine (dormant).** `src/sim/afflictions.ts` and `src/data/afflictions.ts` hold the double-faced deck (35 cards, faces dealt by severity), stress-break resolution (flee draw, virtue offer on a jack, queen or king of a Steeled face, Walks into the Dark kills) and the cure rules, with tests. Nothing in a TSC campaign calls it, and there is no stress track in combat yet: that waits for a humanoid crew (Pressmen or Concord).
- **Loot rewards.** Control rooms pay a first-capture reward through the loot offer (see M7).

## M7 as built

- **Section functions.** The five functions (Power, Industrial, Supply, Secure, Medical) cycle by section from a seed-chosen start (`sectionFn`). The map header names the section's function.
- **Control rooms.** Each section holds one extra `Control` room card, shuffled into the next 3 to 8 draws, so exploring finds it. A function that is already held (won and brought home) has no control room. Data: `src/data/control.ts`.
  - Power: Generator core, Runaway Dynamo. The squad wins by holding 6 rounds after setup or by killing it.
  - Industrial: Foundry office, Foundry Foreman and two Pipe Hands.
  - Secure: Cell block, the Warden (Shock Baton stuns in his lane, Lockdown stuns anyone after a wind-up) and two Cell Guards.
  - Medical: Clinic ward, Brood Queen (Brood adds 2 Rats up to 6 a lane); killing her kills every Rat.
  - Supply: Storehouse, a locked door. The first guarded room or scavenge in a Supply section adds a Storehouse key to its loot offer (working rule; the Market route is not built). Using the key takes the section.
- **Boss numbers** are the tier 1 table from the design: +2 HP and +1 damage per two tier steps. The stand-in player wins all four at tier 1 and almost none at tier 7 with an unpromoted squad, so the numbers want DJ's pass.
- **First capture** adds to the fight's own loot: Power a loot draw, Industrial a weapon or armor draw, Supply a supplies draw, Secure two plain draws (the recruit is not built), Medical a medical gear draw.
- **Footholds.** A control room only counts if the squad gets home (a wipe loses it). At home it appears on the Footholds screen (Holds button or H on the HQ): claim it with power, at one power per three rooms in the section (at least 2, working). A claimed foothold pays power every expedition, scaled by the section's tier: 1, 1, 2, 2, 3, 3, 4, 4.
- Tests: `bosses.test.ts`, the control room block in `expedition.test.ts`, footholds and fight-start effects in `campaign.test.ts`, `afflictions.test.ts`.

## M0 scope in detail

Project: `package.json`, `vite.config.ts`, `tsconfig.json` (strict), `index.html` with a `#game` parent, Vitest.

Scenes: `Boot` (loads fonts, then goes to MainMenu), `MainMenu`, `SandboxSetup` (placeholder: faction choice, depth dial fields shown but not yet wired; Back), `Settings`. Quit confirmation is a modal.

UI kit in `src/ui/`: `Button`, `Panel` (with corner bolts and a hazard strip), `Lamp`, `Cable`, `Stamp`, `Modal`, `Toggle`, `Slider`, icon helpers (skull outline). Layout helper that converts the 1920 by 1080 reference to the current screen size and applies text scale.

Data: `src/data/palette.ts` (tokens and faction accents, `signal` from the chosen faction), `src/data/settings.ts` (defaults), `src/data/menu.ts` (menu items, states, key bindings).

Settings: volume, fullscreen, text size (100, 125, 150), colorblind mode and animation speed shown but disabled until used. Stored in localStorage under one key with a version number; unreadable storage falls back to defaults.

Menu content: title lockup, hive cutaway with the Middle Hive floor lit, a cable from Sandbox Mode to that floor, the bolted console with OFFLINE stamps, Expeditions Lost counter (reads 0000) with skull outlines, memorial plaque ("No names yet"), vox line at the bottom of the console.

### Gear equipping (post-M7, working)

- `src/data/gear.ts` reads the loot pool text into `GearInfo` (slot, hands, Max soak, Ammo, actions, unsupported lines) and holds the TSC starter kit as items (ids 101 to 105). `src/core/loadout.ts` lists a unit's gear with its actions and cards for the combat views and writes the rules text.
- `src/sim/campaign.ts`: `CrewMember.equipped`, `equip`, `unequip`, `equipProblem`, `handsUsed`, `weaponSlots`; `templateOf` builds gear, armor and ammo from the slots. Old saves get their starter kit on load.
- `src/sim/cards.ts` `gearTargets` and `applyGearAction` run loot actions; `src/data/scenarios.ts` `deckFor(squad)` builds the fight deck from the squad's slotted gear.
- `src/scenes/Loadout.ts` is the Gear screen: crew list, the selected member's slots, the stash with click-to-equip, and a detail box. Reached from the HQ (L), back with Esc.
- Rules and what is not run yet are in `decisions.md`.

## Checks for every milestone

1. `npm run typecheck`, `npm test` and `npm run build` pass.
2. No phaser import under `src/sim/`; no hex value outside `src/data/palette.ts`.
3. Opened in a browser at 1920 by 1080 and 1280 by 720, and at 150% text size, and looked at.
4. Mouse and keyboard both reach every action.

## Open items that do not block M0 to M2

Faction accent hexes (placeholders now), the bundled font licences check, cell capacity for prisoners, non-sandbox checklist items in `decisions.md`, DJ's edits to the boss table, and the final name of the game.
