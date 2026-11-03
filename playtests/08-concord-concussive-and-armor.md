# Playtest 08: Concord with a fourth unit, concussive guns and better armor

**Designer decisions behind this test.** Concord gets a fourth starting unit (the Breacher) and better armor than the TSC. Its guns do more damage, and the non-lethal ones are concussive: they ignore soak and deal stun counters instead of HP loss. A unit with stun counters at least equal to its current HP is Stunned. At twice its current HP it is taken out and captured for a bounty, so lethal damage (which lowers HP) and concussive damage can be mixed. Concord also has lethal guns. The Warrant Mark gives its extra damage against the squid but cannot capture it. Enemy fight-backs get the +1 enemy damage.

**Test variant (numbers are mine, not yet in the design doc).**

| Card | Source | v1 (design doc) | v2 test numbers |
| --- | --- | --- | --- |
| Flechette Volley (x4) | Flechette carbine | 2 lethal, +1 if Exposed | 3 lethal, +1 if Exposed |
| Cuff Shot (x4 -> x3) | Cuff launcher | 2 Subdue, Stun if Exposed, 1 ammo | 4 concussive, 1 ammo |
| Stun Pulse (x2) | Sonic stunner | 1 Subdue to every enemy in the lane, 1 fuel | 2 concussive to every enemy in the lane, 1 fuel |
| Breach Blast (x2) | Breaching shotgun (new, Breacher) | none | 4 lethal, 1 ammo |
| Pinning Shot (x1) | Flechette carbine | 1 damage, Slowed | removed to keep 30 cards |

The rest of the deck is unchanged (Tag Target x3, Revise Warrant, Close In x2, Halt x2, Shield Wall x3, Interpose, Plate Check x2, Field Dressing x2, Ammo Mag x2, Spare Cuffs). The Breacher has 7 HP, a breaching shotgun and a ceramic plate. The squad is now Marshal 6 HP, Sentinel 7, Warden 6, Breacher 7 (26 HP, the same as the TSC's 27). Sentinel keeps two armor pieces. "Armor 4" means 4 soak per piece (Sentinel 8), and "armor 5" means 5 per piece (Sentinel 10).

**Modeling choices.** Stun counters stay for the whole fight. A unit with counters at least equal to its HP loses its action each time its turn comes up. Humanoids are captured at twice their HP in counters; tentacles are knocked out the same way but not captured. Concussive damage against lane HP and the squid body is ordinary damage. The Warrant on the squid is the body, so Concord deals +1 to it once the lane HP is gone. Everything else is as in playtest 07. The bot now deploys a fourth unit as soon as the setup rounds are over.

**Correction to playtest 07.** In playtest 07 the bot only deployed the fourth Pressman (the Furnace Medic) around round 10, so the squad played short-handed for most of each fight. With the Medic deployed right after the setup rounds the Pressmen win much more (results below), so the 89% and 72% in playtest 07 were too low. The TSC is barely affected by the same change (86% and 66% become 82% and 64%), so the earlier calibration of 3 armor per piece stands.

## Results

```

== Pressmen: 30 HP, 15 armor soak
force              win%  actions  downed  HPleft  arrests  authority
Scavver pack       100%    14.5   0.08    26.9    0.00    +0.00
Slag hauler        100%    14.3   0.34    23.7    0.00    +0.00
Sump sniper team   100%    12.0   0.00    28.8    0.00    +0.00
Sump squid         100%    21.8   0.01    26.2    0.00    +0.00
Deserter patrol    100%    16.6   0.50    22.1    0.00    +0.00
dungeon  5 fights: finish 100%   loss rate per force: Scavver 0%, Slag 0%, Sump 0%, Sump 0%, Deserter 0%
dungeon 10 fights: finish  98%   loss rate per force: Scavver 0%, Slag 0%, Sump 0%, Sump 0%, Deserter 1%

== Concord v1 (3 units, armor 3): 19 HP, 12 armor soak
force              win%  actions  downed  HPleft  arrests  authority
Scavver pack       100%    16.5   0.19    13.3    1.58    +0.33
Slag hauler         98%    17.8   0.78    10.3    0.95    +0.27
Sump sniper team   100%    15.2   0.00    17.7    1.42    -1.00
Sump squid           7%    50.2   1.84     4.1    0.00    +0.00
Deserter patrol     83%    20.6   1.37     5.4    0.84    -1.00
dungeon  5 fights: finish   5%   loss rate per force: Scavver 9%, Slag 23%, Sump 2%, Sump 94%, Deserter 51%
dungeon 10 fights: finish   1%   loss rate per force: Scavver 9%, Slag 25%, Sump 2%, Sump 94%, Deserter 51%
cards played under 0.05 per fight: Revise Warrant, Close In, Interpose

== Concord v2, armor 3 per piece: 26 HP, 15 armor soak
force              win%  actions  downed  HPleft  arrests  authority
Scavver pack       100%    13.8   0.10    23.5    1.11    +0.01
Slag hauler        100%    12.9   0.34    21.3    1.12    +0.26
Sump sniper team   100%    13.4   0.01    24.9    1.10    -0.49
Sump squid          89%    33.0   0.95    14.1    0.00    +0.00
Deserter patrol    100%    18.0   0.33    19.8    1.14    -0.13
dungeon  5 fights: finish  61%   loss rate per force: Scavver 1%, Slag 4%, Sump 3%, Sump 25%, Deserter 11%
dungeon 10 fights: finish  28%   loss rate per force: Scavver 1%, Slag 7%, Sump 3%, Sump 28%, Deserter 17%
cards played under 0.05 per fight: Revise Warrant, Close In, Interpose

== Concord v2, armor 4 per piece: 26 HP, 20 armor soak
force              win%  actions  downed  HPleft  arrests  authority
Scavver pack       100%    13.7   0.07    24.4    1.09    -0.01
Slag hauler        100%    13.0   0.22    22.8    1.13    +0.30
Sump sniper team   100%    13.3   0.01    25.5    1.11    -0.49
Sump squid          96%    31.9   0.70    16.5    0.00    +0.00
Deserter patrol    100%    17.9   0.28    21.4    1.13    -0.17
dungeon  5 fights: finish  79%   loss rate per force: Scavver 0%, Slag 0%, Sump 3%, Sump 13%, Deserter 5%
dungeon 10 fights: finish  61%   loss rate per force: Scavver 0%, Slag 2%, Sump 2%, Sump 14%, Deserter 6%
cards played under 0.05 per fight: Revise Warrant, Close In, Interpose

== Concord v2, armor 5 per piece: 26 HP, 25 armor soak
force              win%  actions  downed  HPleft  arrests  authority
Scavver pack       100%    13.7   0.02    24.8    1.10    -0.00
Slag hauler        100%    12.9   0.09    23.8    1.16    +0.34
Sump sniper team   100%    13.2   0.01    25.8    1.11    -0.49
Sump squid          99%    30.4   0.52    18.4    0.00    +0.00
Deserter patrol    100%    17.7   0.18    22.6    1.10    -0.21
dungeon  5 fights: finish  94%   loss rate per force: Scavver 0%, Slag 0%, Sump 2%, Sump 4%, Deserter 1%
dungeon 10 fights: finish  89%   loss rate per force: Scavver 0%, Slag 0%, Sump 1%, Sump 4%, Deserter 1%
cards played under 0.05 per fight: Revise Warrant, Close In, Interpose
```

## Findings

1. **Armor 4 per piece is the closest to your 10-room target, armor 5 is too easy.** Concord v2 finishes 79% of 5-room dungeons and 61% of 10-room dungeons at 4 soak per piece (the target is 85 to 90% and 60%). At 5 per piece it finishes 94% and 89%. At 3 per piece it is 61% and 28%. Total armor soak is 15, 20 and 25 for 3, 4 and 5 per piece (the TSC has 25 including chassis soak).
2. **The squid is still the main threat for Concord.** It beats Concord in 13 to 14% of its dungeon fights at armor 4, against 4% at armor 5, and all other forces lose well under 10%.
3. **The Pressmen are now too easy.** Corrected, they win every single fight and finish 100% of 5-room dungeons and 98% of 10-room dungeons, well above the target. The Medic's healing, Solidarity soak regeneration and the 30 total HP carry them.
4. **Authority is mixed.** Concord captures about 1.1 humanoids per fight. Against the Sump sniper team it still loses about half a point of Authority per fight, because the bot kills the Warranted sniper with a lethal shot instead of capturing it.
5. **Cards the bot barely plays.** Revise Warrant, Close In and Interpose were played under 0.05 times per fight. The bot rates Close In and Interpose low (around 0.9 to 1.4) against damage cards, so they are mostly burned as fuel, even though the fourth unit now makes them legal.

## Open questions

- Armor per piece for Concord: 4 (79% / 61%) or 5 (94% / 89%)? Or 4 with a small boost elsewhere?
- Are the test numbers (Volley 3, Cuff Shot 4 concussive, Stun Pulse 2 concussive, Breach Blast 4) the right size?
- Pressmen are now too easy. What should change: HP, fewer Ration Packs, less soak regeneration, or harder fight-backs?
- Should stun counters wear off, and should a Stunned unit lose its action every turn (as modeled) or just the next one?
- Should concussive damage work on lane HP, and what should it do to the squid body (modeled as ordinary damage)?

## Update: stun counters wear off 1 per round

The designer chose armor 4 and accepted the gun numbers, and ruled that stun counters wear off by 1 per round (after the enemy acts, so a unit hit for its full HP in counters still loses that round's action). Another stun rule is not simulated: stun counters should also raise the fuel an enemy needs to use its abilities, and the scripted test forces use no fuel.

Concord v2, 26 HP, 300 dungeons per row:

| Counters | Armor per piece | Total armor soak | 5 rooms | 10 rooms |
| --- | --- | --- | --- | --- |
| Stay all fight | 4 | 20 | 79% | 61% |
| Wear off 1 per round | 4 | 20 | 62% | 30% |
| Wear off 1 per round | 5 | 25 | 88% | 70% |
| Wear off 1 per round | 6 | 30 | 95% | 91% |

With wear-off, captures per fight fall by about half (1.1 to 0.4–0.7), so Concord takes more damage and armor 5 is what lands on the 85 to 90% target at 5 rooms (70% at 10 rooms, a little easy). Single fights at armor 4 with wear-off: Scavver pack 100%, Slag hauler 100%, Sump sniper 100%, Deserter patrol 98%, squid 95%.

Note on the Pressmen question: both Pressmen (4 crew) and Concord (now 4) have one more unit than there are lanes. The setup rounds deploy one unit per lane, so the fourth deploys with a normal action afterwards. Playtest 07's bot deployed the Medic too late, and that was the only thing corrected. No design changed.
