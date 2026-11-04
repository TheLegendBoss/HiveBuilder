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
- Not combat, but fixed: currency is Eagles. Pitch values 1, 2, 4, 8, 16 (white to orange). An upgrade costs 4x the target tier's pitch value, same-item copies count double. A standard 5-card pack costs about one room's income. Members have 5 tiers; XP from fights and from completing dungeons. Crew heal fully by the next expedition; lasting or bigger injuries heal on a timer of expeditions (a clinic speeds it up).
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
- Floor generation keeps going after the second gate while 3 or more exits are open. Floors are grouped by position, with sections per floor: Very High 1-3 (easy start), High 2-4, Middle 3-5, Lower 4-6, Ground 5-8 (very hard), Sub 9-15, Deep 5-8, Extremely Deep 4-6 (working names). Gates ask for one requirement type on early floors, a mix in the middle, and two at once far down; gate power cost scales with floor depth.
- Win condition depends on the gang; the generic one is to hold a set number of districts or claim the Spire. Campaign modes: tutorial (short), Campaign (medium), open-ended play (intended, you set hive size).
- Stress comes from both the world (dark rooms, ambushes, long expeditions, crew downed) and opt-in gambles. Some clog cards have a damage-on-discard drawback (burn costs 1 damage, stress costs nothing). The results deck reshuffles when it runs out; a game setting can also reshuffle it each expedition.
- Packs: one long 15-slot ramp with stacking step-up chances; tiers change only the steepness (no guaranteed floors, any slot has a low chance of a good pull); a 5-card pack is the first 5 slots (cheap filler or fuel), the 15-card pack is the real buy. Four tiers (working names Basic, Standard, Veteran, Elite). A Basic 5-pack costs 1 room's income, a Basic 15-pack 2.25 rooms, each tier up costs 1.5x more (15-packs are cheaper per card).
- Downed members' gear and cards stay in play, so others can burn them as fuel or play them.
- Humanoid aftermath deck: 35 cards (see `data/aftermath_deck_humanoid.csv`): 20 short-term or none, 13 lasting, 1 Critical Injury (dies unless treated at a clinic), 1 Memorable Death. Droids get their own mostly-repairable list (still to write).
- Enemy forces: depth scales both threat tier and gear. Gang rosters come from the gang engine. Non-gang forces mix three styles (fixed cards, tiered versions that strengthen with depth, random gear from a depth-based table); monsters scale with depth too. Most gear drops on a 4+ on a d6 and gang equipment on a 3+, before passive-tree upgrades (the d6 is to be mapped to a results deck draw).
- Floors fill from room, encounter, denizens and loot decks. Rooms have up to 3 exits from the results deck.
- Hierarchy: strata, districts, floors, sections. Gates, sections and footholds are claimed with power (gang influence).
- Supplies (rations counter plus ammo and healing cards) are the expedition clock.
- Rarity ladder: white, green, blue, purple, orange; red (named) and gold (archeotech) above.

**Factions**
- TSC (Tenebrae Security Combine): droids, forgiving recovery through brain chips and Eagle repair; Eagle hunger is the cost.
- Pressmen Union: heavy-gravity-world smelter labor (not vat-grown), enters at the foundry strata. Faction rule is Solidarity: Shoulder to Shoulder (sharing a lane with another Pressman gives +1 soak per round and +1 melee damage) and Union Grudge (when a Pressman is downed, the others deal +1 damage for the rest of the fight, no stacking). Cost is ration hunger (working rate 1.5x). Heavy weapons keep a 1-round wind-up. Starting crew of 4.
- Concord Marshals: our own upper-hive court-and-collections service (not a street police force), enters from above, squad of 3 elite members. Faction rule is Warrant: Warrant Mark (one marked enemy, +1 damage from your units), Subdue (a unit taken to 0 by a Subdue attack is arrested, not killed) and Tag and Cuff (Exposed, then Stun on cuff). Cost is Authority, a campaign track that rises with arrests and bounties and falls when a Warranted unit is killed; writ gates open on Authority instead of power. Buildings: Holding Cells and Bounty Office.
- More bodies cost deploy actions that could have been attacks (except for the two horde factions), so bigger squads trade tempo for synergies like Solidarity.
- Starter balance accepted (playtest 09): TSC 82% / 69% / 64% finish at 5 / 8 / 10 rooms, Pressmen 92% / 78% / 66%, Concord 89% / 76% / 71%. The TSC stays as is (armor soak 3 per piece, 2 Repair Packs of 4 HP). Small known gap: a non-gun unit's pistol-whip should be melee and draw a fight-back, which the TSC sim does not model.
- Pressmen update (playtest 08): four crew, working starting HP 10 each (40 total) and 10 total armor soak (Ironback 4, the others 2), 29-card deck with 2 Ration Packs. They are meant to be mostly HP; healing and rests are strengthened later by a gang passive.
- Concord update (playtest 08): four starting crew (Marshal, Sentinel, Warden, Breacher), 26 HP total, armor soak 4 per piece. Subdue is replaced by Concussive: stun counters instead of HP loss, ignoring soak. Stunned at counters at least current HP, captured at twice current HP. A stunned enemy rolls to remove counters (4 or more removes 1). Stun counters also raise enemy fuel costs (not yet simulated). Volley is modal (3 lethal or 5 concussive), Cuff Shot (x3) splashes 4 on one enemy and 2 on the other in its lane, Stun Pulse gives 2 counters to the lane, Breach Blast is 4 lethal. Warrant Mark applies to a monster's body (+1 damage, never captured). Enemy fight-backs get the +1 enemy damage.
- Gang engine: AI gangs with 4 difficulties and 4 attitudes (Raiders, Builders, Swarm, Cadre), each with 3 paths.

## Open questions

- [ ] Floor generation: Decided: keeps generating while 3 or more exits are open; gates ask for one type early, a mix in the middle and two far down; power cost scales with depth. Still open: how big the four decks are, which attributes and keys open gates, the power amounts, and rooms per section.
- [ ] Floor groupings: settle their names (working names), match them to the strata (lower hive, middle hive, spire), and set difficulty for Sub, Deep and Extremely Deep.
- [ ] Crafting numbers: Decided: pitch 1, 2, 4, 8, 16; upgrade cost 4x the target tier's pitch value with same-item copies counting double; currency Eagles; pack prices are set (see Packs). Still open: pitch values for red and gold, and how fast Eagles are earned.
- [ ] Unit tiers: Decided: 5 tiers, XP from fights and from completing dungeons. Still open: how much XP each tier needs. Recovery: Decided: crew heal fully by the next expedition, and lasting or bigger injuries heal on a timer of expeditions (a clinic speeds it up). Still open: the timer lengths. Droids: how do per-droid tiers and chassis tiers combine (both add perk slots), and how much does each chassis tier add? How does brain chip recovery work, and how likely is the head destroyed result?
- [ ] Power (gang influence): how fast is it earned, how many passive points does it grant, and is it ever lost? Buildings go in claimed rooms, so there is no separate home base.
- [ ] Armor details: how much does each armor card refill, does armor refill between fights, and what sets the maximum soak? Classes: what do the melee, tool and implant class templates look like, and what do implant slots look like for humanoids (limbs, eyes, brain, torso)?
- [ ] Battlefield details: what exactly does cover do (extra lane HP, protection for units, or both), and which modifiers exist? Unit HP tiers (grunts 3 to 4, specialists 5 to 6, leaders about 8) are a working estimate.
- [ ] Conditions and randomness: Decided: stress comes from both the world and opt-in gambles; some clog cards carry a damage-on-discard drawback (burn 1, stress none); the results deck reshuffles when empty, with a setting to also reshuffle each expedition. Still open: the full condition list, acid and confusion drawbacks, how the hand of 3 and top-of-deck draws share cards, suits, how attribute checks use results cards, the droid aftermath list (the humanoid deck is decided).
- [ ] Spawn rules: Decided: depth scales both threat tier and gear; gang rosters come from the gang engine; non-gang forces mix three styles and monsters scale with depth too; non-gang units drop gear on a 4+ before passive-tree upgrades. Still open: which forces use which style, whether monsters have a lane cap (the squid is capped at 3 tentacles per lane), what the gang-engine paths build for each other faction, and what difficulty changes beyond speed and efficiency.
- [x] Do units screen their lane's HP? Decided: yes.
- [x] Captured lanes: Decided: the enemy can still deploy into a captured lane, and a captured lane's HP never recovers.
- [x] Downed members: Decided: their gear and cards stay in play, so others can burn or play them (they also do not screen or act, healing can stand them up, and they rise at 1 HP after a fight).
- [x] Is a round one action from each side? Decided: yes.
- [x] *Guns Akimbo*: Decided: one action fires both guns as two separate attacks (needs two weapon slots).
- [x] Hand size and discard and draw: Decided: per-faction baseline hand size; discard up to 2, raised by skills and upgrades.
- [ ] Disposable gear: Decided: common at low tiers, a rare perk of buildings at higher tiers (a few pieces per expedition); Consumed cards leave your collection for good. Still open: exact numbers per tier, and which buildings produce it.
- [x] Inventory and supplies: Decided: one shared squad bag plus a personal carry limit per member; only movement ticks the ration clock; reloading works both ways (an ammo card mid-fight, counters refill between rooms).
- [ ] Rarity: Decided: loot tier scales with hive depth, so orange, red and gold need deep floors, but a pack can always hold one with a small chance. Still open: how red and gold play differently, and the exact odds.
- [ ] Packs: Decided: tiers change only the ramp's steepness (no floors), one long 15-slot ramp with stacking chances, and a 5-card pack is its first 5 slots. Also decided: four tiers and pack prices (Basic 5-pack 1 room, 15-pack 2.25 rooms, 1.5x per tier). Still open: the ramp numbers, what a single-item pack contains, whether specialty packs use a fixed ramp, and how price scales with scope.
- [x] Attachments: Decided: three kinds (a card outside the gear's budget, a card that counts against it, or no card and just a rule bend).
- [ ] Do higher-rarity cards carry more than 1 fuel? Decided: yes, rarer cards can be worth 2 fuel. Still open: which rarities carry 2, and whether any carry more.
- [x] Hands and weapon slots: Decided: shields take a weapon slot, tools go in an accessory slot, two-handed is set by class, and backpacks, implants and chassis can add weapon slots.
- [ ] Which weapon classes are two-handed? (Set by class, to be worked through together.)
- [ ] Extra weapon slots: set the rules for each source (backpack or implant third or fourth slot, large droid chassis up to 6, melee droid built-in melee plus two-handed backup slot, cult faction third arm), check them against hand size and fuel, and confirm the accessory slot is the old tool slot and what else goes in it.
- [ ] Win condition and campaign length: Decided: the win condition depends on the gang (generic: hold a set number of districts or claim the Spire); modes are tutorial, Campaign and open-ended play. Still open: each gang's own win condition, how many districts count, and whether rivals can take back a claimed section.
- [ ] Pressmen Solidarity: does Union Grudge stack for each downed Pressman or stay at +1, how is the 1 soak per round limited by maximum soak, and what is the exact ration hunger rate? Heavy weapons keep a 1-round wind-up, so is that the right size of drawback?
- [ ] Concord Marshals: how much do arrests pay and how does Authority scale (range, starting value, writ gate thresholds)? How many prisoners can cells hold? Which enemies can be arrested, and how do bosses and leaders resist? How does Warrant Mark work against monsters, where parts fill lanes? Is Revise Warrant too strong, and are the Subdue cards too weak against units with a lot of HP?
- [x] Rules gaps found in playtest 01: decided (no cap on units per lane, setup is deploy only, downed units do not screen, soak gains cannot exceed an armor's maximum). A stunned scripted unit losing its turn stays a working rule.
- [x] Playtest 02: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [ ] Playtest leftovers: how much a rest room or clinic heals mid-expedition (the clinic building restores up to 5, 3 or 1 HP), the fuel penalty stun counters put on enemies (not simulated), whether concussive damage should affect lane HP and monster bodies (working rule: ordinary damage), the TSC pistol-whip (should be melee and draw a fight-back; not modeled), the Concord Medic as a later recruit, and Field Service healing parity for the TSC.
- [x] Playtest 03: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [x] Playtest 04: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [x] Playtest 05: decided. The squid spawns one tentacle only into an empty, unclosed lane (cap 3), the free tentacle attack happens once, and the body attacks for 2 in a closed lane.
- [x] Playtest 06 follow-ups: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [x] Playtest 07: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [x] Playtest 08: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [x] Playtest 09: closed, answered by later decisions (leftovers are in the playtest leftovers item).
- [ ] Our own faction names, to replace the placeholders (the droid faction is now the Tenebrae Security Combine), including weapon names that borrow from other settings, such as autogun and melta. Held for a later pass, since only the three starter factions are being built now.

## Next steps

1. Settle the healing loop and armor refill rules, then tune enemy damage (playtest 02 shows it is the main lever), the Deserter patrol and the Sump squid. Then paper-test the Pressmen and Concord Marshals. Hold the other factions for a later pass.
2. The Hive Deck and encounters: floor generation, room cards, enemy forces, and how the deck grows as you explore.
3. Crafting numbers: pitch values, upgrade costs, pack odds and prices.
4. Claimed rooms, buildings and downtime: room traits, building requirements, income, and XP for members left behind.
5. Build a full starter faction and run a worked fight to test everything together.
