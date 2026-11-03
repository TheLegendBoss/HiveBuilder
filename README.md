# HiveBuilder (working title: Hive Deck)

A grim-dark deckbuilding campaign game. You lead a gang through a procedurally generated hive city and claim it district by district. Your crew, gear, perks and skills all feed one shared squad deck, and every card can be played for its effect or burned as fuel.

**Status:** design phase. Everything is placeholder numbers and placeholder names.

## Repo layout

| Path | What it is |
| --- | --- |
| `docs/design.md` | The full design document, exported from the living doc. Source of truth for rules. |
| `decisions.md` | Short list of locked rules, plus the open-questions checklist. |
| `data/tsc_starting_deck.csv` | The Tenebrae Security Combine (TSC) starter deck: 20 designs, 32 cards. |
| `data/pressmen_starting_deck.csv` | The Pressmen Union starter deck: 16 designs, 30 cards. |
| `data/concord_starting_deck.csv` | The Concord Marshals starter deck: 14 designs, 30 cards. |
| `playtests/` | Paper-fight reports: `01-tsc-vs-scavver-pack.md` (one fight) and `02-tsc-series.md` (5, 10 and 15 fights in a row) and `03-dungeon-healing-and-squid.md` (5 to 10 fight dungeons with healing supplies) and `04-soak-healing-and-squid-spawn.md` (3/4 soak, 4-HP healing, tentacle spawning) and `05-chassis-soak-and-revised-squid.md` (chassis soak 1/2 plus armor 2, capped tentacles with a free attack). |
| `tools/paper_fight_sim.py` | First simulator: TSC starter deck vs the Scavver pack. Run `python3 tools/paper_fight_sim.py log 1` or `stats 3000`. |
| `tools/series_sim.py` | Multi-fight simulator with all five test enemy forces. Run `python3 tools/series_sim.py single`, `series` or `log "Sump squid" 3`. Helper scripts `series_extras.py`, `series_grid.py`, `dungeon_grid.py`, `dungeon_grid2.py`, `dungeon_grid3.py`, `squid_variants.py`, `soak_rounding.py` and `soak_squid_split.py` build the extra tables. |

## The short version

- **Combat:** a Caravan-style duel across 3 lanes. Overwhelm 2 of 3 lanes to win.
- **Cards:** one shared squad hand (baseline 7). Every card is an effect and fuel.
- **No player dice:** randomness comes from a 52-card results deck.
- **Campaign:** a generated hive of floors built from room, encounter, denizen and loot decks. Supplies are the expedition clock; power is gang influence.
- **Factions:** the TSC (droids) is the intro faction. The Pressmen Union (heavy brute gang) and the Concord Marshals (elite law squad) are the second and third starters.

## Workflow

The living design doc is edited in Claude. After a design session, re-export it to `docs/design.md` and update `decisions.md` and any `data/` files that changed.
