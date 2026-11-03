# Playtest 06: difficulty levers and armor soak 3 per piece

**Target set by the designer.** About 85 to 90% of dungeons finished at 5 rooms and about 60% at 10 rooms, with the TSC's starting kit (2 Repair Packs of 4 HP).

**Setup.** Same as playtest 05: chassis soak 1 (small) and 2 (large), 4-HP packs, +1 enemy damage unless stated, squid tentacles spawn only in an empty lane (free attack once, body attack 2), armor refills between fights, 300 dungeons per row. New simulator options: enemy damage per force, and armor soak per piece. At 3 per piece, total squad soak is 7 built-in plus 18 armor, 25 (vanguard 6, the other four 3 each). "Finish" is the share of dungeons where every room is won.

## Pack count alone (+1 enemy damage, 2 armor per piece, `tools/lever_grid.py`)

| Packs | 5 rooms | 10 rooms |
| --- | --- | --- |
| 2 | 48% | 16% |
| 3 | 63% | 28% |
| 4 | 75% | 45% |
| 5 | 84% | 66% |
| 6 | 91% | 79% |

Enemy damage +0 finished 100% at every pack count, so the damage lever is a cliff between +0 and +1.

## Lever 2 (enemy damage only vs squid and Deserter patrol), lever 3 (armor soak per piece) and both (`tools/lever_grid2.py`)

```
Baseline: +1 to every force, armor 2 per piece
  baseline                         packs 2  5 rooms  48%   10 rooms  16%
  baseline                         packs 3  5 rooms  63%   10 rooms  28%
Lever 2: +1 only vs squid and Deserter patrol, +0 vs the rest
  lever 2                          packs 2  5 rooms  56%   10 rooms  24%
  lever 2                          packs 3  5 rooms  70%   10 rooms  40%
Lever 3: +1 vs every force, more armor soak per piece
  lever 3, armor 3 per piece       packs 2  5 rooms  86%   10 rooms  66%
  lever 3, armor 3 per piece       packs 3  5 rooms  96%   10 rooms  88%
  lever 3, armor 4 per piece       packs 2  5 rooms  96%   10 rooms  92%
  lever 3, armor 4 per piece       packs 3  5 rooms  99%   10 rooms  98%
Both: +1 only vs squid and Deserter patrol, more armor soak per piece
  both, armor 3 per piece          packs 2  5 rooms  88%   10 rooms  75%
  both, armor 3 per piece          packs 3  5 rooms  95%   10 rooms  89%
  both, armor 4 per piece          packs 2  5 rooms  96%   10 rooms  93%
  both, armor 4 per piece          packs 3  5 rooms  99%   10 rooms  98%
```

## Findings

1. Easing enemy damage on the easy forces adds only 8 to 12 points. It is not enough alone.
2. Armor soak of 3 per piece with 2 packs gives 86% at 5 rooms and 66% at 10, within a few points of the target. A third pack overshoots (96% and 88%).
3. Armor soak of 4 per piece is too easy in every combination.
4. Combining lever 2 with 3 armor per piece lifts 10 rooms to 75%, past the target.

## Decision

The designer chose armor soak 3 per piece, keeping +1 enemy damage against every force and the TSC's 2 Repair Packs. It also leaves room to raise difficulty later as better gear arrives.
