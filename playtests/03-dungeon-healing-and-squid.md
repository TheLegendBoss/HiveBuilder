# Playtest 03: dungeon runs with healing supplies and the reworked squid

**Rules set by the designer.** A dungeon has 5 to 10 fights. The squad heals at the end of the dungeon, and healing supplies are what keeps it going in between. The Sump squid has one large body HP pool and lane HP, and you must defeat a lane's HP before you can hit the body from that lane.

**Setup.** TSC crew of five and the 30-card starter deck against a random mix of the five test enemy forces, simulated with `tools/series_sim.py` and `tools/dungeon_grid.py`. All numbers are placeholders.

## What changed in the simulator

- **Squid.** The Sump squid now has lane HP like any enemy (3 / 4 / 3). Its tentacles are units that screen the lane. The order is units, then lane HP, then the body. The body has 12 HP (placeholder) and the squid is defeated only when the body reaches 0. The tentacle regrow rule is unchanged.
- **Healing supplies.** A new Repair Pack card heals 2 HP on one unit and is worth 2 fuel, the same as the Ration Pack and Field Dressing in the other starter decks. It is added to the 30-card deck in counts of 0, 2, 4 and 6. The TSC deck has no HP healing supply of its own, only the Patch skill.
- **Dungeon length.** 5, 8 and 10 fights, with no healing in between except cards, and a full heal after the last fight (so only the run itself is simulated).
- Other assumptions are as in playtest 02, with armor soak refilling between fights.

## Single fights (1000 each)

```
force                config   win%  actions  avgDowned  HPleft/27
Scavver pack         baseline 100%    13.0      0.01     26.5
Slag hauler          baseline 100%    13.3      0.26     23.7
Sump sniper team     baseline 100%    12.8      0.00     26.6
Sump squid           baseline 100%    22.8      0.00     27.0
Deserter patrol      baseline 100%    19.1      0.24     23.0
Scavver pack         harsh (h 100%    13.8      0.64     20.5
Slag hauler          harsh (h 100%    14.3      1.36     16.3
Sump sniper team     harsh (h 100%    13.1      0.20     23.7
Sump squid           harsh (h 100%    23.6      0.05     24.3
Deserter patrol      harsh (h  70%    23.6      2.69      8.7
```

## Dungeon runs (500 per row)

"finish%" is the share of dungeons where the squad wins every fight. "avgDone" is the average number of fights won. "endHP" is total squad HP after the last fight played (27 is full).

```
settings                   fights packs  finish%  avgDone  endHP/27
harsh (half soak, +1 dmg)       5     0      40%      3.4       6.1
harsh (half soak, +1 dmg)       5     2      48%      3.6       7.8
harsh (half soak, +1 dmg)       5     4      50%      3.7       9.0
harsh (half soak, +1 dmg)       5     6      53%      3.7      10.4
harsh (half soak, +1 dmg)       8     0      14%      4.0       4.3
harsh (half soak, +1 dmg)       8     2      23%      4.5       5.4
harsh (half soak, +1 dmg)       8     4      28%      4.7       6.8
harsh (half soak, +1 dmg)       8     6      30%      4.8       7.7
harsh (half soak, +1 dmg)      10     0       8%      4.2       4.0
harsh (half soak, +1 dmg)      10     2      14%      4.8       4.9
harsh (half soak, +1 dmg)      10     4      18%      5.1       6.2
harsh (half soak, +1 dmg)      10     6      20%      5.2       6.9
full soak, +1 dmg               5     0      88%      4.7      13.3
full soak, +1 dmg               5     2      90%      4.8      16.1
full soak, +1 dmg               5     4      90%      4.8      17.4
full soak, +1 dmg               5     6      92%      4.8      18.2
full soak, +1 dmg               8     0      76%      7.1      10.8
full soak, +1 dmg               8     2      82%      7.3      14.1
full soak, +1 dmg               8     4      84%      7.4      15.9
full soak, +1 dmg               8     6      86%      7.5      17.0
full soak, +1 dmg              10     0      67%      8.5       9.6
full soak, +1 dmg              10     2      78%      8.9      13.5
full soak, +1 dmg              10     4      80%      9.0      15.7
full soak, +1 dmg              10     6      82%      9.1      16.8
```

## Findings

1. **Healing supplies help, with sharply diminishing returns.** With full soak and +1 enemy damage over 10 fights, finishing goes from 67% with no packs to 78% with 2, 80% with 4 and 82% with 6. Under the harsher half-soak settings the same packs move 10 fights from 8% to 14%, 18% and 20%. The first two packs do most of the work.
2. **One pack heals too little.** A pack heals 2 HP and costs 2 fuel, while the squad loses about 8 HP in the first fight under the harsher settings. Packs are also only useful when they are drawn, and drawing them thins the rest of the deck. Bigger heals, or healing that works across the squad, would matter more than more packs.
3. **Dungeon length is a big lever.** With full soak and +1 enemy damage and 2 packs, finishing is 90% for 5 fights, 82% for 8 and 78% for 10. Under the harsh settings, even 5 fights end well only about half the time.
4. **Full soak with +1 enemy damage looks like a workable middle.** It leaves most dungeons survivable with a modest healing kit, while still costing the squad real HP (about 10 to 17 of 27 HP left after 10 fights, depending on packs). The half-soak settings are too punishing for a dungeon of this length.
5. **The new squid is a long fight and a soft one.** With a 12-HP body it takes about 23 player actions, which is a long fight, and it costs the squad almost nothing (0.05 droids downed on average). Its only damage comes from tentacles, and the body just inks. Even a 6-HP body takes about 19 actions, because clearing the tentacles and lane HP is already most of the fight. To make it a medium squad-tier fight, cut the tentacle regrow or the lane HP, and to make it a threat, give the body an attack.

## Open questions this raises

- How much should a healing supply heal, and how many do you bring for a 5 to 10 fight dungeon?
- Should the squid body get an attack, and should lane HP sit above or below the tentacles?
- What are the right HP, soak and enemy damage values, given that full soak with +1 enemy damage looks closest to right?
