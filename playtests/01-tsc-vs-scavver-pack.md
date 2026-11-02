# Playtest 01: TSC starter deck vs the Scavver pack

**Setup.** TSC starting crew of five droids (30-card starter deck from `data/tsc_starting_deck.csv`, hand of 7) against the Scavver pack (patrol tier) on the Service corridor (lane HP 3 / 4 / 3 for both sides). Enemy force and battlefield are defined in `docs/design.md`. All numbers are placeholders.

**Method.** `tools/paper_fight_sim.py` plays the fight with a simple greedy bot for the player and the scripted pattern for the enemy. The bot picks the highest-value action each turn and burns the card it values least when fuel is needed. It is a rough stand-in for a human, so read the results as "does the system hold up", not as a measure of skill. Run `python3 tools/paper_fight_sim.py log SEED` for a narrated fight and `python3 tools/paper_fight_sim.py stats N` for totals.

## Assumptions made to run the fight

These filled gaps in the rules. Each is also tracked as an open question in the design doc.

- Lane capacity is 2 units per lane, for both sides.
- In the setup rounds (1 to 3) each side deploys one unit per lane and nobody attacks. The enemy deploys its starting units one per round.
- Droid HP is 5 (6 for the vanguard and heavy arms droid). Each has 2 built-in soak that never refills, plus an armor soak pool (3 for light plating, 5 for the vanguard). Soak absorbs damage before HP.
- Cards that restore soak are capped at the armor maximum, and Shield Up's "gain" is capped the same way.
- Downed units do not screen their lane's HP.
- A stunned enemy unit loses its turn in the scripted cycle.
- Focus Fire applies to the next attack against the target chosen when it is played.
- Data Burst does nothing in this fight because it only manipulates the results deck, which this fight never uses.
- Scripted forces act with one unit per action, cycling through lanes 1, 2, 3.

## Results (3000 shuffles)

```
results {'win': 3000}
avg player actions after setup 9.9 median 10.0 min 4 max 17
avg units downed 0.0 avg total HP left 26.8
per fight: played 3.8 burned 4.8 cycled 0.0 reshuffles 0.0
card plays per fight: {'Ammo Crate': 0.01, 'Brace': 0.19, 'Burst Fire': 2.02, 'Jury-Rig': 0.04, 'Patch': 0.01, 'Pin Down': 0.2, 'Repair Parts': 0.28, 'Shield Up': 0.13, 'Suppressing Fire': 0.06, 'Sustained Fire': 0.86}
card burns per fight: {'Ammo Crate': 0.59, 'Brace': 0.0, 'Bulwark': 0.34, 'Counter': 0.3, 'Data Burst': 0.36, 'Field Fix': 0.37, 'Focus Fire': 0.7, 'Jury-Rig': 0.25, 'Overdrive': 0.14, 'Paint Target': 0.37, 'Patch': 0.36, 'Pin Down': 0.17, 'Repair Parts': 0.07, 'Shield Up': 0.48, 'Sight Alignment': 0.01, 'Suppressing Fire': 0.01, 'Sustained Fire': 0.04, 'Sync': 0.26}
```

## Sensitivity (1500 shuffles each)

```
baseline                           {'win': 1500} len 10.0 downed 0.00 HP left 26.7/27
no built-in soak                   {'win': 1500} len 10.1 downed 0.03 HP left 25.8/27
half armor soak                    {'win': 1500} len 10.0 downed 0.03 HP left 25.9/27
no built-in + half armor           {'win': 1500} len 10.3 downed 0.17 HP left 23.5/27
enemy +1 damage                    {'win': 1500} len 10.3 downed 0.16 HP left 24.8/27
enemy +1 dmg, no built-in          {'win': 1500} len 10.8 downed 0.44 HP left 21.6/27
enemy +1 dmg, no built-in, half arm {'win': 1500} len 10.8 downed 0.72 HP left 18.5/27
```

## Findings

1. **The patrol is a pushover.** The TSC wins every time and loses about 0.3 HP on average. Even with no built-in soak, half the armor and enemy damage +1, the squad wins every fight and only about 0.7 droids are downed.
2. **Fight length is on target.** About 10 player actions after setup, inside the short-fight target of 8 to 10. So the enemy HP estimate (about 8 per lane) is about right, and it is the enemy's damage and the squad's soak that are off.
3. **Soak is probably too large.** A droid has about 5 soak on top of 5 or 6 HP, so the squad has roughly 50 points of buffer. The scavvers do 1 to 2 damage per action and lose units quickly, so they can never get through it.
4. **Burst Fire one-shots grunts.** Three damage against 3-HP scavvers kills one unit per action, which is why the enemy collapses. If grunts stay at 3 HP, damage per action may need to be lower, or grunts need more HP.
5. **Lane HP is easy to take.** Once the units are dead, lane HP of 3 / 4 / 3 falls in two or three actions. Two lanes of the enemy's 10 total lane HP is too little compared with unit HP.
6. **Several role cards are only fuel in an easy fight.** Counter, Bulwark, Field Fix, Patch, Sync, Paint Target and Focus Fire are mostly burned, because there is little to heal or defend against. They need a harder opponent before we judge them. Data Burst is dead here by design.
7. **The deck never reshuffles.** Fights this short use about 16 of the 30 cards, so reshuffle rules and deck-cycle effects do not matter in a patrol.
8. **Half the actions are fuel-paid basic attacks.** About 4.8 cards are burned per fight, mostly to power autogun single shots when the hand has no good play. Fuel is doing real work.

## What to do next

- Do not tune numbers yet. Run the same bot against the squad-tier forces first (Slag hauler, Sump sniper team, Sump squid), since those apply real pressure and test the role cards.
- Then decide whether to cut soak, raise grunt HP, or raise enemy damage.

## Narrated fight (seed 1)

```
Round 1
  Player:
  Hand: Burst Fire, Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    deploys Line B to lane 3
  Enemy:
    deploys Scavver to lane 1
Round 2
  Player:
  Hand: Burst Fire, Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    deploys Line A to lane 1
  Enemy:
    deploys Scavver Chief to lane 2
Round 3
  Player:
  Hand: Burst Fire, Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    deploys Vanguard to lane 2
  Enemy:
    deploys Scavver to lane 3
Round 4
  Player:
  Hand: Burst Fire, Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    Line B (lane 3) hits Scavver for 3 killed
  Enemy:
    Scavver (lane 1) hits Line A for 2  [Line A HP 5 soak 3]
Round 5
  Player:
  Hand: Burst Fire, Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    Line B hits enemy lane 3 HP for 3 -> 0 CAPTURED
  Enemy:
    Scavver Chief rallies: a Scavver is deployed to lane 2
Round 6
  Player:
  Hand: Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire, Sustained Fire
    deploys Heavy to lane 2
  Enemy:
    Scavver (lane 1) hits Line A for 1  [Line A HP 5 soak 2]
      Line A fights back for 1 -> Scavver
Round 7
  Player:
  Hand: Focus Fire, Jury-Rig, Paint Target, Repair Parts, Repair Parts, Suppressing Fire, Sustained Fire
    burns Jury-Rig for fuel
    Line A (lane 1) hits Scavver for 2 killed
  Enemy:
    Scavver (lane 2) hits Heavy for 2  [Heavy HP 6 soak 3]
Round 8
  Player:
  Hand: Focus Fire, Paint Target, Repair Parts, Repair Parts, Suppressing Fire, Sustained Fire, Sustained Fire
    Heavy plays Sustained Fire: Scavver takes 2
    Heavy plays Sustained Fire: Scavver Chief takes 2
  Enemy:
    Scavver Chief (lane 2) hits Heavy for 2  [Heavy HP 6 soak 1]
      Heavy fights back for 1 -> Scavver Chief
Round 9
  Player:
  Hand: Ammo Crate, Focus Fire, Paint Target, Repair Parts, Repair Parts, Suppressing Fire, Sustained Fire
    Heavy plays Sustained Fire: Scavver takes 2 killed
    Heavy plays Sustained Fire: Scavver Chief takes 2 killed
  Enemy:
    (no units; passes)
Round 10
  Player:
  Hand: Ammo Crate, Counter, Focus Fire, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    deploys Repair to lane 3
  Enemy:
    (no units; passes)
Round 11
  Player:
  Hand: Ammo Crate, Counter, Focus Fire, Paint Target, Repair Parts, Repair Parts, Suppressing Fire
    burns Paint Target for fuel
    Line A hits enemy lane 1 HP for 2 -> 1
  Enemy:
    (no units; passes)
Round 12
  Player:
  Hand: Ammo Crate, Brace, Counter, Focus Fire, Repair Parts, Repair Parts, Suppressing Fire
    burns Focus Fire for fuel
    Line A hits enemy lane 1 HP for 2 -> 0 CAPTURED

RESULT: win after 12 rounds (9 after setup). lane HP you [3, 4, 3] enemy [0, 4, 0]; downed []; enemy alive 0
{'played': 4, 'burned': 3, 'play_Burst Fire': 2, 'burn_Jury-Rig': 1, 'play_Sustained Fire': 2, 'burn_Paint Target': 1, 'burn_Focus Fire': 1}
```
