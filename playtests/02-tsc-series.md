# Playtest 02: TSC starter deck in a series of fights

**Question.** How does the TSC starter deck hold up over 5, 10 and 15 fights in a row against generic enemies, with half soak and +1 enemy damage?

**Setup.** The TSC crew of five and its 30-card starter deck (`data/tsc_starting_deck.csv`) against the five test enemy forces in `docs/design.md` (Scavver pack, Slag hauler, Sump sniper team, Sump squid, Deserter patrol), drawn at random on the Service corridor. The simulator is `tools/series_sim.py`. All numbers are placeholders.

**Harsh settings (what you asked for).** Soak is halved, rounded up: built-in soak 2 becomes 1, and armor soak 3 becomes 2 (5 becomes 3). Every enemy attack deals +1 damage. Cards are not changed, so Brace still restores 2 soak, and so on.

## Assumptions

These fill gaps in the rules, and each is a candidate open question.

- HP, ammo and used armor soak carry over between fights. Built-in soak refills between fights, as the doc says. Whether armor refills is open, so both cases are run.
- The deck and hand are reshuffled fresh for every fight.
- A droid that is downed at the end of a won fight gets back up at 1 HP. There is no other healing between fights, except the cards in the deck, and the "clinic" rows add 5 HP across the squad after every fifth fight.
- A lost fight (two lanes overwhelmed) ends the expedition. Fights are back to back with no shops, rest rooms or other rooms in between, so this is a stress test, not a floor.
- Scripted forces deploy waiting units into empty lanes as an action. The squid regrows each cleared tentacle once.
- Same bot and rule assumptions as playtest 01.

## Single fights

```
force                config   win%  actions  avgDowned  HPleft/27
Scavver pack         baseline 100%    13.0      0.01     26.5
Slag hauler          baseline 100%    13.3      0.26     23.7
Sump sniper team     baseline 100%    12.8      0.00     26.6
Sump squid           baseline 100%     5.5      0.00     27.0
Deserter patrol      baseline 100%    19.1      0.24     23.0
Scavver pack         harsh (h 100%    13.8      0.64     20.5
Slag hauler          harsh (h 100%    14.3      1.36     16.3
Sump sniper team     harsh (h 100%    13.1      0.20     23.7
Sump squid           harsh (h 100%     5.5      0.00     26.4
Deserter patrol      harsh (h  70%    23.6      2.69      8.7
```

## Series results (1000 expeditions per row)

"finish%" is the share of expeditions that win every fight. "avgDone" is the average number of fights won before the expedition ends. "endHP" is the squad's total HP after the last fight played (27 is full).

```
enemy mix          healing                          armor     fights finish%  avgDone  endHP  downedAtEnd
mixed (all five)   no rest                          refills        5    42%     3.4    6.2   2.79
mixed (all five)   no rest                          refills       10     8%     4.3    3.9   3.59
mixed (all five)   no rest                          refills       15     1%     4.4    3.7   3.74
mixed (all five)   no rest                          no refill      5    10%     2.5    4.4   3.61
mixed (all five)   no rest                          no refill     10     0%     2.5    4.0   3.75
mixed (all five)   no rest                          no refill     15     0%     2.5    4.0   3.75
mixed (all five)   clinic: +5 HP every 5th fight    refills        5    42%     3.4    6.2   2.79
mixed (all five)   clinic: +5 HP every 5th fight    refills       10    11%     4.5    4.1   3.52
mixed (all five)   clinic: +5 HP every 5th fight    refills       15     3%     4.7    3.9   3.69
mixed (all five)   clinic: +5 HP every 5th fight    no refill      5    10%     2.5    4.4   3.61
mixed (all five)   clinic: +5 HP every 5th fight    no refill     10     0%     2.5    4.0   3.75
mixed (all five)   clinic: +5 HP every 5th fight    no refill     15     0%     2.5    4.0   3.75
squad tier only    no rest                          refills        5    85%     4.7   10.7   1.51
squad tier only    no rest                          refills       10    47%     7.8    5.7   2.54
squad tier only    no rest                          refills       15    22%     9.3    4.5   3.04
squad tier only    no rest                          no refill      5    42%     3.8    5.8   2.94
squad tier only    no rest                          no refill     10     1%     4.4    3.7   3.65
squad tier only    no rest                          no refill     15     0%     4.4    3.6   3.67
squad tier only    clinic: +5 HP every 5th fight    refills        5    85%     4.7   10.7   1.51
squad tier only    clinic: +5 HP every 5th fight    refills       10    57%     8.2    6.8   2.25
squad tier only    clinic: +5 HP every 5th fight    refills       15    37%    10.5    5.5   2.67
squad tier only    clinic: +5 HP every 5th fight    no refill      5    42%     3.8    5.8   2.94
squad tier only    clinic: +5 HP every 5th fight    no refill     10     3%     4.6    3.7   3.62
squad tier only    clinic: +5 HP every 5th fight    no refill     15     0%     4.6    3.7   3.65
```

## Context and attrition

```
Baseline (full soak, no enemy bonus), mixed, no rest, armor refills:
   5 fights: finish 100%  avg fights done 5.0
  10 fights: finish 100%  avg fights done 10.0
  15 fights: finish 100%  avg fights done 15.0

Harsh, mixed, no rest, armor refills, 10 fights: what ends the expedition
  Scavver pack       faced   645  lost   37  loss rate 6%
  Slag hauler        faced   623  lost  100  loss rate 16%
  Sump sniper team   faced   626  lost   15  loss rate 2%
  Sump squid         faced   648  lost    0  loss rate 0%
  Deserter patrol    faced   614  lost  401  loss rate 65%
  total squad HP after fight k (max 27): {1: 19.1, 2: 14.4, 3: 11.4, 4: 9.1, 5: 7.8, 6: 6.6, 7: 6.3, 8: 5.0, 9: 5.0, 10: 4.7}
```

## Tuning grid (10 fights, mixed enemies, no rest, armor refills)

```
  soak  enemy dmg  finish 5  finish 10  avg done (10)  single-fight loss%
  1.00         +0      100%       100%           10.0                0.0%
  1.00         +1       86%        62%            8.4                0.7%
  0.75         +0      100%       100%           10.0                0.0%
  0.75         +1       83%        54%            7.9                0.7%
  0.50         +0       99%        91%            9.7                0.0%
  0.50         +1       41%         8%            4.2                6.0%
```

## Findings

1. **Single fights are safe, series are not.** Under the harsh settings the TSC wins every single fight except the Deserter patrol (70%). Over a series the damage piles up: a squad that starts a 5-fight run finishes only 42% of the time, a 10-fight run 8% and a 15-fight run 1% (mixed enemies, no healing, armor refills).
2. **Enemy damage is the lever, not soak.** With full soak and +1 enemy damage, 10 fights in a row end well 62% of the time. With half soak and no enemy bonus it is 91%. With both it is 8%. Soak matters less than damage because armor can be refilled by cards, but there is no way to avoid HP loss from attacks that get through.
3. **Healing is a big gap.** Squad HP falls from 27 to about 19 after the first fight and about 9 by the fourth. Bringing downed droids back at 1 HP makes the next fight worse. The 5-HP clinic helps only a little (8% to 11% over 10 fights). If a floor has 10 fights, healing has to be a larger part of the loop, through rest rooms, Medic cards and supplies.
4. **Armor refilling between fights matters a lot.** With no armor refill, only 10% of 5-fight runs finish and almost none of the longer ones. Whether armor refills between fights is the most important open rule to settle.
5. **The Deserter patrol is the real danger.** It beats the squad in about 65% of the fights it appears in (harsh settings). Its guards have 4 HP and 2 soak, which is more than a Burst Fire can remove, and Rally Order and the +1 damage make the carbines hit for 3 or 4. The Slag hauler loses about 16% of the time and costs 1.4 droids on average. The Scavver pack loses 6% and the Sump sniper team 2%.
6. **The Sump squid is a free win.** It dies in about 5 or 6 actions after setup, since clearing two lanes of 3-HP tentacles ends it. As written, the monster rules make a monster weaker than a patrol. It needs a tougher body, tougher parts or a longer clear condition.
7. **Fights run 13 to 14 actions, not 8 to 10.** The patrol-tier enemies refill empty lanes from their waiting units, which stretches the fight. Either patrols need fewer waiting units or the short-fight target needs revising.
8. **Role cards are still not tested.** The bot rarely uses Counter, Bulwark, Field Fix, Sync and Paint Target. A better player would probably do somewhat better than the bot, so these numbers are probably pessimistic for the TSC.

## What this suggests

- Decide how many fights are meant to happen between healing opportunities. The answer sets the damage level. If an expedition is about 5 fights between rests, the harsh settings are close to right. If it is 10 or more, they are too punishing unless healing improves.
- Settle whether armor refills between fights, whether downed members stand back up and at what HP, and how much healing a rest room gives.
- Raise monster difficulty so a squad-tier monster is not easier than a patrol.
