# Playtest 07: Pressmen Union and Concord Marshals starter decks

**Purpose (designer).** Gangs will not fight each other early, and by the time they do the player will have upgraded a lot. This test only shows how each starter deck feels on power at the start, against the five generic test forces.

**Setup.** The same rules as playtests 05 and 06: lane HP 3/4/3, armor soak 3 per piece, +1 enemy damage against every force, 4-HP healing, squid tentacles spawn only in an empty lane (free attack once, body attack 2), armor refills between fights, downed units stand back up at 1 HP. 300 runs per row. The decks are read from `data/pressmen_starting_deck.csv` and `data/concord_starting_deck.csv` (30 cards each, no extra packs). Simulator: `tools/faction_sim.py` (reuses `tools/series_sim.py`), tables from `tools/faction_report.py`.

**Targets for comparison.** About 85 to 90% dungeon finish at 5 rooms and 60% at 10. The TSC with 2 packs gets 86% and 66%.

## Squads I assumed (placeholders, not yet in the design doc)

| Faction | Unit | HP | Armor soak | Gear holding the deck's cards |
| --- | --- | --- | --- | --- |
| Pressmen | Hammerhand | 8 | 3 | sledgehammer, gravity harness, Pressman skill, furnace plating |
| Pressmen | Ironback | 8 | 6 | mantlet, pit chains, Pressman skill, furnace plating |
| Pressmen | Rivet Gunner | 7 | 3 | rivet gun, Brawler skill, furnace plating |
| Pressmen | Furnace Medic | 7 | 3 | welding torch, furnace plating |
| Concord | Marshal | 6 | 3 | tag optics, Marshal skills, ceramic plate |
| Concord | Sentinel | 7 | 6 | glass shield, sonic stunner, ceramic plate |
| Concord | Warden | 6 | 3 | flechette carbine, cuff launcher, ceramic plate |

Totals: Pressmen 30 HP and 15 soak; Concord 19 HP and 12 soak (the TSC has 27 HP and 25 soak). Humanoids have no built-in soak. Lane order: Pressmen Hammerhand, Ironback, Rivet Gunner, with the Furnace Medic deployed afterwards next to a Pressman; Concord Warden, Sentinel, Marshal.

## Other modeling assumptions

- **Fight-back.** Melee attacks by the player make a surviving target fight back immediately with its most basic melee (1 damage, Scavver Chief and Furnace Hand 2), plus the +1 enemy damage. The sensitivity table below shows the same without the +1 on fight-backs. Player fight-backs against enemy melee stay at 1.
- **Wind-up 1.** A wound-up attack is released at the start of the same unit's next action, and the target is chosen then. Vent Steam skips the wind-up, and Slowed from Heavy Step adds a round to the next wind-up.
- **Solidarity.** Shoulder to Shoulder restores 1 soak at the start of each round (capped by maximum soak) and adds +1 melee damage when two Pressmen share a lane. Union Grudge adds +1 damage for all Pressmen after one is downed, and does not stack.
- **Warrant.** The Warranted unit is the leader (Scavver Chief, Slag Hauler, first Sump Sniper, Deserter Captain). It gives +1 damage against it. The squid has no Warranted unit. Subdue kills count as arrests (Authority +1 for the Warranted unit); killing the Warranted unit costs 1 Authority. The bot values arresting a little more than killing.
- **Basic attack.** Any unit may make a 1-damage attack for 1 fuel (a melee one for Pressmen). Slowed on enemies is not modeled.
- The greedy bot was tuned on the TSC deck. It is the same bot, but a few cards may be undervalued.

## Results

```
pressmen: single fights
force                win%  timeout%  actions  avgDowned  HPleft/30  arrests  authority
Scavver pack         100%       0%    14.6      0.10      26.2    0.00    +0.00
Slag hauler          100%       0%    13.8      0.44      23.2    0.00    +0.00
Sump sniper team     100%       0%    12.7      0.01      28.4    0.00    +0.00
Sump squid           100%       0%    22.8      0.03      25.7    0.00    +0.00
Deserter patrol      100%       0%    18.1      0.74      18.9    0.00    +0.00

pressmen: dungeon finish rates (all five forces mixed)
 5 fights: finish  89%  avg fights won  4.8  end HP 17.9/30   loss rate: Scavver pack 0%, Slag hauler 0%, Sump sniper team 0%, Sump squid 1%, Deserter patrol 10%
 8 fights: finish  80%  avg fights won  7.3  end HP 16.4/30   loss rate: Scavver pack 0%, Slag hauler 1%, Sump sniper team 0%, Sump squid 1%, Deserter patrol 11%
10 fights: finish  72%  avg fights won  8.7  end HP 15.7/30   loss rate: Scavver pack 0%, Slag hauler 1%, Sump sniper team 0%, Sump squid 1%, Deserter patrol 13%

pressmen: cards played per fight (all single fights)
  Hammer Blow        x4  played  2.91 per fight
  Sweeping Swing     x1  played  0.10 per fight
  Chain Lash         x2  played  1.36 per fight
  Vent Steam         x2  played  0.16 per fight
  Close Ranks        x2  played  0.22 per fight
  Shake It Off       x2  played  0.14 per fight
  Brace the Line     x2  played  0.98 per fight
  Take the Hit       x1  played  0.00 per fight
  Rivet Burst        x3  played  1.89 per fight
  Weld Seam          x1  played  0.52 per fight
  Cauterize          x1  played  0.41 per fight
  Furnace Apron      x2  played  0.62 per fight
  Ration Pack        x3  played  1.11 per fight
  Rivet Crate        x2  played  0.27 per fight
  Counterweight      x1  played  0.13 per fight
  Heavy Step         x1  played  0.01 per fight

concord: single fights
force                win%  timeout%  actions  avgDowned  HPleft/19  arrests  authority
Scavver pack         100%       0%    16.5      0.19      13.3    1.58    +0.33
Slag hauler           98%       0%    17.8      0.78      10.3    0.95    +0.27
Sump sniper team     100%       0%    15.2      0.00      17.7    1.42    -1.00
Sump squid             7%       1%    50.2      1.84       4.1    0.00    +0.00
Deserter patrol       83%       0%    20.6      1.37       5.4    0.84    -1.00

concord: dungeon finish rates (all five forces mixed)
 5 fights: finish   5%  avg fights won  1.7  end HP  3.7/19   loss rate: Scavver pack 9%, Slag hauler 23%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%
 8 fights: finish   1%  avg fights won  1.7  end HP  3.4/19   loss rate: Scavver pack 9%, Slag hauler 25%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%
10 fights: finish   1%  avg fights won  1.7  end HP  3.4/19   loss rate: Scavver pack 9%, Slag hauler 25%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%

concord: cards played per fight (all single fights)
  Flechette Volley   x4  played  4.06 per fight
  Pinning Shot       x1  played  0.68 per fight
  Cuff Shot          x4  played  3.96 per fight
  Stun Pulse         x2  played  0.59 per fight
  Tag Target         x3  played  1.40 per fight
  Revise Warrant     x1  played  0.00 per fight
  Close In           x2  played  0.00 per fight
  Halt               x2  played  1.17 per fight
  Shield Wall        x3  played  2.23 per fight
  Interpose          x1  played  0.00 per fight
  Plate Check        x2  played  1.79 per fight
  Field Dressing     x2  played  1.64 per fight
  Ammo Mag           x2  played  0.64 per fight
  Spare Cuffs        x1  played  0.35 per fight
```

## Sensitivity: enemy fight-back without the +1 enemy damage

```
pressmen: single fights
force                win%  timeout%  actions  avgDowned  HPleft/30  arrests  authority
Scavver pack         100%       0%    14.5      0.10      27.0    0.00    +0.00
Slag hauler          100%       0%    13.8      0.36      23.8    0.00    +0.00
Sump sniper team     100%       0%    12.6      0.01      28.6    0.00    +0.00
Sump squid           100%       0%    22.8      0.03      25.7    0.00    +0.00
Deserter patrol      100%       0%    18.5      0.54      20.9    0.00    +0.00

pressmen: dungeon finish rates (all five forces mixed)
 5 fights: finish  97%  avg fights won  4.9  end HP 19.6/30   loss rate: Scavver pack 0%, Slag hauler 0%, Sump sniper team 0%, Sump squid 0%, Deserter patrol 3%
 8 fights: finish  92%  avg fights won  7.8  end HP 18.1/30   loss rate: Scavver pack 0%, Slag hauler 0%, Sump sniper team 0%, Sump squid 0%, Deserter patrol 4%
10 fights: finish  87%  avg fights won  9.6  end HP 17.8/30   loss rate: Scavver pack 0%, Slag hauler 0%, Sump sniper team 0%, Sump squid 0%, Deserter patrol 6%

concord: single fights
force                win%  timeout%  actions  avgDowned  HPleft/19  arrests  authority
Scavver pack         100%       0%    16.5      0.19      13.3    1.58    +0.33
Slag hauler           98%       0%    17.8      0.78      10.3    0.95    +0.27
Sump sniper team     100%       0%    15.2      0.00      17.7    1.42    -1.00
Sump squid             7%       1%    50.2      1.84       4.1    0.00    +0.00
Deserter patrol       83%       0%    20.6      1.37       5.4    0.84    -1.00

concord: dungeon finish rates (all five forces mixed)
 5 fights: finish   5%  avg fights won  1.7  end HP  3.7/19   loss rate: Scavver pack 9%, Slag hauler 23%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%
 8 fights: finish   1%  avg fights won  1.7  end HP  3.4/19   loss rate: Scavver pack 9%, Slag hauler 25%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%
10 fights: finish   1%  avg fights won  1.7  end HP  3.4/19   loss rate: Scavver pack 9%, Slag hauler 25%, Sump sniper team 2%, Sump squid 94%, Deserter patrol 51%
```

## Findings

1. **Pressmen land close to the target.** They win every single fight, and finish 89% of 5-room dungeons and 72% of 10-room dungeons, slightly easy at 10 rooms. The Deserter patrol is the only force that beats them (10 to 13% of its fights). The squid is easy (100%, about 23 actions) because a 4-damage Hammer Blow with Solidarity and Grudge bonuses clears tentacles fast.
2. **The fight-back rule moves Pressmen a lot.** If enemy fight-backs do not get the +1 enemy damage, Pressmen finish 97% at 5 rooms and 87% at 10, which is too easy.
3. **Concord is far too weak at the start.** It finishes 5% of 5-room dungeons. It wins 100% of Scavver and Sump sniper fights but only 98% of Slag hauler fights (losing 25% in dungeons), 83% of Deserter patrol fights (losing 51% in dungeons) and 7% of squid fights.
4. **Why Concord is weak.** It has 3 units, 19 HP and 12 soak. All its damage cards sit on one unit, the Warden, and a unit can only hit its own lane until that lane is captured. Its damage is thin by design (2 per shot), so the squid body (12 HP) takes about 50 actions.
5. **Dead cards.** Close In, Interpose and Revise Warrant were never played (0.00 per fight). Close In and Interpose need two units in the same lane, and Concord deploys one per lane. Revise Warrant only matters after the Warranted unit has died. Pressmen's Take the Hit (0.00) and Heavy Step (0.01) are also barely used, and Vent Steam, Sweeping Swing and Shake It Off are rare, which may partly be bot weakness.
6. **Authority.** Concord gains about +0.3 Authority per fight against Scavvers and Slag haulers, but loses 1 every Sump sniper team and Deserter patrol fight, because the Warranted unit is killed instead of arrested.

## Open questions for the designer

- How strong should Concord be at the start? The levers are HP and soak, a fourth unit, damage per card, and putting damage on more than one unit.
- Should Close In and Interpose work with one unit per lane (for example across lanes), or should Concord be allowed to double up?
- Do enemy fight-backs get the +1 enemy damage?
- Does Warrant Mark apply to monsters, and if so to what?
- Are Pressmen's squad (HP 7 to 8) and soak assumptions right, and should Pressmen be slightly tougher on the 10-room target?
