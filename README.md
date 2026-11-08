# HiveBuilder (working title: Hive Deck)

A grim-dark deckbuilding campaign game. You lead a gang through a procedurally generated hive city and claim it district by district. Your crew, gear, perks and skills all feed one shared squad deck, and every card can be played for its effect or burned as fuel.

**Status:** design phase, with the first build started. Milestones M0 (Phaser 4 scaffold and main menu), M1 (data-driven sim core), M2 (playable combat screen) M3 (the expedition: generated floors, room screens, rations, retreat) and M4 (the HQ: crew, promotion, repairs, market, loadout, and the loop home) are in `src/`. Everything is placeholder numbers and placeholder names.

## Repo layout

| Path | What it is |
| --- | --- |
| `docs/design.md` | The full design document, exported from the living doc. Source of truth for rules. |
| `docs/ui-guide.md` | UI and visual design rules (palette, type, cards, screens, components, motion). Also proposed as the hive-deck-ui skill. |
| `docs/build-spec.md` | One-page sandbox build spec: scope, milestones M0 to M7, and the checks each one must pass. |
| `src/` | The game (TypeScript, Phaser 4, Vite). `src/sim/` will hold the rules with no phaser imports, `src/data/` the content and the palette, `src/ui/` the UI kit, `src/scenes/` one scene per screen. |
| `decisions.md` | Short list of locked rules, plus the open-questions checklist. |
| `data/tsc_starting_deck.csv` | The Tenebrae Security Combine (TSC) starter deck: 20 designs, 32 cards. |
| `data/pressmen_starting_deck.csv` | The Pressmen Union starter deck: 16 designs, 29 cards. |
| `data/concord_starting_deck.csv` | The Concord Marshals starter deck: 14 designs, 30 cards. |
| `data/aftermath_deck_humanoid.csv` | The humanoid aftermath deck: 14 results, 35 cards, with the matching affliction face group for each. |
| `data/aftermath_deck_droid.csv` | The droid aftermath deck: 14 results, 35 cards. |
| `data/afflictions.csv` | Working draft of the affliction faces on the humanoid aftermath cards: 8 short-term, 13 lasting, 1 severe, plus the death face. |
| `data/virtues.csv` | Working draft of the 8 virtues. |
| `data/tier1_patrols_new.csv` | The five new patrol forces for the tier 1 sandbox table (pipe gang, toll gang, rat swarm, ash cult cell, straggler band). |
| `data/rarity_template_weapon.csv` | The working weapon rarity template, white to orange (placeholder numbers). |
| `data/loot_pool_base_items.csv` | The 30 base items in the sandbox loot pool, with their white versions. |
| `data/hazard_gamble_tiers.csv` | The working Hazard thresholds and Gamble stake and rung values by tier. |
| `data/starter_room_deck.csv` | The starter room deck: 8 room types, 21 cards. |
| `playtests/` | Paper-fight reports: `01-tsc-vs-scavver-pack.md` (one fight) and `02-tsc-series.md` (5, 10 and 15 fights in a row) and `03-dungeon-healing-and-squid.md` (5 to 10 fight dungeons with healing supplies) and `04-soak-healing-and-squid-spawn.md` (3/4 soak, 4-HP healing, tentacle spawning) and `05-chassis-soak-and-revised-squid.md` (chassis soak 1/2 plus armor 2, capped tentacles with a free attack) and `06-difficulty-levers.md` (hitting the 85-90% / 60% finish targets, armor soak 3 per piece) and `07-pressmen-and-concord.md` (Pressmen and Concord starter decks against the test forces) and `08-concord-concussive-and-armor.md` (Concord with a fourth unit, concussive guns and stun counters, Pressmen at 40 HP, plus a Pressmen correction) and `09-pressmen-healing-and-solidarity.md` (healing passive proxies and the value of Solidarity). |
| `tools/paper_fight_sim.py` | First simulator: TSC starter deck vs the Scavver pack. Run `python3 tools/paper_fight_sim.py log 1` or `stats 3000`. |
| `tools/faction_sim.py` | Pressmen and Concord simulator built on `series_sim.py` (options include Concord v2, stun counters, modal Volley and Cuff Shot splash). Run `python3 tools/faction_sim.py log pressmen "Scavver pack" 3` or `python3 tools/faction_report.py` or `faction_report2.py`. |
| `tools/series_sim.py` | Multi-fight simulator with all five test enemy forces. Run `python3 tools/series_sim.py single`, `series` or `log "Sump squid" 3`. Helper scripts `series_extras.py`, `series_grid.py`, `dungeon_grid.py`, `dungeon_grid2.py`, `dungeon_grid3.py`, `lever_grid.py`, `lever_grid2.py`, `squid_variants.py`, `soak_rounding.py` and `soak_squid_split.py` build the extra tables. |
| `tools/pack_odds.py` | Placeholder model for the pack ramp odds. Run `python3 tools/pack_odds.py`. |

## The short version

- **Combat:** a Caravan-style duel across 3 lanes. Overwhelm 2 of 3 lanes to win.
- **Cards:** one shared squad hand (baseline 7). Every card is an effect and fuel.
- **No player dice:** randomness comes from a 52-card results deck.
- **Campaign:** a generated hive of floors built from room, encounter, denizen and loot decks. Supplies are the expedition clock; power is gang influence.
- **Factions:** the TSC (droids) is the intro faction. The Pressmen Union (heavy brute gang) and the Concord Marshals (elite law squad) are the second and third starters.

## Running the game

```
npm install
npm run dev        # opens at http://127.0.0.1:5173
npm run typecheck
npm test
npm run build
```

The main menu opens first. Sandbox Mode leads to the setup screen where you pick a faction (it changes the accent color). **Enter HQ** (TSC only for now) opens the gang's headquarters: promote or repair crew, buy packs, sell spares, pick a purse and a pack, then **Start expedition** generates a three-section floor and puts the crew on its map. Finished runs return to the HQ with a debrief; **Quick fight** (F) plays a single fight against the Scavver pack. Keys: 1 to 6 on the menu, arrows and Enter, Esc to go back.

**On the map:** click a door (or press 1 to 3, or the arrows) to walk into a neighbouring room. Each move costs a ration; fights do not. Fight rooms start combat with the squad's current HP and pay Eagles and loot. Scavenge draws loot into an 8-slot pack (click a pack item to use or drop it), Gamble is a push-your-luck ladder, Market sells spares and buys packs, clinics heal, and gates lead on to the next section. Hazard and Rest are placeholders for now. R retreats (free from the section entrance), Esc leaves. `?seed=7` replays the same floor.

**In a fight:** the first three rounds you deploy a squad member into each lane (click a reserve chip or press R, then click a lane or press 1 to 3). After that, each action is one of: play a card (click it or press 1 to 7, then pick the unit and target; Tab cycles the choices, Enter confirms), use a gear action (G, or the buttons in the right panel), or Cycle (E: mark up to 2 cards, Enter) to discard and draw. Fuel is paid by burning cards from your hand; the suggested burn is shown on the cards, and B lets you choose. L opens the vox log, Esc cancels a pick or opens the pause menu. Dev aids: F8 lets the stand-in player take your action, and `?seed=7` on the address replays the same shuffle.

## Windows app

`npm run dist:win` builds a single portable Windows app, `release/HiveDeck-<version>-portable.exe` (Electron wrapper in `electron/main.cjs`; it works on Linux, macOS or Windows machines). Double-click to run, no install. F11 toggles fullscreen. The exe is not code signed, so Windows SmartScreen may warn on first run: choose More info, then Run anyway. `npm run electron` runs the same shell from source.

**Without building locally:** the GitHub Actions workflow `Windows build` builds the exe on a Windows runner. Run it from the repo's Actions tab (Run workflow) and download the exe from the run's Artifacts, or push a version tag (for example `git tag v0.0.2 && git push origin v0.0.2`) and it also publishes the exe on the Releases page.

## Workflow

The living design doc is edited in Claude. After a design session, re-export it to `docs/design.md` and update `decisions.md` and any `data/` files that changed.
