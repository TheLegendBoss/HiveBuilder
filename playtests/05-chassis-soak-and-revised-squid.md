# Playtest 05: chassis soak, 4-HP healing and the revised squid

**Rules set by the designer.**
- **Soak.** Built-in soak is 1 for small chassis and 2 for large chassis. Each piece of armor equipment adds 2 armor soak, for now. In the simulator the line droids and the repair droid are small chassis (1 built-in, 2 armor), the vanguard is large (2 built-in, and 4 armor from plating plus shield) and the heavy arms droid is large (2 built-in, 2 armor). That is 19 soak across the squad. For comparison, full soak is 27, rounded-up 3/4 soak is 26 and half soak (rounded up) is 16.
- **Healing.** Healing supplies heal 4 HP. The TSC deck now has two Repair Packs of its own (32 cards), and the Pressmen Ration Pack and Concord Field Dressing heal 4 HP.
- **Squid.** Tentacles have 2 HP and are capped at 3 per lane. When a tentacle attacks, another tentacle in the same lane attacks for free. The squid generates a tentacle when it acts in a lane with no tentacle, but not once the lane is closed (its lane HP broken). It can still attack in a closed lane. The body is a single 12-HP pool behind the lane HP.

**Interpretations I made.** The design says tentacles cap at 3 per lane, but the spawn rule only creates one tentacle when a lane is empty. To make the cap and the free attack matter, I ran two readings: `empty_only` (it spawns only when the lane has no tentacle, so a lane has one tentacle unless something else adds more) and `fill_to_cap` (it spawns whenever it acts in an open lane with fewer than 3 tentacles). I also gave the body a 2-damage attack in a closed lane (placeholder), and the free attack happens once per tentacle attack and does not chain. Enemy damage stays at +1. Armor soak refills between fights. All numbers are placeholders.

**Simulator.** `tools/series_sim.py` with `tools/dungeon_grid3.py` and `tools/soak_squid_split.py` producing the tables (300 runs each).

## Single fights, then dungeon runs

"mode" is the squid reading. "finish%" is the share of dungeons where the squad wins every fight, with healing supplies added to the 30-card deck as "packs" of 4 HP each. The first block uses 2 packs.

```
force                mode         win%  timeout%  actions  avgDowned  HPleft/27
Scavver pack         -            100%       0%    14.2      0.40     22.3
Slag hauler          -            100%       0%    15.3      1.13     18.0
Sump sniper team     -            100%       0%    13.2      0.11     25.2
Sump squid           empty_only    88%       0%    34.0      2.27     10.3
Sump squid           fill_to_cap   90%       0%    33.9      2.24     10.7
Deserter patrol      -             94%       0%    22.5      2.02     12.0

squid spawns fights packs  finish%  avgDone  endHP/27
empty_only        5     0      16%      2.1       4.6
empty_only        5     2      48%      3.6       7.9
empty_only        5     4      75%      4.3      12.0
empty_only        8     0       4%      2.3       3.9
empty_only        8     2      24%      4.5       6.2
empty_only        8     4      54%      6.1      10.2
empty_only       10     0       2%      2.4       3.8
empty_only       10     2      16%      4.8       5.9
empty_only       10     4      45%      7.1       9.5
fill_to_cap       5     0      16%      2.1       4.3
fill_to_cap       5     2      42%      3.4       7.4
fill_to_cap       5     4      71%      4.2      11.9
fill_to_cap       8     0       4%      2.3       3.6
fill_to_cap       8     2      20%      4.1       5.8
fill_to_cap       8     4      47%      5.9       9.4
fill_to_cap      10     0       1%      2.4       3.5
fill_to_cap      10     2      12%      4.4       5.4
fill_to_cap      10     4      36%      6.6       8.8
```

## Soak versus squid

```
10 fights, 2 four-HP packs, +1 enemy damage
  all five forces    finish  16%  avg fights won 4.8   loss rate per force: Scavver pack 0%, Slag hauler 4%, Sump sniper team 0%, Sump squid 33%, Deserter patrol 37%
  without the squid  finish  36%  avg fights won 6.6   loss rate per force: Scavver pack 0%, Slag hauler 3%, Sump sniper team 0%, Deserter patrol 33%

Same, with the earlier rounded-up 3/4 soak (built-in 2, armor 3/3/4/3/3) and the new squid:
  all five forces    finish  73%  avg fights won 8.8
  without the squid  finish  80%  avg fights won 9.1
```

## Findings

1. **The new soak numbers are much harsher than rounded-up 3/4 soak.** Over 10 fights with 2 packs and no squid, the squad finishes 36% of the time, against 80% with the rounded-up 3/4 soak. The squad's total soak is 19 instead of 26.
2. **The squid is now the deadliest force.** It is still beatable (88 to 90% of single fights) but takes about 34 actions and downs 2.3 droids on average, leaving about 10 of 27 HP. In dungeons the squad loses 33% of the time it meets the squid. The free tentacle attack and the closed-lane body attack are doing the work.
3. **The Deserter patrol is still dangerous.** It loses about a third of the fights it appears in during a dungeon.
4. **Healing is the main lever again.** Over 10 fights, finishing goes 2% (no packs), 16% (2 packs) and 45% (4 packs). For 5 fights it goes 16%, 48% and 75%.
5. **The two squid readings are close.** Filling a lane up to the cap makes the squid slightly harder (10 fights with 4 packs: 36% against 45%). Neither changes the picture, so the choice can be made on feel.
6. **The TSC is now too hard for an intro faction.** A 5-fight dungeon with 2 packs is under 50%. The levers are enemy damage (still +1), the number of packs, the Deserter patrol and the squid.

## What to decide next

- What finish rate should the intro faction have for a 5 to 10 fight dungeon with a normal healing kit?
- Does enemy damage go back to +0, or do soak and healing rise?
- Which squid reading do you want, and what should its body attack do?
