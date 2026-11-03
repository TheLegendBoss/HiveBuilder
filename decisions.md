# Decisions

Quick reference. `docs/design.md` has the full text and reasoning.

## Locked rules

**Combat**
- Sump squid: tentacles have 2 HP and cap at 3 per lane. It generates a tentacle when it acts in a lane with no tentacle, but not once that lane is closed (it can still attack there, without new tentacles; the body attacks instead, 2 damage is a placeholder). When a tentacle attacks, another tentacle in the lane attacks for free, so clear lanes rather than hammering an open one.
- Monsters have one large pooled body HP plus lane HP. Units screen the lane, you defeat the lane HP, and only then can you hit the body from that lane. The monster is defeated when its body reaches 0.
- 3 fixed lanes; win by overwhelming 2 of 3. Units screen their lane's HP. Captured lanes let units attack adjacent lanes; the enemy can still deploy into a captured lane and its HP never recovers. No cap on units per lane for either side (extra bodies cost deploy actions).
- Alternating single actions; a round is one action from each side. Setup: first 3 rounds deploy one unit per lane, no attacks.
- Downed members do not screen their lane and cannot act. Healing can stand them up mid-fight; after a fight they rise at 1 HP. Soak gains cannot exceed an armor's maximum. Armor soak refills between fights; built-in soak is not refilled mid-fight.
- Slots: two weapon slots per member (one-handed takes one, two-handed takes both, shields take a weapon slot), an accessory slot for tools, armor, implant and perk. Two-handed is set by weapon class. Backpacks and implants can add a third or fourth weapon slot; a large droid chassis can carry up to 6; a melee droid has built-in melee plus a two-handed backup slot; a cult faction can have a third arm.
- Supplies: the ration clock ticks on movement only, not on fights. Ammo counters reload both ways (an ammo card mid-fight, and counters refill between rooms). Inventory is one shared squad bag plus a personal carry limit per member.
- Fixed damage, no misses. Armor is an absorb pool (soak). Working soak numbers: built-in 1 for small chassis, 2 for large chassis; 3 per armor piece (vanguard 6), +1 enemy damage against every force. Melee triggers a free immediate fight-back.
- Difficulty target for the TSC starting kit (2 Repair Packs): about 85 to 90% of dungeons finished at 5 rooms and 60% at 10 (playtest 06 gets 86% and 66%).
- Fight length: short 8-10 rounds, medium 14-18, long 24+.

**Cards**
- Every card is an effect and fuel (1 by default; supplies carry more, and rarer cards can be worth 2 fuel). Burn = discard from hand to pay for gear actions.
- One shared squad hand, drawn back to max at the start of each action. Each faction sets its own baseline hand size (the three starters use 7 for now). Discard and draw discards up to 2 cards; skills and upgrades can raise that.
- One activation per gear. Gear adds actions plus signature cards (template: 2 core + 1 utility).
- Fates: Discard, Exhaust, Pitch (permanent), Consumed (disposable gear).
- Checks: an exhausted card adds fuel value plus its Check-line bonus on the matching attribute. No player dice.

**Hive and economy**
- A dungeon has 5 to 10 fights. The squad heals fully when the dungeon ends, and healing supplies (cards that double as fuel) keep it going in between. Healing supplies heal 4 HP; the TSC starts with two Repair Packs of its own (32-card deck), and the Pressmen Ration Pack and Concord Field Dressing also heal 4.
- Floors fill from room, encounter, denizens and loot decks. Rooms have up to 3 exits from the results deck.
- Hierarchy: strata, districts, floors, sections. Gates, sections and footholds are claimed with power (gang influence).
- Supplies (rations counter plus ammo and healing cards) are the expedition clock.
- Rarity ladder: white, green, blue, purple, orange; red (named) and gold (archeotech) above.

**Factions**
- TSC (Tenebrae Security Combine): droids, forgiving recovery through brain chips and credit repair; credit hunger is the cost.
- Pressmen Union: heavy-gravity-world smelter labor (not vat-grown), enters at the foundry strata. Faction rule is Solidarity: Shoulder to Shoulder (sharing a lane with another Pressman gives +1 soak per round and +1 melee damage) and Union Grudge (when a Pressman is downed, the others deal +1 damage for the rest of the fight, no stacking). Cost is ration hunger (working rate 1.5x). Heavy weapons keep a 1-round wind-up. Starting crew of 4.
- Concord Marshals: our own upper-hive court-and-collections service (not a street police force), enters from above, squad of 3 elite members. Faction rule is Warrant: Warrant Mark (one marked enemy, +1 damage from your units), Subdue (a unit taken to 0 by a Subdue attack is arrested, not killed) and Tag and Cuff (Exposed, then Stun on cuff). Cost is Authority, a campaign track that rises with arrests and bounties and falls when a Warranted unit is killed; writ gates open on Authority instead of power. Buildings: Holding Cells and Bounty Office.
- More bodies cost deploy actions that could have been attacks (except for the two horde factions), so bigger squads trade tempo for synergies like Solidarity.
- Starter balance accepted (playtest 09): TSC 82% / 69% / 64% finish at 5 / 8 / 10 rooms, Pressmen 92% / 78% / 66%, Concord 89% / 76% / 71%. The TSC stays as is (armor soak 3 per piece, 2 Repair Packs of 4 HP). Small known gap: a non-gun unit's pistol-whip should be melee and draw a fight-back, which the TSC sim does not model.
- Pressmen update (playtest 08): four crew, working starting HP 10 each (40 total) and 10 total armor soak (Ironback 4, the others 2), 29-card deck with 2 Ration Packs. They are meant to be mostly HP; healing and rests are strengthened later by a gang passive.
- Concord update (playtest 08): four starting crew (Marshal, Sentinel, Warden, Breacher), 26 HP total, armor soak 4 per piece. Subdue is replaced by Concussive: stun counters instead of HP loss, ignoring soak. Stunned at counters at least current HP, captured at twice current HP. A stunned enemy rolls to remove counters (4 or more removes 1). Stun counters also raise enemy fuel costs (not yet simulated). Volley is modal (3 lethal or 5 concussive), Cuff Shot (x3) splashes 4 on one enemy and 2 on the other in its lane, Stun Pulse gives 2 counters to the lane, Breach Blast is 4 lethal. Warrant Mark applies to a monster's body (+1 damage, never captured). Enemy fight-backs get the +1 enemy damage.
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
- [x] Do units screen their lane's HP? Decided: yes.
- [x] Captured lanes: Decided: the enemy can still deploy into a captured lane, and a captured lane's HP never recovers.
- [ ] Downed members: do their gear and cards stay in play while they are downed? (Decided: a downed member does not screen or act, healing can stand them up mid-fight, and after a fight they rise at 1 HP.)
- [x] Is a round one action from each side? Decided: yes.
- [x] *Guns Akimbo*: Decided: one action fires both guns as two separate attacks (needs two weapon slots).
- [x] Hand size and discard and draw: Decided: per-faction baseline hand size; discard up to 2, raised by skills and upgrades.
- [ ] Disposable gear: Decided: common at low tiers, a rare perk of buildings at higher tiers (a few pieces per expedition); Consumed cards leave your collection for good. Still open: exact numbers per tier, and which buildings produce it.
- [x] Inventory and supplies: Decided: one shared squad bag plus a personal carry limit per member; only movement ticks the ration clock; reloading works both ways (an ammo card mid-fight, counters refill between rooms).
- [ ] Rarity: Decided: loot tier scales with hive depth, so orange, red and gold need deep floors, but a pack can always hold one with a small chance. Still open: how red and gold play differently, and the exact odds.
- [ ] Packs: how do pack tiers change the rarity ramp, is 5 vs 15 only a size difference, what do packs cost, what does a single-item pack contain, do specialty packs use a fixed ramp, and how does price scale with how narrow the scope is?
- [x] Attachments: Decided: three kinds (a card outside the gear's budget, a card that counts against it, or no card and just a rule bend).
- [ ] Do higher-rarity cards carry more than 1 fuel? Decided: yes, rarer cards can be worth 2 fuel. Still open: which rarities carry 2, and whether any carry more.
- [x] Hands and weapon slots: Decided: shields take a weapon slot, tools go in an accessory slot, two-handed is set by class, and backpacks, implants and chassis can add weapon slots.
- [ ] Which weapon classes are two-handed? (Set by class, to be worked through together.)
- [ ] Extra weapon slots: set the rules for each source (backpack or implant third or fourth slot, large droid chassis up to 6, melee droid built-in melee plus two-handed backup slot, cult faction third arm), check them against hand size and fuel, and confirm the accessory slot is the old tool slot and what else goes in it.
- [ ] Exact win condition for claiming the hive, and how long a campaign is. What counts toward winning (districts claimed, or a specific district like the Spire), and can rivals take back a claimed section?
- [ ] Pressmen Solidarity: does Union Grudge stack for each downed Pressman or stay at +1, how is the 1 soak per round limited by maximum soak, and what is the exact ration hunger rate? Heavy weapons keep a 1-round wind-up, so is that the right size of drawback?
- [ ] Concord Marshals: how much do arrests pay and how does Authority scale (range, starting value, writ gate thresholds)? How many prisoners can cells hold? Which enemies can be arrested, and how do bosses and leaders resist? How does Warrant Mark work against monsters, where parts fill lanes? Is Revise Warrant too strong, and are the Subdue cards too weak against units with a lot of HP?
- [x] Rules gaps found in playtest 01: decided (no cap on units per lane, setup is deploy only, downed units do not screen, soak gains cannot exceed an armor's maximum). A stunned scripted unit losing its turn stays a working rule.
- [ ] Playtest 02: how much does a rest room or clinic heal? (Decided: armor soak refills between fights, downed members stand up at 1 HP after a fight.)
- [ ] Playtest 03 (dungeon runs of 5 to 10 fights, healing supplies, reworked squid): how much does a healing supply heal and how many does a squad bring (2 packs of 2 HP help, 4 or 6 add little)? Full soak with +1 enemy damage looks closest to right for the TSC. The reworked squid is a long fight (about 23 actions at a 12-HP body) that barely hurts the squad, so does the body get an attack, and should the tentacle regrow or lane HP be trimmed?
- [ ] Playtest 04 (3/4 soak, 4-HP healing supplies, squid that generates tentacles in empty lanes): as written, the squid is nearly unwinnable (about 19% wins) because a lane gets a new tentacle every squid cycle, so it needs a limit (for example, no spawning in lanes whose lane HP is already broken, which makes it a long but winnable fight). Four-HP healing supplies are far stronger than 2-HP ones (10-fight dungeons finish 90% with 2 packs, against 72%). 3/4 soak depends on rounding: rounded up it is almost full soak, rounded down it is much harsher, so soak needs whole numbers.
- [x] Playtest 05: decided. The squid spawns one tentacle only into an empty, unclosed lane (cap 3), the free tentacle attack happens once, and the body attacks for 2 in a closed lane.
- [ ] Playtest 06 follow-ups: paper-test the Pressmen and Concord decks at the same difficulty target, and check Pressmen and Concord armor cards against the new 3-per-piece baseline.
- [ ] Playtest 07 (Pressmen and Concord starter decks, assumed squads in the report): Pressmen finish 89% / 72% of 5 / 10 room dungeons, near the target; Concord finishes 5% and wins only 7% of squid fights. Open: Concord strength (HP, soak, a fourth unit, damage on more than one unit), dead cards (Close In and Interpose need two units in a lane; Revise Warrant), whether enemy fight-back gets the +1 enemy damage, how Warrant Mark works on monsters, and humanoid HP and soak for both factions.
- [ ] Playtest 08 (Concord v2: fourth unit Breacher, concussive guns, armor 3/4/5 per piece): armor 4 gives 79% / 61% (5 / 10 rooms), armor 5 gives 94% / 89%. Concord decisions from the designer (now in the doc): fourth starting unit is the Breacher; Concord armor is better than the TSC's; concussive weapons ignore soak and deal stun counters instead of HP loss; a unit is Stunned at counters at least its current HP and captured at twice its current HP, so lethal and concussive damage can be mixed; Concord also has lethal guns; Warrant Mark gives its bonus against the squid but never captures it; enemy fight-backs get the +1 enemy damage. Pressmen corrected to 100% / 98% (too easy). Open: armor per piece (4 or 5), gun damage numbers, how to tune Pressmen down, stun counter decay.
- [ ] Playtest 09 (Pressmen healing passive and Solidarity): the target is met with a modest passive (Ration Packs healing 5, or a rest worth 8 HP every 5 fights, or both); Solidarity carries the faction (without Shoulder to Shoulder the Pressmen finish 29% / 1% of 5 / 10 room dungeons). Settled by the designer: the Pressmen healing passive (Mess branch) makes Ration Packs heal 5 instead of 4, and Solidarity keeps carrying this much load because it makes the faction tactical; a bigger squad gets more pairing chances but every extra body costs a deploy action that could have been an attack (a design principle for all gangs except the two horde factions).
- [ ] Our own faction names, to replace the placeholders (the droid faction is now the Tenebrae Security Combine), including weapon names that borrow from other settings, such as autogun and melta.

## Next steps

1. Settle the healing loop and armor refill rules, then tune enemy damage (playtest 02 shows it is the main lever), the Deserter patrol and the Sump squid. Then paper-test the Pressmen and Concord Marshals. Hold the other factions for a later pass.
2. The Hive Deck and encounters: floor generation, room cards, enemy forces, and how the deck grows as you explore.
3. Crafting numbers: pitch values, upgrade costs, pack odds and prices.
4. Claimed rooms, buildings and downtime: room traits, building requirements, income, and XP for members left behind.
5. Build a full starter faction and run a worked fight to test everything together.
