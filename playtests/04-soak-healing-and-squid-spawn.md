# Playtest 04: 3/4 soak, 4-HP healing and a squid that keeps generating tentacles

**Changes from playtest 03.** Soak is 3/4 of full instead of half. Healing supplies (the Repair Pack) heal 4 HP instead of 2. The Sump squid generates a new tentacle whenever it acts in a lane with no tentacle. Enemy damage stays at +1. All numbers are placeholders.

**Simulator.** `tools/series_sim.py`, with `tools/squid_variants.py`, `tools/dungeon_grid2.py` and `tools/soak_rounding.py` building the tables. Other assumptions are as in playtests 02 and 03: a dungeon is 5 to 10 fights, the squad heals fully at the end, and armor soak refills between fights.

## The squid rule, as designed and tuned

In the simulator the squid's cycle visits lanes 1, 2 and 3, then the body. When the cycle reaches a lane with no tentacle, the squid spends that action generating a new 3-HP tentacle there. Tentacles screen the lane, so a lane has to be cleared of tentacles and then its lane HP broken before the body can be hit.

Single fights under 3/4 soak and +1 enemy damage (300 each):

```
A. as designed: spawns in any empty lane, 3-HP, body 12 win  19%  timeout  81%  actions  84.2  downed 1.31
spawned tentacles have 1 HP                          win 100%  timeout   0%  actions  58.6  downed 0.00
spawned tentacles skip their first action            win  44%  timeout  56%  actions  80.4  downed 0.00
B. no spawn in lanes with broken lane HP, 3-HP       win 100%  timeout   0%  actions  31.7  downed 0.10
B + spawned tentacles have 1 HP (used in dungeon grid) win 100%  timeout   0%  actions  25.8  downed 0.00
A with body 8                                        win  53%  timeout  47%  actions  76.3  downed 1.12
A with body 4                                        win  90%  timeout  10%  actions  49.6  downed 0.53
```

- **As designed, the squid is nearly unwinnable.** The bot wins 19% of fights and times out on 81% (90 rounds). Each lane gets a new tentacle every squid cycle, so the squad spends most of its actions killing tentacles and never gets ahead.
- **The simplest fix is to stop spawning in lanes whose lane HP is already broken.** That reads as "once you break a lane, it is yours". The bot then wins every time, but the fight still takes about 32 actions. Adding 1-HP spawned tentacles cuts it to about 26 actions, which is a long fight.
- Skipping the first action of a spawned tentacle, or shrinking the body to 4 HP, helps less.

## Dungeon runs (300 per row)

Version A is the squid as designed. Version B is the tuned squid (no spawning in broken lanes, 1-HP spawns). "heal" is how much one Repair Pack heals. "packs" is how many are added to the 30-card deck.

```
squid heal fights packs  finish%  avgDone  endHP/27
    A    4      5     0      33%      2.7      10.2
    A    4      5     2      32%      2.7      18.6
    A    4      5     4      33%      2.7      21.4
    A    4      8     0      15%      3.4       8.8
    A    4      8     2      17%      3.3      18.8
    A    4      8     4      19%      3.4      21.8
    A    4     10     0      10%      3.6       8.5
    A    4     10     2      11%      3.6      19.1
    A    4     10     4      13%      3.6      22.6
    B    2      5     0      83%      4.6      13.0
    B    2      5     2      86%      4.7      15.6
    B    2      5     4      88%      4.7      17.0
    B    2      8     0      67%      6.8       9.9
    B    2      8     2      78%      7.1      13.8
    B    2      8     4      80%      7.2      15.0
    B    2     10     0      59%      8.0       9.0
    B    2     10     2      72%      8.6      13.4
    B    2     10     4      75%      8.7      14.8
    B    4      5     0      83%      4.6      13.0
    B    4      5     2      97%      4.9      18.9
    B    4      5     4      99%      5.0      20.6
    B    4      8     0      67%      6.8       9.9
    B    4      8     2      93%      7.8      17.7
    B    4      8     4      98%      7.9      19.8
    B    4     10     0      59%      8.0       9.0
    B    4     10     2      90%      9.6      18.1
    B    4     10     4      98%      9.9      20.4
```

## Rounding matters for 3/4 soak

Soak values are small whole numbers, so 3/4 depends on rounding. Rounding up leaves most droids at their full soak (built-in 2, armor 3, vanguard 4). Rounding down gives built-in 1 and armor 2 (vanguard 3). The runs above round up. This table repeats the key rows with both (tuned squid, 4-HP packs):

```
rounding fights packs  finish%  avgDone  endHP/27   squad soak
    ceil      5     0      83%      4.6      13.0   built-in 2, armor [3, 3, 4, 3, 3]
    ceil      5     2      97%      4.9      18.9   
    ceil      5     4      99%      5.0      20.6   
    ceil     10     0      59%      8.0       9.0   
    ceil     10     2      90%      9.6      18.1   
    ceil     10     4      98%      9.9      20.4   
   floor      5     0      44%      3.4       7.1   built-in 1, armor [2, 2, 3, 2, 2]
   floor      5     2      66%      4.1      12.1   
   floor      5     4      78%      4.4      15.3   
   floor     10     0      12%      4.5       4.4   
   floor     10     2      33%      6.3       8.7   
   floor     10     4      58%      7.7      12.8
```

## Findings

1. **Healing at 4 HP makes a big difference.** With the tuned squid and rounding up, 10-fight dungeons finish 59% of the time with no packs, 90% with 2 packs and 98% with 4. The same pack counts at 2 HP give 59%, 72% and 75%, so doubling the heal matters more than doubling the packs.
2. **The healing kit is now a strong difficulty dial.** Zero packs is a real risk, and two packs is almost safe. If dungeons should stay dangerous even with a full kit, damage or the number of fights has to go up.
3. **3/4 soak is not a middle setting yet.** Rounding up leaves it nearly the same as full soak. Rounding down is much harsher: 10 fights finish 12% with no packs, 33% with 2 and 58% with 4. We have to choose the soak numbers (or a rounding rule) and not rely on a fraction.
4. **The squid needs the spawn rule limited.** As designed it ends most dungeons on its own (finish rates stay near 10 to 33% whatever the healing). Version B is winnable and long.
5. **The squid is still soft in version B.** It downs almost nobody, so its threat is mostly the time it takes. The body has no attack of its own.

## Open questions this raises

- Which soak values do we want for droids, and do we state them as whole numbers?
- Which squid limit do we want: no spawn in broken lanes, weaker spawned tentacles, or something else?
- Should the squid body get an attack?
- How many healing supplies should a squad start with, given that two 4-HP packs make a 10-fight dungeon almost safe?
