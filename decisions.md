# Decisions

Quick reference. `docs/design.md` has the full text and reasoning.

## Locked rules

**Combat**
- 3 fixed lanes; win by overwhelming 2 of 3. Units screen their lane's HP (working rule). Captured lanes let units attack adjacent lanes.
- Alternating single actions. Setup: first 3 rounds deploy one unit per lane.
- Fixed damage, no misses. Armor is an absorb pool (soak). Melee triggers a free immediate fight-back.
- Fight length: short 8-10 rounds, medium 14-18, long 24+.

**Cards**
- Every card is an effect and fuel. Burn = discard from hand to pay for gear actions.
- One shared squad hand, baseline 7, drawn back to max at the start of each action.
- One activation per gear. Gear adds actions plus signature cards (template: 2 core + 1 utility).
- Fates: Discard, Exhaust, Pitch (permanent), Consumed (disposable gear).
- Checks: an exhausted card adds fuel value plus its Check-line bonus on the matching attribute. No player dice.

**Hive and economy**
- Floors fill from room, encounter, denizens and loot decks. Rooms have up to 3 exits from the results deck.
- Hierarchy: strata, districts, floors, sections. Gates, sections and footholds are claimed with power (gang influence).
- Supplies (rations counter plus ammo and healing cards) are the expedition clock.
- Rarity ladder: white, green, blue, purple, orange; red (named) and gold (archeotech) above.

**Factions**
- TSC (Tenebrae Security Combine): droids, forgiving recovery through brain chips and credit repair; credit hunger is the cost.
- Pressmen Union: heavy-gravity-world smelter labor (not vat-grown), enters at the foundry strata. Faction rule is Solidarity: Shoulder to Shoulder (sharing a lane with another Pressman gives +1 soak per round and +1 melee damage) and Union Grudge (when a Pressman is downed, the others deal +1 damage for the rest of the fight, no stacking). Cost is ration hunger (working rate 1.5x). Heavy weapons keep a 1-round wind-up. Starting crew of 4.
- Concord Marshals: our own upper-hive court-and-collections service (not a street police force), enters from above, squad of 3 elite members. Faction rule is Warrant: Warrant Mark (one marked enemy, +1 damage from your units), Subdue (a unit taken to 0 by a Subdue attack is arrested, not killed) and Tag and Cuff (Exposed, then Stun on cuff). Cost is Authority, a campaign track that rises with arrests and bounties and falls when a Warranted unit is killed; writ gates open on Authority instead of power. Buildings: Holding Cells and Bounty Office.
- Gang engine: AI gangs with 4 difficulties and 4 attitudes (Raiders, Builders, Swarm, Cadre), each with 3 paths.

## Open questions

- [ ] Floor generation: how many open exits count as dense enough to keep generating after the second gate, how big are the four decks, and which attributes, keys and amounts of power (gang influence) open gates?
- [ ] Crafting numbers: pitch values per rarity, upgrade costs, the name of the currency and how fast credits are earned.
- [ ] Unit tiers: how many tiers are there, and how much XP does each need? Recovery: how do crew sent to recover during an expedition heal, and how fast? Droids: how do per-droid tiers and chassis tiers combine (both add perk slots), and how much does each chassis tier add? How does brain chip recovery work, and how likely is the head destroyed result?
- [ ] Power (gang influence): how fast is it earned, how many passive points does it grant, and is it ever lost? Buildings go in claimed rooms, so there is no separate home base.
- [ ] Armor details: how much does each armor card refill, does armor refill between fights, and what sets the maximum soak? Classes: what do the melee, tool and implant class templates look like, and what do implant slots look like for humanoids (limbs, eyes, brain, torso)?
- [ ] Battlefield details: what exactly does cover do (extra lane HP, protection for units, or both), and which modifiers exist? Unit HP tiers (grunts 3 to 4, specialists 5 to 6, leaders about 8) are a working estimate.
- [ ] Conditions: the full list beyond the starting four, and which clog cards (stress, burn, acid, confusion) carry damage-on-discard drawbacks. Stress: now that failed checks carry no penalty, where does stress come from? Randomness: when does the results deck reshuffle, how do the hand of 3 and the top-of-deck draws share cards, which suits do what, how do attribute checks use results cards, and what does the aftermath deck contain?
- [ ] Spawn rules: tokens are stat lines and attacks only (working rule). Do monsters have a lane cap? Enemy forces: is a gang's roster fixed or a recipe with random gear draws, and how do threat tiers scale with depth? Gang engine: what the paths build for each other faction, and what difficulty changes beyond speed and efficiency?
- [ ] Do units screen their lane's HP (clear the units, then hit the HP), as currently assumed?
- [ ] Captured lanes: can the enemy still deploy into a lane that has been captured, and does a captured lane's HP ever recover?
- [ ] Downed members: can they be revived mid-fight, and do their gear and cards stay in play while they are downed?
- [ ] Is a round one action from each side, as currently assumed?
- [ ] *Guns Akimbo*: does one action fire both guns (two attacks), or more?
- [ ] How do factions and skills change the baseline hand size of 7, and how many cards can discard and draw cycle?
- [ ] Disposable gear: how plentiful is it at each tier, and which buildings produce it each expedition?
- [ ] Is the inventory cap per member or one shared squad bag? Supplies: does a fight also tick the clock, and how does reloading gear with an ammo counter work (an action in a fight, between rooms, or both)?
- [ ] Rarity: how rare are orange, red and gold, how do red (named or unique) and gold (archeotech or lostech) play differently, and does loot tier scale with hive depth?
- [ ] Packs: how do pack tiers change the rarity ramp, is 5 vs 15 only a size difference, what do packs cost, what does a single-item pack contain, do specialty packs use a fixed ramp, and how does price scale with how narrow the scope is?
- [ ] Attachments: how many cards can they add, and do they count against a gear's card budget?
- [ ] Do higher-rarity cards carry more than 1 fuel, or only supplies?
- [ ] Exact win condition for claiming the hive, and how long a campaign is. What counts toward winning (districts claimed, or a specific district like the Spire), and can rivals take back a claimed section?
- [ ] Pressmen Solidarity: does Union Grudge stack for each downed Pressman or stay at +1, how is the 1 soak per round limited by maximum soak, and what is the exact ration hunger rate? Heavy weapons keep a 1-round wind-up, so is that the right size of drawback?
- [ ] Concord Marshals: how much do arrests pay and how does Authority scale (range, starting value, writ gate thresholds)? How many prisoners can cells hold? Which enemies can be arrested, and how do bosses and leaders resist? How does Warrant Mark work against monsters, where parts fill lanes? Is Revise Warrant too strong, and are the Subdue cards too weak against units with a lot of HP?
- [ ] Our own faction names, to replace the placeholders (the droid faction is now the Tenebrae Security Combine), including weapon names that borrow from other settings, such as autogun and melta.

## Next steps

1. Playtest the three starter factions on paper (TSC, Pressmen, Concord Marshals); hold the other factions for a later pass.
2. The Hive Deck and encounters: floor generation, room cards, enemy forces, and how the deck grows as you explore.
3. Crafting numbers: pitch values, upgrade costs, pack odds and prices.
4. Claimed rooms, buildings and downtime: room traits, building requirements, income, and XP for members left behind.
5. Build a full starter faction and run a worked fight to test everything together.
