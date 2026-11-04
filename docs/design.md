# Hive Deck — Design Document (Working Title)

Oct 28, 2026 · @DJ Ness

## Vision and pillars

A grim-dark deckbuilding campaign where you lead a gang through a procedurally generated hive city, claiming it district by district for your faction. Your crew, gear, perks and skills all feed one shared deck, and every card can either be played for its effect or burned as fuel.

**Pillars**

1. **The loadout is the deck.** Weapons, armor, cybernetics, ammo, perks, skills and roles all add cards. Who you bring and what you equip changes how you play.
2. **Every card has two jobs.** Play it for its own effect, or burn it to fuel a piece of gear. There are no dead cards, only choices.
3. **One system for everything.** Fights, traps, locked doors, markets and crafting all run on the same cards.
4. **The hive grows with you.** Each district you explore adds cards to the encounter deck. Reaching further means meeting more.
5. **Loss sticks.** Permadeath, scars and a capped inventory keep the tone bleak and every choice weighty.

## Setting and tone

The setting is a vertical hive city of stacked strata, from a rich spire down to a lawless sump, with gangs, officials and something nasty infesting the deep. The tone mixes grim comedy and bleakness, but leans toward the bleak, quiet side of Necromunda.

- **Placeholder names.** Faction names, gang names and terms borrowed from existing settings are placeholders until we settle our own. Hive cities, gangs inside them and infestations in the deep are general tropes, not one owner's property.
- **Gameplay carries the tone.** Scarring, stress, scarce power and permanent loss are the grim-dark, not just the art and flavor text.

## Campaign structure

The game is a campaign, but the hive is generated fresh each time, so no two campaigns match.

- **Generated hive.** A seed builds the strata, district layouts, entrance points, rival gang positions and floor themes (flooded vats, ash flats, the sump).
- **Persistent claims.** Districts you control stay yours. Their cards stay in the Hive Deck and shape later floors.
- **Permadeath.** Fallen crew are gone for good. A memorial wall or scar on the squad's record marks them. Replacements recruited from desperate survivors tend to be weaker.
- **Team wipe.** The expedition ends, but your district claims stay. You rebuild the squad from the remnants.
- **Goal.** Expand control over the hive and claim it for your faction, for example by holding enough districts, or the top stratum, against rival gangs. *The win condition depends on the gang; the generic one is to hold a set number of districts or to claim the Spire. A campaign has three modes: a short tutorial (about 10 to 15 hours), a medium Campaign (about 20 to 30 hours), and open-ended play, which is the intended mode, where you set the size of the hive at setup (think of the career mode in MechWarrior 5).*
- **Rivals.** Rival gangs also claim districts, but only on floors they have started or expanded to. A gang engine builds up each AI gang's forces and gear and decides how it sends out squads, which you can meet out in the hive.

**Gang engine (working design)**

- Each AI gang follows a predefined path, picked at random at the start of each campaign.
- Each gang comes in four difficulties: Easy, Medium, Hard and Grimdark. Difficulty sets the gang's speed and efficiency and is chosen per rival at campaign setup.
- Each gang has four attitudes: Raiders (aggressive), Builders, Swarm (go-wide) and Cadre (elite), with 3 paths per attitude. A path is a specific build for that gang.
- Rival gangs can be seen and encountered, and their territory can be taken. Defeated squads permanently reduce a gang. A rival's path is hidden at the start. Contacts, scouting, captured gear and prisoners reveal its attitude first and then its path.

**TSC as a rival gang (working design)**

- **Raiders (aggressive):** Asset Seizure (close weapons, early raids on rival rooms), Suppression Contract (machine guns and grenades, pushing lanes), Hostile Takeover (assault chassis and breaching melee, taking sections by force).
- **Builders:** Infrastructure Rollout (claims powered rooms first and builds fabricators), Supply Monopoly (market and pack focus with a big economy), Fortified Perimeter (shields and defense gear, holding sections hard).
- **Swarm (go-wide):** Mass Production (many cheap line droids on low-tier gear), Franchise Expansion (many sections held by small garrisons), Disposable Workforce (throws droids away and recovers chips afterward).
- **Cadre (elite):** Executive Protection (few high-tier units with shields and precision gear), Black Ops (marksmen and special melee, ambush focus), Prototype Division (archeotech showpiece gear, slow but dangerous).

**Campaign setup (working design)**

- **Quick setup:** choose the number of enemy gangs, the size of the hive (number of floors) and an overall difficulty. Everything else is picked at random.
- **Advanced setup:** choose the number of floors, the types of strata (with whitelists and blacklists), each gang with its difficulty and attitude, which floors the gangs start on, and the number of encounters, rooms and loot per district, plus a seed.

## Factions and crews

The player picks a faction and leads a squad of its crew. The faction sets the entrance into the hive, the starter decks, equipment, armor, stats, skill tree and perks. Squad size varies by faction.

| Faction (placeholder) | Difficulty | Identity |
| --- | --- | --- |
| Tenebrae Security Combine (TSC) | Intro (recommended) | Disposable, just-above-average drones from a corporate gang. Not hostile artificial intelligence. Very forgiving. |
| Concord Marshals (law squad) | Medium-easy | An elite three-person writ squad from the upper hive. Fewer, better tools, arrests and bounties. Easy to pilot, with a more advanced kit than the droids. Strong control, thin on raw damage. |
| Planetary militia | Intro | Many cheap conscripts, fragile, morale and attrition. |
| Imperial guard-style platoon | Mid | Team with specialist roles and a command structure. |
| Pressmen Union (heavy brute gang) | Easy-medium (second recommended) | Huge, tough smelter labor from a heavy-gravity world. High HP and slow, heavy hits, territory by intimidation. Simple to learn: stay together and the squad gets stronger. |
| Fast knife gang | Medium-easy | Quick, flashy, knife-and-dance tactics. |
| Tech gang | Medium-hard | Plasma and drones. Fragile tech needs upkeep. |
| Stealth gang | Hard | Ambush and espionage, rewards reading the deck. |
| Pit slaves | Hardest | Start with almost nothing and scavenge their deck from the hive. |
| Space marines | Unlock or late | Very powerful, so they risk breaking the tone. Possibly a stripped-down renegade version. |

**Crew and roles**

- **The crew is the deck.** Each member has a role, and the role contributes cards. Who you bring on an expedition shapes your options.
- **Members left at home** do downtime: healing, training and scheming.
- **Example roles (Concord Marshals):** Marshal (command and tagging), Sentinel (shield and hold), Warden (carbine and cuffs), Medic (triage, a later recruit).
- **Squad sizes** follow the faction, from a tight elite team to a large gang with expendable members.
- **Hand size** is set per faction (each faction has its own baseline; the three starters all use 7 for now), and team size, perks and skills can move it from there.
- **Recruiting** comes from both your faction's home district (reliable) and the hive's desperate (cheap, random, risky).

**Tenebrae Security Combine, TSC (working design)**

- Inspired by the robot units of a corporate gang. They are disposable drones, not hostile artificial intelligence, just above average and very forgiving.
- Modular bipedal chassis in roles such as line droid, vanguard (shield), heavy arms, rocket unit, marksman, winged assault unit and repair droid. The starting squad is five droids: two line droids, a vanguard, a heavy-arms droid and a repair droid. New chassis come from packs. The rocket unit's rocket hits every enemy in the lane and uses a small ammo counter. The marksman's sniper rifle has reach, so it can target an adjacent lane before you capture one. The winged assault unit makes one free basic attack when it is deployed.
- Every chassis has balanced stats, just above average with no weak stat. There is no stress track, and the aftermath deck is made of damage reports that are mostly repairable, apart from a rare head destroyed result that is permanent. Their gear is efficient and widely available to produce or buy, and they are jacks of all trades, so melee, ranged and mixed builds are all viable without heavy punishment. Gear is cheap to produce or buy but has solid stats for the price. A wide range is available at the start: pistols (light, standard and heavy), machine pistols, SMGs, shotguns (pistol-grip, pump and semi-auto), light and medium assault rifles, battle rifles, light and medium machine guns, DMRs and snipers, grenades, light and medium armor plates, and shields, plus melee weapons (machetes, combat knives, hatchets, light and heavy axes, and breaching axes, hammers and mauls). TSC also has attachments from the start. As machines, droids also have built-in soak points on top of any armor. This soak is temporary: it refills between fights and cannot be refilled once used. Small chassis (line droid, repair droid) have 1 built-in soak and large chassis (vanguard, heavy arms) have 2. Each piece of armor equipment adds 3 armor soak for now (set in playtest 06), so a vanguard with plating and a shield has 6.
- Droids are repaired for Eagles at a charging station, the faction's recovery room, instead of waiting for injuries to heal over several expeditions like humanoids. A destroyed droid can be recovered by taking its brain chip, so it is very difficult to permanently lose a squadmate. If a droid's head is destroyed by a result from the aftermath deck, it is lost forever.
- Progression is per droid, as for other factions. The faction's special rule also lets you upgrade per chassis (firmware). Chassis have the same number of tiers as gear rarities, and the faction's perk, skill and accessory cards require a chassis of equal rarity or better. A chassis tier is shared by every droid of that type (one chassis card per type), and each tier adds more health, perk slots and more. Repair and rebuild cost scales with the chassis tier, but not prohibitively. The starting deck is about 30 cards with a hand of 7: autogun, shield, heavy autofire and repair kit cards, role skill cards, seven supply cards (two of them Repair Packs) and four starter faction cards (a laser sight and an uplink module). The line droid's role skill is Focus Fire: your next attack against the same target deals +1 damage.

**TSC starting deck (draft, placeholder numbers)**

| Card | Source | Play effect | Check | Fuel |
| --- | --- | --- | --- | --- |
| Burst Fire (x4) | Autogun | 3 damage to one unit in the lane | +1 Force | 1 |
| Suppressing Fire (x2) | Autogun | Costs 1 fuel. 1 damage to every enemy in the lane, and Slowed | +1 Nerve | 1 |
| Brace (x2) | Light plating | Restore 2 soak to a unit in the lane | +1 Nerve | 1 |
| Focus Fire (x2) | Line droid skill | Your next attack against the same target deals +1 damage | +1 Wits | 1 |
| Shield Up (x2) | Combat shield | Gain 3 soak | +1 Force | 1 |
| Counter (x1) | Combat shield | When this unit is next attacked this round, deal 2 damage to the attacker | +1 Nerve | 1 |
| Bulwark (x1) | Vanguard skill | The next attack aimed at another unit in this lane hits this unit instead | +1 Nerve | 1 |
| Sustained Fire (x2) | Heavy autofire | 2 damage to up to two units in the lane. Uses 1 ammo | +1 Force | 1 |
| Pin Down (x1) | Heavy autofire | Stun one unit. Uses 2 ammo | +1 Nerve | 1 |
| Overdrive (x1) | Heavy arms skill | Your next gear action costs 1 fuel less | +1 Tech | 1 |
| Jury-Rig (x1) | Repair kit | Restore 2 soak to a unit | +2 Tech | 1 |
| Field Fix (x1) | Repair kit | Remove a status from a unit | +1 Tech | 1 |
| Patch (x1) | Repair droid skill | Heal 2 HP on one unit | +1 Tech | 1 |
| Ammo Crate (x3) | Supplies | Refill 2 ammo on one gear | none | 2 |
| Repair Parts (x2) | Supplies | Restore 3 soak to a unit | none | 2 |
| Repair Pack (x2) | Supplies | Heal 4 HP on one unit | none | 2 |
| Sight Alignment (x1) | Laser Sight (attachment) | The next attack with the attached gear deals +1 damage and costs 1 fuel less. Burned as fuel for that gear, it gives the same bonus | +1 Wits | 1 |
| Paint Target (x1) | Laser Sight (attachment) | Exposed on one unit | +1 Wits | 1 |
| Data Burst (x1) | Uplink Module (accessory) | Look at the top 3 cards of the results deck and put them back in any order | +1 Tech | 1 |
| Sync (x1) | Uplink Module (accessory) | Another droid's next attack in this lane deals +1 damage | +1 Tech | 1 |

**TSC buildings (first pass)**

- **Charging Station.** Repairs droids for Eagles, and damaged droids can be sent here to recharge during an expedition. It needs a powered room, such as a generator room.
- **Fabricator.** Produces common and uncommon gear and rebuilds chassis at a discount each expedition. It needs an industrial room.
- Held for later: Comms Relay (gradually reveals a rival gang's attitude and then its path) and Barracks (raises the droid roster size).

**TSC passive tree (working design)**

- Power (gang influence) grants points to spend on the tree. There are four branches of about five nodes each: **Procurement** (economy: cheaper packs and gear, more Eagles from claimed rooms), **Firmware** (combat: chassis bonuses, cheaper activations on faction gear), **Logistics** (supplies: bigger inventory, more rations, ammo counters that refill more easily) and **Field Service** (recovery: cheaper repairs, faster charging, a better chance that a brain chip survives).
- Each branch ends in a capstone that changes a rule instead of adding a number. For example, a Field Service capstone makes the head-destroyed result less likely, and a Procurement capstone lets you buy from rival markets.
- Branches are mostly separate. Only a very few nodes need points in two branches.

**Pressmen Union (working design)**

- **Origin.** Their ancestors were shipped down from a crushing-gravity world as indentured press-labor for the hive's foundries. The hive's gravity is light by comparison, so they are bigger and stronger than hivers and stay that way through hard work and heavy diets. They are not vat-grown or engineered. The union worked the smelters and hydraulic presses for generations, then turned its fight pits and its hall into a gang. The faction enters the hive at the foundry strata.
- **Identity.** An easy-medium second faction for players who have learned the basics. Units are big and meaty and lean on HP instead of soak: working starting HP is 10 each (40 across the crew) and armor soak is 10 across the crew (Ironback 4, the others 2). They hit hard and are slow. Their healing and rests are meant to be strengthened by a gang passive. Humanoid, so injuries, prosthetics and negative cards from the aftermath deck all apply, and prosthetics are common and carry no stigma in the union.
- **Faction rule, Solidarity.** Two simple parts, with no counters to track. Shoulder to Shoulder: a Pressman who shares a lane with another Pressman restores 1 soak at the start of each round and deals +1 damage with melee attacks. Union Grudge: when a Pressman is downed, every other Pressman deals +1 damage until the end of the fight (it does not stack). The squad has four members and there are three lanes, so at least two Pressmen always share a lane, and the rule teaches itself. A bigger squad gets more chances to pair up, but every extra body costs a deploy action that could have been an attack. Heavy weapons are slow, with a 1-round wind-up, which is part of the faction's weight. Cards such as Vent Steam skip the wind-up.
- **Cost, ration hunger.** Big bodies eat. Pressmen burn rations faster than other factions (working rate: about one and a half times), so the expedition clock runs shorter and every extra squad member makes it worse. This is easy to tune with one number.
- **Starting crew (4).** Hammerhand (heavy melee), Ironback (mantlet shield and defense), Rivet Gunner (support fire) and Furnace Medic (welding torch, repairs and heals). Hand of 7, 29 cards. New crew come from packs and from the Pit.
- **Gear.** Heavy melee (sledgehammers, mauls, press-arms), chains and other pit weapons, mantlet shields, furnace plating, rivet guns, welding torches and a gravity harness accessory. Medium and light weapons exist but are less common. Gear is sturdy and plentiful, and rarely fancy.

**Pressmen starting deck (draft, placeholder numbers)**

| Card | Source | Play effect | Check | Fuel |
| --- | --- | --- | --- | --- |
| Hammer Blow (x4) | Sledgehammer | 4 damage to one unit. Wind-up 1 | +1 Force | 1 |
| Sweeping Swing (x1) | Sledgehammer | Costs 1 fuel. 2 damage to every enemy in the lane. Wind-up 1 | +1 Force | 1 |
| Chain Lash (x2) | Pit chains | 2 damage to one unit, and Exposed | +1 Nerve | 1 |
| Vent Steam (x2) | Pressman skill | Your next heavy attack skips its wind-up | +1 Tech | 1 |
| Close Ranks (x2) | Pressman skill | Each Pressman in this lane gains 2 soak | +1 Nerve | 1 |
| Shake It Off (x2) | Brawler skill | Remove a status from a unit | +1 Nerve | 1 |
| Brace the Line (x2) | Mantlet | Gain 3 soak | +1 Force | 1 |
| Take the Hit (x1) | Mantlet | The next attack aimed at another unit in this lane hits this unit instead | +1 Nerve | 1 |
| Rivet Burst (x3) | Rivet gun | 2 damage to up to two units. Uses 1 ammo | +1 Force | 1 |
| Weld Seam (x1) | Welding torch | Restore 3 soak to a unit | +1 Tech | 1 |
| Cauterize (x1) | Welding torch | Heal 2 HP on one unit | +1 Tech | 1 |
| Furnace Apron (x2) | Furnace plating | Restore 2 soak to a unit in the lane | +1 Nerve | 1 |
| Ration Pack (x2) | Supplies | Heal 4 HP on one unit | none | 2 |
| Rivet Crate (x2) | Supplies | Refill 2 ammo on one gear | none | 2 |
| Counterweight (x1) | Gravity harness (accessory) | Gain 3 soak | +1 Force | 1 |
| Heavy Step (x1) | Gravity harness (accessory) | Your next melee attack deals +2 damage, then this unit is Slowed | +1 Force | 1 |

The starting deck has no negative cards. Injuries from the aftermath deck add them later.

**Pressmen buildings (first pass)**

- **The Pit.** Hosts fights for Eagles and recruits and lets crew train between expeditions. It needs a large open room.
- **Mess Hall.** Makes rations cheaper and offsets ration hunger. It needs a room with a kitchen or storage.
- Held for later: Press Floor (produces heavy melee gear, needs an industrial room) and Union Hall (raises the roster size).

**Pressmen passive tree (working design)**

- Power (gang influence) grants points on four branches: **Labor** (economy: income from claimed rooms, cheaper heavy gear), **Press** (combat: stronger Solidarity bonuses, cheaper wind-ups and heavy weapon bonuses), **Mess** (supplies: slower ration use, bigger packs, and stronger healing (Ration Packs heal 5 instead of 4)) and **Pit** (recruits, renown and cheaper training).
- Each branch ends in a capstone that changes a rule. For example, a Press capstone makes Union Grudge stack once for every downed Pressman, and a Mess capstone removes ration hunger.

**Concord Marshals (working design)**

- **Origin.** The Concord is the upper hive's court-and-collections service: bailiffs, assessors and writ-servers who answer to the Spire's magistrates. When a district stops paying or stops answering, the Concord sends a Marshal squad with a writ. They do not patrol. They serve warrants, arrest named targets and collect. The faction enters the hive from above, at the upper strata. They are our own service, with no tie to any existing police force, and their gear is built around restraint, not riot control.
- **Identity.** A medium-easy faction and the third starter. A squad of four elite members, so at least two share a lane and cards that work between units always have a partner. Fewer cards than the other factions, but each does more, and every weapon starts with one built-in attachment, so the kit is more advanced than the droids'. They are about 1 HP above a baseline unit (working starting HP 6 to 7, 26 across the squad), strong in Wits and Nerve, and better armored than the TSC: 4 armor soak per piece, against the TSC's 3. Their guns hit harder than the droids', but their non-lethal weapons deal stun counters instead of HP loss. Recruits are expensive.
- **Faction rule, Warrant.** It has three linked parts, and each is one sentence on the board.
  - **Warrant Mark.** At the start of each fight, mark one enemy unit as Warranted (the gang's leader or a named bounty target by default). Your units deal +1 damage to the Warranted unit. Against a monster such as the squid, the mark is on its body: your units deal +1 damage to the body once its lane HP is gone, but a monster can never be captured.
  - **Concussive damage and capture.** Concord's non-lethal weapons carry the Concussive keyword: they deal stun counters instead of HP loss, and concussive damage ignores soak. A unit with stun counters at least equal to its current HP is Stunned (it loses its action each turn it stays that way). A unit with stun counters at least twice its current HP is taken out and captured. Lethal damage lowers current HP, so lethal and concussive weapons can be mixed. On its turn a stunned enemy rolls to remove counters: on a 4 or more it removes 1. Stun counters also raise the fuel an enemy needs to use its abilities. Capturing the Warranted unit pays its bounty (Eagles and 1 Authority). Capturing any other unit pays a small bounty. Killing the Warranted unit pays nothing and costs 1 Authority. Working rule: concussive damage against a monster's lane HP and body is ordinary damage, and its parts are knocked out, not captured.
  - **Tag and Cuff.** Tag cards make a unit Exposed (+1 damage from its next hit, concussive hits included). Cuff cards are concussive and splash a lesser stun onto the other enemy in the lane. The usual turn is tag first, then cuff.
- **Cost, Authority.** A campaign track (working range 0 to 10, starting at 3). It rises with arrests and completed bounties and falls when a Warranted unit is killed instead of arrested. Some gates and sections are marked with a writ and open only if Authority is high enough, instead of costing power (gang influence). Authority is separate from power. Low Authority means the hive treats you as just another gang, and high Authority makes home-district recruiting cheaper. All numbers are placeholders.
- **Starting crew (4).** Marshal (command and tagging), Sentinel (glass shield and sonic stunner), Warden (light flechette carbine and bolas launcher) and Breacher (breaching shotgun, lethal). Hand of 7, 30 cards. A Medic is a later recruit.
- **Gear.** Flechette carbines, bolas and net launchers, sonic stunners, breaching shotguns, ballistic-glass shields, ceramic plate and sealed visors with tagging optics. Fewer items than the TSC's catalogue, each with a built-in attachment. Humanoids can arrest humanoids and denizens. Monsters and droids cannot be arrested.

**Concord Marshals starting deck (draft, placeholder numbers)**

| Card | Source | Play effect | Check | Fuel |
| --- | --- | --- | --- | --- |
| Flechette Volley (x4) | Flechette carbine | Modal. Lethal: 3 damage to one unit, +1 if it is Exposed. Or concussive: 5 stun counters on one unit | +1 Wits | 1 |
| Breach Blast (x2) | Breaching shotgun | 4 damage to one unit. Uses 1 ammo | +1 Force | 1 |
| Cuff Shot (x3) | Bolas launcher | Concussive. 4 stun counters on one unit and 2 on the other enemy in its lane. Uses 1 ammo | +1 Wits | 1 |
| Stun Pulse (x2) | Sonic stunner | Costs 1 fuel. Concussive. 2 stun counters on every enemy in the lane | +1 Tech | 1 |
| Tag Target (x3) | Tag optics (attachment) | Exposed on one unit | +1 Wits | 1 |
| Revise Warrant (x1) | Marshal skill | Move the Warranted mark to another enemy unit | +2 Wits | 1 |
| Close In (x2) | Marshal skill | Another unit's next attack in this lane deals +1 damage | +1 Nerve | 1 |
| Halt (x2) | Marshal skill | Costs 1 fuel. Stun one unit | +1 Nerve | 1 |
| Shield Wall (x3) | Glass shield | Gain 3 soak | +1 Force | 1 |
| Interpose (x1) | Glass shield | The next attack aimed at another unit in this lane hits this unit instead | +1 Nerve | 1 |
| Plate Check (x2) | Ceramic plate | Restore 2 soak to a unit in the lane | +1 Tech | 1 |
| Field Dressing (x2) | Supplies | Heal 4 HP on one unit | none | 2 |
| Ammo Mag (x2) | Supplies | Refill 2 ammo on one gear | none | 2 |
| Spare Cuffs (x1) | Supplies | Refill 2 ammo on the bolas launcher | none | 2 |

**Concord Marshals buildings (first pass)**

- **Holding Cells.** Holds arrested prisoners. Each can be ransomed for Eagles, interrogated to reveal a rival gang's attitude and then its path, or recruited at a risk. Without cells, prisoners are handed over on the spot for a small bounty. It needs a secure room such as a vault or cell block.
- **Bounty Office.** At the start of each expedition, draw a few contracts on named targets from the denizens and rival gangs, and pick one or two to hunt for Eagles, power and Authority. It needs a claimed room with a comms link.
- Held for later: Armory (produces specialty restraint gear) and Records Hall (raises the roster size).

**Concord Marshals passive tree (working design)**

- Power (gang influence) grants points on four branches: **Writs** (campaign: more Authority from arrests, cheaper writ gates), **Pursuit** (combat: stronger Warrant Mark, stun counters and tagging), **Custody** (prisoners: better ransoms, interrogation and recruiting) and **Quartermaster** (gear: attachments and supplies).
- Each branch ends in a capstone that changes a rule. For example, a Pursuit capstone lets you mark two Warranted units, and a Writs capstone makes killing a Warranted unit cost no Authority.

## The hive and floor map

The hive is a stack of strata (lower hive, middle hive, spire). Strata contain districts, districts contain a few floors, and each floor is split into sections by its gates, with the number set by where the floor sits in the hive (see the floor groupings below). Each floor is built room by room, Darkest Dungeon style. Every room has up to 3 exits, set by a dice roll the player can see, and each exit leads to another room. Rooms spawn onto a grid, so a floor can become a grid-like layout or a long winding hallway, and a newly spawned room may or may not connect to a neighboring room that is already there. Generation continues until at least two gate cards have been created. When the second gate appears, generation keeps going if the layout still has three or more open exits (a dense floor) and stops if it does not (a sparse one), so the results deck's density drives floor size. Every room has at least one exit, so generation never stalls before the gates appear. Gates, which are stairs, elevators and other multifloor access rooms, open the way to other floors. Each faction enters at its own entrance point, which sets where its first floors are. Floors are grouped by where they sit in the hive, which sets both difficulty and size (working names, sections per floor in brackets): Very High (easy start, 1 to 3), High (medium-easy start, 2 to 4), Middle (standard, 3 to 5), Lower (hard, 4 to 6), Ground (very hard, 5 to 8), Sub (9 to 15), Deep (5 to 8) and Extremely Deep (4 to 6).

| Room | What happens |
| --- | --- |
| Fight | An enemy force from the denizens deck, resolved as lane combat. |
| Scavenge | A pull from the loot deck. Inventory is capped, so loot forces choices. |
| Gamble | An opt-in risk for a reward, resolved with the results deck. |
| Hazard | A hazard that blocks entry unless you meet its attribute requirement. |
| Market | Trade with a local faction or a traveling merchant, and buy packs. |
| Rest | A tavern, safe room or rest room. Restores exhausted cards (a tavern 5, a safe room 3, a rest room 1). |
| Clinic | Restores up to 5, 3 or 1 HP across the squad, the same 5/3/1 rate that rest rooms use for exhausted cards, depending on the clinic. |
| Gate | A multifloor access room (stairs, an elevator, a lift shaft) that opens the way to another floor. |

The first pass uses the eight room types above. Held for a later pass: Patrol, Lair or boss, Vault, Bounty (a giver and the actual target), Collapse and Power node.

- **Supplies are the clock (rations, healing supplies and ammo).** Going deeper costs supplies, dark rooms add danger, and retreating toward the entrance costs more. You choose how much to bring, so you can go heavily kitted for a long expedition or travel light for a short one. Rations are a counter that ticks as you move between rooms. Only movement ticks it; a fight does not. Ammo and healing supplies are cards that double as fuel and take up inventory space. A dungeon has 5 to 10 fights, the squad heals fully when the dungeon ends, and healing supplies are what keeps it going in between.
- **Loadout is set between rooms.** You cannot re-slot gear during a fight or encounter, so the map drives your prep. You can see the type of adjacent rooms, but not rooms beyond them.
- **Rival presence.** Rival gangs appear on floors they have expanded to, as visible territory markers (banners, tags, barricades) on the map and as cards shuffled into that floor's Hive Deck. You can see the threat but not exactly when it hits.

**How a floor fills**

- Rooms are the cards in the room deck. Drawing one places it on the grid with its exit roll.
- The encounter deck fills each room and sets its type, which is revealed when the room is adjacent.
- The denizens deck populates encounters with enemy forces.
- The loot deck determines what is found when scavenging.
- Exploring a new district adds its cards to these decks.

**Gates, sections and footholds**

- Gates lead to other floors or to other parts of the same floor. Some need attributes, keys or power (gang influence) to open. Early and easy floors have gates that ask for just one of these, mid floors mix one-type and two-type gates, and far floors ask for two at once, such as a key plus power. The power cost of a gate scales with floor depth.
- A section is the set of rooms between gates. Once all of a section's gates have been found or opened, you can spend power (gang influence) to establish a foothold (a forward base, called whatever your gang calls it). All rooms in that section are then claimed, gates included.
- Claimed rooms can be occupied and repurposed with a building card. Some rooms have passive bonuses you may not want to replace, some rooms enhance a building's output, and some buildings need a specific room (a power plant needs a generator room). Rest rooms such as taverns and safe rooms are found in the hive. Once their section is claimed, they can be turned into income or into a place to send crew members to recover during an expedition, very Darkest Dungeon.

## Core card system

The Hive Deck decides what you meet, and the Crew Deck decides how you handle it. Every card in the Crew Deck is both an effect and a source of fuel.

**Two decks**

- **Hive Deck:** a set of decks that builds and fills a floor: the room deck (the floor's rooms), the encounter deck (what fills each room), the denizens deck (who populates encounters) and the loot deck (what scavenging yields). Exploring a new district adds its cards. Claiming a district shifts its cards toward your faction. Rival cards join on floors they have expanded to.
- **Crew Deck:** built from everything the squad has slotted: weapons, armor, cybernetics, ammo, perks, skills and roles. In combat it splits into a **unit deck** of squad members, deployed one per action, and an **action deck** of gear, perk and skill cards, which is your hand and your fuel.

**One shared squad hand**

The whole squad draws from and plays out of a single hand. Each faction sets its own baseline hand size (the three starters use 7 for now), and team size, perks and skills can raise or lower it from there. It caps how much fuel you can spend on one action. At the start of each of your actions you draw back up to hand size, so burned cards are replaced right away.

**Play it or burn it**

- **Play:** use the card's own effect. A card's effect can be played by any member with the matching gear equipped. Two sledgehammers means *Big Swing* can be played from either.
- **Burn:** discard any card from hand as fuel to activate a piece of slotted gear's basic action. *Swing* costs 1 card, *Heavy Swing* costs 2. Any card can be burned, even a strong one, such as an attack card burned for a cybernetic eye you do not need to aim this turn.
- **Fuel value:** every card is worth 1 fuel by default. Some cards, such as supplies, carry a printed higher value, and a card's fuel value scales with its rarity, from 1 for white up to 5 for orange (red and gold stay at 5). Better cards give more fuel when burned because you are giving up a better card.

**Activations**

- In combat you take one action at a time, then pass: play a card, activate gear, deploy a squad member, or discard and draw. Fuel for an activation is paid as part of that action (see Combat).
- Instead of a once-per-turn limit, gear has timing. Most gear fires instantly, and some has a wind-up or recovery measured in rounds.
- Perks bend the rules. For example, *Guns Akimbo* lets one action activate both guns for the fuel cost of one, as two separate attacks, one per gun. It needs two weapon slots, so how hands and weapon slots work is an open question (see the checklist).

**Where cards go**

| Fate | What it means |
| --- | --- |
| Discard | Played or burned cards go to the discard pile and return when the deck reshuffles. |
| Exhaust | Removed from the deck for the rest of the expedition. Returns when you get home, or at a room that restores exhausted cards, such as a tavern or a safe room. |
| Pitch | Permanently spent at markets or the crafting bench. Only loose cards can be pitched. |
| Consumed | Disposable gear, such as a melta grenade, is destroyed permanently when used. |

**Example sequence (placeholder numbers):** the hand is *Big Swing*, *Aim*, *Ammo Crate* (2 fuel) and *Brace*. Action one: burn *Ammo Crate* to fire the lasrifle's *Burst*, then pass. At the start of your next action you draw back up to hand size. Action two: play *Big Swing* from the first hammer, then pass. Burning *Brace* to pay for a basic *Swing* from the second hammer would be a third action.

## Equipment, slots, perks and skills

Gear is the unit of action and the source of the deck. Slots limit what is live, and a capped inventory limits what you can carry.

- **Slots.** Each member has limited slots (two weapon slots, armor, an accessory slot for tools, implant, perk), and roles and perks can add more of a given kind (see Unit cards). One-handed weapons take one weapon slot and two-handed weapons take both. Shields take a weapon slot, so a shield costs you a gun. A weapon class sets the default hand count: sidearms, close weapons, thrown explosives, shields and light melee are one-handed, while line, support and precision weapons, heavy melee and special melee are two-handed. A class's light and heavy variants can flip this, so a light carbine is one-handed and a breaching shotgun is two-handed. Cuffs and restraints are accessories, not weapons; a weapon that fires cuffs is a special weapon, such as a special grenade for a grenade launcher or a bolas launcher. A humanoid has two primary weapon slots, one backup slot and up to two more from implants and backpacks. A backpack has its own slot, so you choose between more carrying and special packs such as ammo packs or an extra arm rig. There is no deck size limit, because a big deck is diluted by junk, which is its own cost. Exceptions come from chassis and factions: a large droid chassis can carry up to 6 weapon slots, a melee droid can have built-in melee weapons plus a slot that holds a two-handed backup weapon, and a cult faction can have a third arm. Only slotted gear feeds the deck and can be activated.
- **Gear provides actions.** Slotted gear always offers its basic actions, paid with fuel. Its signature cards (like *Big Swing*) come into the deck and give much stronger effects when drawn. Some gear, such as a grenade launcher, has an ammo counter. Basic gear has no counter or a high capacity, and ammo cards refresh the counter so you can push deeper. Reloading works both ways: an ammo card played or burned as an action refreshes a counter mid-fight, and counters also refill between rooms. Gear can also be limited in two other ways: one-shot weapons like a missile launcher are exhausted when used, and disposable weapons like a melta grenade are extremely powerful but are consumed, meaning destroyed permanently (working name, since burn already means discarding a card as fuel). Disposable gear is common at low tiers, and at higher tiers it comes as a rare perk of buildings, a few pieces per expedition.
- **Capped inventory.** Unslotted gear sits in the inventory, which has a cap. Every scavenge room becomes a choice about what to leave behind. *The squad has one shared bag, and each member also has a personal carry limit.*
- **No swapping mid-encounter.** Loadout changes happen between rooms, never during a fight or encounter.
- **Dropped gear.** If a member is killed, their gear is lost for the rest of that encounter and its cards leave the deck. It returns to the inventory afterward.
- **Duplicate gear matters.** Two of the same item means its signature cards can be played from either wielder.
- **Perks and skills.** They work like gear: slotted cards that add cards and bend rules (*Guns Akimbo*, refunds on kills, a weapon that activates twice). They are upgraded the same way gear is.

**Card anatomy (working layout)**

- A **gear card** is slotted. It lists its name, rarity, slot type, tags and any minimum stat, the always-available actions (each with a fuel cost, effect and timing), the action cards it adds to the deck, its riders and attachment slots (which can differ between copies of the same tier), a test rating, a pitch value and a grind recipe.
- An **action card** goes into the deck and hand. It shows its source gear, a combat effect, a test line (an attribute and a bonus, such as +2 Wits) and a fuel value (default 1). Any wielder of the matching gear can play it, and anyone can burn it for fuel.
- Gear adds a small number of cards: about 2 to 3 for a weapon, 1 to 2 for armor (the cards that refill the absorb pool), 1 to 2 for a perk or skill, and a few for a role. A full 5-person squad lands around 40 to 50 cards. Rarer gear adds better cards, not more of them. A gear piece can add duplicates of the same card, and its card set should express its role: an autogun adds two Burst Fire and one Suppressing Fire, since it is automatic, while precision shots such as Aimed Shot come from rifles or a scope attachment. As a standard template, a weapon adds two copies of its core card plus one utility card. Gear is grouped into classes (sidearms, close, line, support, precision, explosives, defense, melee, tools and implants) that share a card template, with light, medium and heavy variants changing numbers, costs and ammo. Classes are also how perks, skills, passives, keywords and specialty packs target gear. Melee splits into Light, Heavy and Special (non-conventional melee such as power tools and drilling rigs) and can break down further by type (for example light blades and heavy axes). Tools split into physical and digital tools. Implants are mostly parallel types: prosthetic is crude but solid and visible, with a drawback; cybernetic is better and still visible, like the classic cyborg eye; bionic is an indistinguishable replacement with equal or better stats; and archeotech is also indistinguishable and purely positive. Rarity overlaps with type, so an orange prosthetic can be nearly as good as a white archeotech implant. Visibility is mostly aesthetic, though some factions view visible implants poorly. Accessories such as tools and clothing add 1 core and 1 utility card. Implants add cards by quality: prosthetic 1 core and 1 negative, cybernetic 2 core and 1 negative, bionic 2 core, and archeotech 2 core and 1 utility. A negative card is a clog-style card like the stun and burn cards. For humanoids, a prosthetic swaps the long-lasting penalty of a lost limb or eye for a negative card, which is generally the better deal. Droids repair their damage instead and can only use brain and armor implants. Attachments are cards slotted onto gear. They can add an activator (an extra action on the gear, such as a scope's aimed shot), cards for the deck, or both. For example, a laser sight adds a card that, when burned as fuel for an action on the gear it is attached to, increases that action's damage and reduces its cost.
- Each slotted copy adds its own cards, so two swords means two copies of *Big Swing*.
- Example (placeholder numbers): a Sword (weapon, melee, common, needs Force 2) offers Quick (1 fuel, 2 damage), Normal (2 fuel, 3 damage) and Heavy (2 fuel, 4 damage, one-round wind-up), has a Force 3 test, a pitch value of 2, and adds *Big Swing* and *Riposte*. *Big Swing*: 3 damage to two units in the lane, Force 5 test, 1 fuel.

**Skills, perks and gang upgrades**

- **Skills** are tied to roles and are locked to that role, such as a heal for Medics or cheaper grenade activation for demolition specialists.
- **Perks** tend (but are not limited) to be universal cards, assigned to unit cards like gear. Higher-tier or higher-level units can attach more perk cards. Some perks are limited by gang or role.
- **Unit levels.** Members earn XP by surviving encounters. Promotion happens at home between expeditions. Each tier adds a perk slot and some stat points, and recruiting higher-tier members costs more. There are 5 tiers, matching the rarity ladder, and XP also comes from completing dungeons.
- **Buildings** are cards ripped from packs and placed in claimed rooms, which act as the building slots (see Gates, sections and footholds). They give campaign-level bonuses: an Infirmary improves healing at rest rooms, a Workshop makes grinding cheaper and can produce disposable gear each expedition, an Armory raises the inventory cap, and Barracks raise the roster size. They can also unlock crafting recipes, earn income and grant XP to members left at home. The range is wide open.
- **The passive tree.** Each gang has a passive upgrade tree with faction-wide passives. It can upgrade non-combat values and improve gang-specific skills, perks and gear. Power (gang influence) grants points that you spend on the tree.

**Gear tiers and starter gear**

- Gear rarity follows the standard color ladder used by most loot games: white, green, blue, purple and orange (working names for the first four: Basic, Improved, Advanced, Enhanced; orange is still to be named). Above orange the ladder splits in two directions: red is named or unique gear, and gold or yellow is archeotech or lostech. Loot tier scales with hive depth, so orange, red and gold need deep floors, but a pack can always contain one with a small chance. Red follows the Borderlands and Diablo approach: named uniques can appear more than once, each time with different riders and stats, so you are never stuck with a version that does not suit your gang. Gold is archeotech or lostech with the best numbers and no drawback (working description). Red and gold can appear in the late slots of any pack tier with a tiny chance.
- Each member's base slots are two weapon slots, armor, an accessory slot for tools, implant and perk, with role, perk, backpack and chassis extras on top.
- Each faction starts with basic versions of its gear plus one faction signature piece.
- Higher tiers improve gear through riders, better damage and better activation costs. Damage is allowed to escalate so end-game gear feels meaningful.
- Riders and attachment slots can be randomized between gear of the same tier. For example, a low-end blue might have 2 attachment slots and a rider that adds fire damage, while a high-end blue might have 3 slots and an armor-piercing rider. Attachments come in three kinds: some add a card of their own that sits outside the gear's card budget, some add a card that counts against the budget (taking the place of one of the gear's cards), and some add no card and only bend a rule on the gear, such as +1 damage or a cheaper fuel cost.

## Tests, economy and progression

Non-combat challenges run on the same cards as fights, using attribute requirements, like Cyberpunk 2077, with no dice for the player. Gear always offers a base rating, and exhausted cards can add to it.

**Tests**

- Every card has a combat line and a test line. They can be lopsided (a hammer is strong on Force and nothing on Tech, lockpicks are weak in a fight but strong on Tech), but no card is dead anywhere.
- A test is an attribute requirement. A member's rating is their stat plus the test rating of their best slotted gear. If it falls short, you can exhaust cards from the hand, each adding its fuel value (plus the bonus printed on its Check line if the check uses that attribute), so you are never hard locked out of progress. Some checks are harder and need a results card, picked from your hand of 3, to succeed. Its value adds to your rating, and you can then exhaust cards from the hand to increase the result. Most requirements are upside only: not meeting one just means you do not get what it blocks, such as another exit from a room, an optional reward, or entry to a room with a hazard or trap. Exhausted cards return at rooms that restore a limited number of them (a tavern restores 5, a safe room 3 and a rest room 1), or all of them when you get home. Early in an expedition that is plenty, but later it is only a bandage.
- Placeholder test skills: Force, Wits, Nerve, Tech.
- Example card: a sledgehammer's Swing deals 3 damage in combat, and has Force 5 on a test. *(All numbers are placeholders.)*

**Randomness (working ideas)**

- The player is never punished by a roll they could not see coming or did not choose. Randomness comes from visible world draws (such as the number of exits a room has), aftermath results, opt-in gambles, and a few weapon damage ranges.
- **Aftermath deck.** Instead of aftermath dice, downed members draw from an aftermath deck of injury cards. Following the card-for-everything idea, armor, a Medic and perks can change what is in that deck. The starting humanoid deck is the 35-card table below (working numbers). Droids use a separate list that is mostly repairable for Eagles, with a rare head destroyed result.
- **Results deck.** One deck covers all randomness. It starts as a standard 52-card deck, with values mapped to Low, Mid and High ranges. Players can track how many cards have been used, so they know whether low or high results are likely coming. The deck reshuffles when it runs out, and a game setting can also reshuffle it at the start of each expedition.
- **Player rolls and automated rolls.** Whenever the player needs a roll, they pick one card from a hand of 3 results cards. Automated rolls, such as a room's exits, are drawn from the top of the deck.
- **Floor shape.** Because room exits come from the deck, a deck full of low cards makes rooms spread out into a large, strung-out web, while high cards make densely packed rooms with multiple entries and exits. Dense sections have more rooms, so more encounters, more fights and more damage to your squad, but they can be more rewarding. Smaller, longer floors cost more non-combat resources such as rations, and they are inherently more random because there are fewer rooms and encounters.
- **Upgrades and variants.** Results cards can gain persistent riders, such as a 3 that restores an exhausted card if it is used on a check and fails. Suits can shift a card's value, such as a spade counting one higher and a diamond one lower. Other deck styles unlock as rare drops, like the decks in Balatro, for example a no-face-cards deck whose lowest value is 3.

| Result | Cards | Effect |
| --- | --- | --- |
| Out Cold | 12 | No lasting effect, up by the next expedition |
| Lesson Learned | 2 | No injury, and the member gains bonus XP |
| Bruised and Rattled | 4 | Starts the next fight with 1 stress |
| Concussed | 2 | Starts the next fight Stunned |
| Grievous Injury | 4 | Starts every fight at half HP until treated at a clinic. A Nerve check at the clinic can downgrade it to Out Cold |
| Head Injury | 2 | Lasting. Draw a results card: low is -1 Wits, high is -1 Nerve |
| Eye Injury | 1 | Lasting. -1 to aimed and ranged tests |
| Hand Injury | 1 | Lasting. -1 Force |
| Shattered Arm | 1 | Lasting. Loses a weapon slot until healed |
| Hobbled | 1 | Lasting. Starts every fight Slowed |
| Spinal Injury | 1 | Lasting. Draw a results card: low is -1 Force, high is -1 Tech |
| Enfeebled | 2 | Lasting. -1 max HP, permanent unless treated |
| Critical Injury | 1 | Dies unless treated at a clinic before the next expedition. Treatment costs Eagles |
| Memorable Death | 1 | Dead, with no clinic save |

**Markets, packs and loot**

- Cards come from loot found in the hive and from packs bought at connected markets.
- Basic faction gear is abundant. Advanced, improved or "enhanced" gear must be pulled from packs or crafted.
- Loose cards are pitched at markets for Eagles (the currency) or ground up as fodder at the crafting bench. Rarity sets their value, so every spare card has two exits: sell it for packs, or grind it into an upgrade. Eagles also come from fights, rooms and claimed districts.

**Packs**

- Packs come in tiers, similar to the packs in Mass Effect 3 multiplayer, and each pack holds either 5 or 15 cards. There are five tiers (working names Basic, Standard, Veteran, Elite and Eagle Pack), and Basic to Elite follow the four main pack tiers of that game. A Vault Pack is a separate quest, gamble or reward pack that cannot be bought: it drops from very specific instances or is given as a reward, and it sits between Elite and Eagle Pack in power.
- Rarity ramps up within a pack. The first slots are the lowest tier, and each slot deeper has a higher chance of a rarer card. The ramp is one long ramp over 15 slots, and the chances stack: each slot's chance of stepping up a rung is higher than the one before, and a second step is possible but rarer. There are no guaranteed floors, and any slot, including an early one, has a low chance of a good pull.
- All cards can be pulled from packs, whatever their type or tier.
- Working rule: a higher pack tier makes the ramp steeper rather than raising a floor, so every tier opens mostly with low rarities, and red and gold are possible in the late slots of any tier with a tiny chance. A 5-card pack is the first 5 slots of the 15-card ramp, so it is cheap filler or fuel, and the 15-card pack is the one worth buying. Price rises more slowly than size, so a 15-card pack is cheaper per card and is the one worth buying. A Basic 5-card pack costs one room's income and a Basic 15-card pack costs 2.25 rooms. Each tier up costs 1.5 times the one before, so an Elite 15-card pack is about 7.6 rooms and an Eagle 15-card pack about 11.4 rooms. Exact ramp odds are still to be designed.
- **Specialty packs** (such as perk packs, gear packs or energy weapon packs) cost more but narrow the pool of cards they pull from. They are tiered like standard packs and use the same ramp, but over a narrower pool. Their reduced scope is the benefit. Scope runs from broad groups (all perks, all gear) to narrower ones (a role or type of perk, a weapon class) down to a single specific item. A single-item pack, such as a 15-card Autogun pack, holds copies of that one item at different rarities, with different possible riders, passives and effects, to be used or ground up for leveling, and it can include even rarer versions of the item. Each step deeper in scope multiplies the price by 1.75 on top of the tier price (perks, then a role or type of perk, then one specific perk). Markets, traveling merchants and buildings can sell or generate them.

**Crafting and upgrades**

- Weaker or less rare versions are ground down, along with several other cards, into better versions. Each card has a pitch value set by its rarity (1, 2, 4, 8 and 16 from white up to orange; gold and red are both 32), and an upgrade costs four times the target tier's pitch value in fodder. Cards can be marked locked in the inventory, which stops them from being pitched, burned or used by accident. Copies of the same item count double, so burning the same weapon is the key to a higher-tier version, and upgrades are expensive. The base copy keeps its riders and attachment slots and moves up a tier, and the other copies are consumed as fodder. Rerolling a copy's rolls is a separate paid service, such as from a Workshop building.
- Perks and skills advance the same way. Whenever an upgrade gives a card a new rider or action, you choose between two versions of it.
- Better gear should also be better material, so every upgrade is a real sacrifice.
- Pack contents, rarity odds and grind ratios are still to be designed.

## Combat

Combat is a lane duel of alternating single actions, inspired by Caravan from *Fallout: New Vegas*. There is no map or grid. You deploy squad members into three fixed lanes, and you win by overwhelming two of them.

**Lanes and winning**

- Three fixed lanes. Each side deploys units into them, and a unit fights whoever is in the opposing lane.
- Each side has HP per lane, and lane HP is the same for both sides by default, so difficulty comes from enemy gear, gang strength and deployment. Lane HP comes from the battlefield, a location card in the Hive Deck. A simple location like a short hallway has little, a complex one like a grand library has a lot, and cover and other modifiers adjust it. Overwhelm two of the enemy's three lanes to win. If the enemy overwhelms two of yours, you are forced to retreat.
- Units screen their lane's HP: clear the units, then hit the lane's HP. An empty lane is an opening, and the AI will hammer it. *(Decided.)*
- Defeating a lane's HP captures it, which lets that side's units in the lane attack the adjacent lanes (see Targeting). The enemy can still deploy into a captured lane, and a captured lane's HP never recovers.
- There is no cap on units per lane, for either side. Extra bodies cost deploy actions that could have been attacks, which is what keeps unit counts in check.
- Humanoid units, yours and the enemy's, each have their own HP.
- Monsters and bosses have one large pooled body HP, plus lane HP like any other side. Their parts (such as tentacles) are units that screen the lane. In a lane you clear the units, then defeat the lane HP, and only then can you hit the body from that lane. The monster is defeated when its body reaches 0 HP. Monsters can still win by overwhelming two of your lanes.

**Actions and turns**

- Sides alternate single actions. On your action you do one thing, then pass: play a card, activate gear (fuel is paid as part of the action), deploy a squad member from the unit deck, or discard and draw.
- At the start of each of your actions you draw back up to your maximum hand size (baseline 7). When your action deck runs out, you reshuffle the discard pile into it.
- Discard and draw: discard up to 2 cards. Skills and upgrades can raise that limit. You refill at the start of your next action.
- A round is one action from each side. Delays and statuses count in rounds.
- Setup: in the first three rounds, each side must deploy a squad member into every lane. After that, every deployment is an action you did not spend attacking, and you do not have to deploy everyone.
- Ambushes and traps can give the enemy the first actions, so you start with empty, exposed lanes.

**Gear timing and statuses**

- Most gear fires instantly. Some has a wind-up (fires after a number of rounds) or a recovery (cannot be used again for a number of rounds).
- Counters on the unit cards show delays and statuses such as stunned, delayed or burning, so the player can read a lane at a glance.
- Hammering one lane hard means giving up actions in another. This replaces the old once-per-turn activation limit.

**Downed and retreat**

- A member at 0 HP is downed, not dead. A downed member dies only if an attack has a kill trait, or if an enemy attacks them while they are downed (which costs the enemy an action). A downed member does not screen their lane and cannot act. Healing can stand them back up mid-fight, and after a fight they rise at 1 HP. A downed member's gear and cards stay in play, so other members can burn those cards as fuel or play them.
- If the enemy overwhelms two of your lanes, you retreat: downed members are left behind, the expedition ends, and you may lose ground on the floor.

**Spawning and faction tricks**

- Units can have passives and actions that deploy more units. A tentacle might read: *Passive: when deployed, deploy two copies of it. Action 1: attack. Action 2: deploy another tentacle.*
- Factions can have their own deploy tricks. House Cawdor (placeholder) units deploy another unit from the squad deck into the same lane when they enter, like a Magic: The Gathering partner.
- Spawned units are tokens with only a stat line and attacks, so they do not trigger passives or spawn more. Exact wording is settled when the first spawner is designed.

**Unit cards**

- Every squad member has a unit card: HP, a stress track, stats, a role and slots. Stats are Force, Wits, Nerve and Tech (placeholders). In a lane the card also shows status counters and wind-up counters. HP carries over between fights in an expedition, and rest rooms and Medic cards restore it. Crew left at home heal fully by the next expedition, but lasting or bigger injuries heal on a timer measured in expeditions, which a clinic speeds up.
- Stats do two jobs. They add a bonus to every test of that type, and some gear and perks have a minimum stat to be slotted.
- A member who is not equipped gets a basic stub pistol or combat knife (or the equivalent for their gang) from the armory for free. That gives everyone basic actions, so no member is useless.
- Slots depend on role and perks. A Medic gets an extra slot for gear tagged medic or healing, a demolition specialist gets an extra grenade slot, and so on.
- Conditions such as stress or burning are tracked as tokens on the unit card. Some conditions also add cards to the action deck, like stress cards in Heat or burn and confusion cards in Slay the Spire. Clog cards are worth 1 fuel and have no effect, so they are never dead cards, but some (such as burn or acid) deal damage when discarded.
- Enemy unit cards print their HP, tags, an optional passive and numbered actions. Their power comes from what is printed, while a squad member's power comes from what is slotted. *(Working layout.)*

**Attack resolution**

- Damage is mostly a fixed number printed on the gear action or card. A few weapons use dice or a range for variety.
- Attacks do not miss. There is no to-hit roll.
- The free armory weapons (stub pistol, combat knife) do 1 damage. They are the floor, not the scale for other weapons.
- Standard weapons (placeholder numbers): the autogun's single shot costs 1 fuel and does 2 damage, and its autofire costs 2 fuel and does 2-4. The shotgun costs 1 fuel and does 1-3. The sword has quick (2 damage, 1 fuel), normal (3 damage, 2 fuel) and heavy (4 damage, 2 fuel, with a one-round wind-up) attacks. A missile launcher does 2d6 but is exhausted when used.
- Melee is more consistent than ranged, but it lets the opponent fight back. If the target survives a melee attack, it fights back immediately, for free, with its most basic melee ability. A unit with no melee ability can pistol whip or stock bash with a ranged weapon for 1 damage.
- Armor is an absorb pool. It soaks damage before HP is lost. Each armor has a maximum soak, and armor cards refill the pool. Soak gains cannot take the pool above the armor's maximum. Armor soak refills between fights, and built-in soak is not refilled mid-fight. Each member wears one armor piece in the armor slot, and a shield counts as a second piece that adds its own maximum soak. Maximum soak is set by rarity: white and green 3, blue and purple 4, orange 5 per piece (a faction's starting gear can differ). Better rarity also brings better armor cards: refill amounts rise slowly, and some armor adds riders. Accessories such as a kevlar undersuit or a silent bodysuit can complement armor. Separate body-part armor slots (torso, head, arms) may be revisited later.

**Targeting**

- Attacks hit enemy units in the same lane as the acting unit. When there are several, the player chooses.
- A lane is captured when the opposing side's HP for that lane is defeated. The capturing side's units in that lane can then attack the adjacent lanes. Lanes sit in a row, so the middle lane is adjacent to both outer lanes, and each outer lane is adjacent only to the middle. *(Working rule.)*
- Reach beyond the lane is a gear property and is very rare.
- Enemy actions print a targeting rule, so the AI is predictable. With no unit to hit in its lane, an enemy attacks your lane HP. *(Working rule.)*
- Enemy actions are telegraphed. Before the enemy acts, the unit about to attack or activate is highlighted in red with its action shown beneath it. If the enemy is going to discard or deploy, those decks are highlighted instead.

**Battlefields**

- A battlefield is a room card in the room deck. It sets a separate lane HP and modifiers for each of the three lanes, so a library might have a heavily covered middle and thin flanks, while a hallway's middle lane is everything.
- Modifiers can include cover, darkness, toxic leaks or a collapsing floor, and some can tie into hive stability.
- A fight combines the room's battlefield with an enemy force from the denizens deck. Theme tags limit combinations, so a library does not draw a sump squid unless the district is flooded.

**Statuses**

- Statuses are conditions shown as counters on the unit card. They count down at the end of each full round (one action from each side). There will be more conditions than the starting set below, so the list is open.
- Starting set (placeholders): **Stunned** (the unit's next action is skipped and any wind-up is cancelled), **Burning** (1 damage each round for a set number of rounds), **Exposed** (+1 damage from the next hit) and **Slowed** (wind-ups and recoveries last 1 round longer).
- Interrupting a wind-up cancels the telegraphed attack. If it was one of your own units, the fuel already spent is lost, so heavy attacks are a gamble.

**Fight length and enemy AI**

- Fight length targets, counted in actions after the setup deployment: short 8 to 10, medium 14 to 18, long 24 or more. These are tuning targets and will change in play. Starting estimate for enemy HP per lane (units plus lane HP): about 8, 14 and 21, assuming about 1.75 damage per action.
- Gangs follow a priority list that varies by gang (for example, fill empty lanes first, then attack), with a small amount of randomness drawn from their own hand.
- Monsters and non-gang humanoids run scripted patterns on each unit, like intents in Slay the Spire.

**Enemy forces (working layout)**

- An enemy force is a card in the denizens deck. It lists its type (gang, monster or non-gang humanoid), its threat tier (patrol, squad or warband, matching short, medium and long fights), its units, which units start in lanes and which wait in its unit deck, its AI (a priority list for gangs, a scripted pattern otherwise), theme tags that pair with battlefield tags, and its rewards.
- Gang units are built from the same gear cards the player uses, under the same rules, so defeating one can drop its gear. Monsters and non-gang humanoids mix three styles: some forces are fixed cards with printed actions, some have tiered versions that get stronger with depth, and some draw real gear from a depth-based table. Monsters scale with depth too. Defeating a non-gang unit that carries real gear can drop it, at a lower chance than gang units: most gear drops on a 4 or higher on a d6, while gang equipment drops on a 3 or higher, before any upgrades in the passive trees. (The design has no player dice, so the d6 is to be mapped to a results deck draw.)

**Test enemy forces (draft, placeholder numbers)**

Five small forces for testing the starter decks. They are not a bestiary. Each stresses a different part of the card system.

- **Test battlefield, Service corridor.** Lane HP 3 / 4 / 3 for both sides, no modifiers.
- **How scripted forces act (working rule).** The force takes one action per enemy action, cycling through its lanes in order (lane 1, 2, 3) with the unit there, and each unit steps through its printed actions in order and repeats. A unit with no legal action is skipped. Wind-ups are telegraphed as usual.
- **Unit table columns.** HP, soak (an absorb pool that does not refill), where it starts, and printed actions in order.

**1. Scavver pack** (non-gang humanoids, patrol tier). Tests area cards. Tags: ruins, scrap. Reward: 1 loot draw and 2 Eagles.

| Unit | HP | Soak | Starts | Actions |
| --- | --- | --- | --- | --- |
| Scavver (x4) | 3 | 0 | Lanes 1 and 3, two wait in the deck | 1. Pot Shot: 2 damage to a unit in this lane (ranged). 2. Shiv: 1 damage (melee) |
| Scavver Chief (x1) | 5 | 0 | Lane 2 | 1. Rally: deploy a Scavver from the deck into this lane. 2. Bludgeon: 2 damage (melee) |

**2. Slag hauler** (non-gang humanoids, squad tier). Tests big single hits and armor. Tags: industrial, foundry. Reward: 2 loot draws and 4 Eagles.

| Unit | HP | Soak | Starts | Actions |
| --- | --- | --- | --- | --- |
| Slag Hauler (x1) | 8 | 4 | Lane 2 | 1. Shove: 1 damage (melee) and Slowed. 2. Heavy Swing: 4 damage (melee), wind-up 1 |
| Furnace Hand (x2) | 4 | 0 | Lanes 1 and 3 | 1. Hammer: 2 damage (melee). 2. Brace: gain 2 soak |

**3. Sump sniper team** (non-gang humanoids, squad tier). Tests redirects and soak. Tags: sump, ruins. Reward: 2 loot draws and 4 Eagles.

| Unit | HP | Soak | Starts | Actions |
| --- | --- | --- | --- | --- |
| Sump Sniper (x2) | 4 | 0 | Lane 2, one waits in the deck | 1. Mark: Exposed on the unit with the lowest HP in this lane. 2. Long Shot: 3 damage to an Exposed unit in this lane (the lowest HP unit if none), wind-up 1 |
| Sump Guard (x3) | 3 | 0 | Lanes 1 and 3, one waits in the deck | 1. Stock Bash: 1 damage (melee). 2. Cover: the next attack aimed at a Sump Sniper in this lane hits this unit instead |

**4. Sump squid** (monster, squad tier). Tests the part and body rules and Warrant Mark against monsters. Tags: sump, flooded. Reward: 2 loot draws and 3 Eagles.

| Unit | HP | Soak | Starts | Actions |
| --- | --- | --- | --- | --- |
| Tentacle (x3 parts) | 2 | 0 | One in each lane | Passive: whenever the squid acts in a lane with no tentacle and the lane is not closed, it spends that action generating a new tentacle there (at most 3 per lane). When a tentacle attacks, another tentacle in the same lane attacks for free. 1. Lash: 2 damage to a unit in this lane. 2. Grapple: 1 damage and Slowed |
| Body (pooled HP) | 12 | 0 | Behind the lane HP | Acts after lane 3. When the squid acts in a closed lane with no tentacle, the body attacks there instead: 2 damage to a unit in that lane. Ink Cloud: Exposed on every unit in the lane with the most of your units |

The squid has lane HP like any enemy (3 / 4 / 3 on the test battlefield). Tentacles screen the lane, then you must defeat the lane HP before you can hit the body from that lane. The squid is defeated when its body reaches 0 HP. Once a lane is closed (its lane HP is broken) the squid can no longer generate tentacles there, but it can still attack in that lane. Because a tentacle's attack gives another tentacle a free attack, leaving tentacles alone while hammering an open lane is costly, so you want to clear lanes.

**5. Deserter patrol** (non-gang humanoids, patrol tier). Tests concussive damage and capture. Tags: ruins, upper hive. Reward: 1 loot draw, plus bounties if arrested (3 Eagles and 1 Authority for the Captain, 1 Eagle for each guard).

| Unit | HP | Soak | Starts | Actions |
| --- | --- | --- | --- | --- |
| Deserter Captain (x1) | 6 | 0 | Lane 2 | 1. Sidearm: 2 damage to a unit in this lane (ranged). 2. Rally Order: the next attack by another Deserter in this lane deals +1 damage |
| Deserter Guard (x3) | 4 | 2 | Lanes 1 and 3, one waits in the deck | 1. Carbine: 2 damage (ranged). 2. Baton: 1 damage (melee) and Slowed |

**Considered and set aside**

- Ranks, zones and range bands: they track body position on top of gear, and a seat count does not scale across different squad sizes.
- Threat rows, mirror duels, escalation, crew dice, personal mini-decks, countdown timers and a tug-of-war line were all passed over in favor of lanes.
- A Noise track that upgrades a fight into an ambush is parked as a possible later addition.

## Grim-dark pressure systems

Scarcity and lasting damage carry the bleak tone. These are early ideas, not locked rules.

- **Stress and afflictions.** Crew accumulate stress and gain grim afflictions such as tremors, paranoia and the shakes. Stress comes from the world (dark rooms, ambushes, long expeditions and crew being downed) and from the opt-in gambles you choose to take. Conditions show as tokens on the unit card, and some also add clog cards to the action deck.
- **Scarring.** Injuries become permanent and stack over a campaign.
- **Rations, healing supplies and ammo. All of them** run out. Pushing deeper or surviving is a hard choice.
- **Hive stability.** Cave-ins, toxic leaks and power failures raise or lower a stability meter. Low stability adds dangerous cards to the Hive Deck.
- **Permadeath and memorials.** Fallen crew stay dead, and the squad carries the record.

## Open questions and next steps

Combat is now a Caravan-style lane duel, and the hand and reshuffle rules are set. The biggest open pieces are how downed members and gear behave mid-fight and the exact win condition for the campaign.

**Open questions**

- [ ] Floor generation: Decided: generation keeps going after the second gate while three or more exits are open, gates ask for one type early, a mix in the middle and two types far down, and the power cost scales with depth. Still open: how big the four decks are, which attributes and keys open gates, the power amounts, and the rooms per section.
- [ ] Floor groupings: settle their names (the current ones are working names), match them to the strata (lower hive, middle hive, spire), and set difficulty for Sub, Deep and Extremely Deep, which are not yet described.
- [ ] Crafting numbers: Decided: pitch values are 1, 2, 4, 8 and 16 from white to orange, an upgrade costs four times the target tier's pitch value with same-item copies counting double, the currency is Eagles, and pack prices are set (see Packs). Gold and red pitch values are both 32, and cards can be locked to prevent accidents. Still open: how fast Eagles are earned.
- [ ] Unit tiers: Decided: 5 tiers, with XP from surviving fights and from completing dungeons. Still open: how much XP each tier needs. Recovery: Decided: crew heal fully by the next expedition, and lasting or bigger injuries heal on a timer measured in expeditions, which a clinic speeds up. Still open: the timer lengths. Droids: how do per-droid tiers and chassis tiers combine (both add perk slots), and how much does each chassis tier add? How does brain chip recovery work, and how likely is the head destroyed result?
- [ ] Power (gang influence): how fast is it earned, how many passive points does it grant, and is it ever lost? Buildings go in claimed rooms, so there is no separate home base.
- [ ] Armor details: Decided: one armor piece per member, shields add their own maximum soak, maximum soak is set by rarity (white and green 3, blue and purple 4, orange 5), armor cards improve with rarity through slowly rising refills and riders, and armor refills between fights. Classes: what do the melee, tool and implant class templates look like, and what do implant slots look like for humanoids (limbs, eyes, brain, torso)? Held for a later pass: implants are a large topic, so only a preliminary review is wanted for now. A faction's starting gear can differ from the soak scale (confirmed).
- [ ] Battlefield details: what exactly does cover do (extra lane HP, protection for units, or both), and which modifiers exist? Unit HP tiers (grunts 3 to 4, specialists 5 to 6, leaders about 8) are a working estimate.
- [ ] Conditions: the full list beyond the starting four, Decided: some clog cards carry a damage-on-discard drawback (a burn card costs 1 damage, a stress card costs nothing). Still open: the drawbacks for acid and confusion. Stress: Decided: it comes from both the world (dark rooms, ambushes, long expeditions, crew being downed) and the opt-in gambles you choose to take. Randomness: Decided: the results deck reshuffles when it runs out, and a game setting can also reshuffle it at the start of each expedition. Still open: how the hand of 3 and the top-of-deck draws share cards, which suits do what, how do attribute checks use results cards, and the droid aftermath list (the humanoid deck is decided, see Randomness)?
- [ ] Spawn rules: tokens are stat lines and attacks only (working rule). Do monsters have a lane cap? Enemy forces: Decided: depth scales both the threat tier and the gear, and gang rosters come from the gang engine. Non-gang forces: Decided: they mix three styles (fixed cards, tiered versions that strengthen with depth, and random gear from a depth-based table), monsters scale with depth too, and most gear drops on a 4 or higher on a d6 and gang equipment on a 3 or higher, before passive-tree upgrades. Still open: which forces use which style. Gang engine: what the paths build for each other faction, and what difficulty changes beyond speed and efficiency?
- [x] Do units screen their lane's HP (clear the units, then hit the HP)? Decided: yes.
- [x] Captured lanes: can the enemy still deploy into a lane that has been captured, and does a captured lane's HP ever recover? Decided: the enemy can still deploy into a captured lane, and a captured lane's HP never recovers.
- [x] Downed members: Decided: their gear and cards stay in play, so other members can burn them as fuel or play them. (Also decided: a downed member does not screen their lane and cannot act, healing can stand them back up mid-fight, and after a fight they rise at 1 HP.)
- [x] Is a round one action from each side? Decided: yes.
- [x] *Guns Akimbo*: Decided: one action fires both guns as two separate attacks. It needs two weapon slots, which opens the question in the next item about hands and weapon slots.
- [x] Hand size and discard and draw: Decided: each faction has its own baseline hand size, and discard and draw discards up to 2 cards, which skills and upgrades can raise. The per-faction baselines and the upgrades that raise the limit are set as each faction and the skill tree are designed.
- [ ] Disposable gear: Decided: it is common at low tiers, and at higher tiers it is a rare perk of buildings, a few pieces per expedition. Consumed cards leave your collection for good. Still open: exact numbers per tier, and which buildings produce it.
- [x] Inventory: Decided: one shared squad bag, and each member also has a personal carry limit. Supplies: Decided: only movement ticks the clock, not fights, and reloading works both ways (an ammo card mid-fight, and counters refill between rooms).
- [ ] Rarity: Decided: loot tier scales with hive depth, so orange, red and gold need deep floors, but a pack can always hold one with a small chance. Also decided: red is named uniques that can appear more than once with different riders and stats, and red and gold can appear in the late slots of any pack tier with a tiny chance. Still open: how gold plays and the exact odds.
- [x] Packs: Decided: tiers change only how steep the ramp is (no guaranteed floors, with a low chance of a good pull in any slot), there is one long 15-slot ramp with stacking chances, and a 5-card pack is its first 5 slots (cheap filler or fuel). Also decided: five tiers (the fifth is the Eagle Pack) plus the reward-only Vault Pack, step-up chances 20% higher across the board, a Basic 5-card pack costs 1 room's income and a Basic 15-card pack 2.25 rooms, with each tier up costing 1.5 times more. Also decided: single-item packs ramp over one item's rarities and variants, specialty packs are tiered too, and each step narrower multiplies the price by 1.75. Still open: only the ramp numbers, to be tuned in playtests.
- [x] Attachments: Decided: there are three kinds. Some add a card outside the gear's card budget, some add a card that counts against the budget, and some add no card and only bend a rule on the gear.
- [x] Do higher-rarity cards carry more than 1 fuel? Decided: fuel scales with rarity, from 1 for white up to 5 for orange, because burning a better card is a bigger sacrifice. Red and gold stay at 5.
- [x] Hands and weapon slots: members have two weapon slots, and some gear (two-handed weapons) takes both. D*ecided: shields take a weapon slot, tools go in an accessory slot, two-handed is set by class, and backpacks, implants and chassis can add weapon slots (the next two items carry the details).*
- [x] Weapon classes: Decided: a class sets the default hand count (one-handed: sidearms, close, thrown explosives, shields, light melee; two-handed: line, support, precision, heavy and special melee), light and heavy variants can flip it, cuffs are accessories, and a cuff-firing weapon is a special weapon.
- [x] Concord Warden loadout: Decided: the Warden carries a light flechette carbine (one-handed) and a bolas launcher (a one-handed special weapon) that fires the Cuff Shot cards. Cuffs are accessories, and the rest of the Concord deck is unchanged.
- [ ] Extra weapon slots: Decided: humanoids have 2 primary weapon slots, 1 backup slot and up to 2 more from implants and backpacks; a backpack has its own slot, so you choose between more carrying and special packs such as ammo packs or an extra arm rig; there is no deck size limit, since dilution by junk is its own cost. Special cases: the large droid chassis with up to 6, the melee droid's built-in melee weapons and two-handed backup slot, and the cult faction's third arm. Still open: how the backup slot works (whether its cards feed the deck or it swaps in during a fight) and the rules for each source. Also confirm that the accessory slot is the old tool slot, and what else goes in it.
- [ ] Win condition and campaign length: Decided: the win condition depends on the gang, and the generic one is to hold a set number of districts or claim the Spire. Length comes in three modes: tutorial (short), Campaign (medium) and open-ended play (the intended mode). Still open: each gang's own win condition, how many districts count, and whether rivals can take back a claimed section.
- [ ] Our own faction names, to replace the placeholders (the droid faction is now the Tenebrae Security Combine), including weapon names that borrow from other settings, such as autogun and melta. Held for a later pass, since only the three starter factions are being built now.
- [x] Pressmen Solidarity: does Union Grudge Decided: Union Grudge does not stack, the 1 soak per round is capped by maximum soak, the ration hunger rate starts at 1.5x, and the 1-round wind-up on heavy weapons stays.
- [ ] Concord Marshals: how much do arrests pay and how does Authority scale (range, starting value, writ gate thresholds)? How many prisoners can cells hold? Which enemies can be arrested, and how do bosses and leaders resist? Is Revise Warrant too strong, and is capture too hard against units with a lot of HP? (Warrant Mark against monsters is decided: it marks the body for +1 damage, with no capture.)
- [x] Rules gaps found in playtest 01 (TSC vs the Scavver pack, see `playtests/` in the repo): lane capacity (assumed 2 per side), what each side does in the setup rounds (assumed deploy only, no attacks), whether downed units screen their lane HP (assumed no), whether the soak "gain" effects can exceed an armor's maximum (assumed no), how much built-in and armor soak a droid has, and whether a stunned scripted unit loses its turn (assumed yes). Balance: the patrol is far too easy, with soak very large and grunt HP of 3 against 3-damage Burst Fire. Decided: there is no cap on units per lane, the setup rounds are deploy only, downed units do not screen their lane, and soak gains cannot exceed an armor's maximum. A stunned scripted unit losing its turn stays as a working rule. The balance notes were answered by the later soak and difficulty decisions.
- [x] Playtest 02 (TSC in a series of fights, half soak and +1 enemy damage): Closed: the rest room and clinic healing question moved to the playtest leftovers item. (Decided: armor soak refills between fights, and downed members stand back up at 1 HP after a fight.) Enemy damage looks like the main balance lever, the Deserter patrol is far deadlier than the other forces, and the Sump squid dies in 5 or 6 actions, so monster difficulty needs a pass.
- [x] Playtest 03 (dungeon runs of 5 to 10 fights, healing supplies, reworked squid): Closed: healing supplies heal 4 HP and the starter kits carry 2 packs. Full soak with +1 enemy damage looks closest to right for the TSC. The reworked squid is a long fight (about 23 actions at a 12-HP body) that barely hurts the squad, so it was reworked: the body attacks for 2 in a closed lane and tentacles spawn only into empty lanes (decided).
- [x] Playtest 04 (3/4 soak, 4-HP healing supplies, squid that generates tentacles in empty lanes): as written, the squid is nearly unwinnable (about 19% wins) because a lane gets a new tentacle every squid cycle, so it needs a limit (for example, no spawning in lanes whose lane HP is already broken, which makes it a long but winnable fight). Four-HP healing supplies are far stronger than 2-HP ones (10-fight dungeons finish 90% with 2 packs, against 72%). 3/4 soak depends on rounding: rounded up it is almost full soak, rounded down it is much harsher, so soak needs whole numbers. Closed: soak uses whole numbers (3 per armor piece), healing supplies heal 4 HP, and the squid is capped.
- [x] Playtest 05 (chassis soak, 4-HP healing, revised squid): the new soak values (small chassis 1, large chassis 2, armor 2 per piece, since raised to 3) are much harsher than rounded-up 3/4 soak, and the squid is now a real threat. Decided: the squid generates one tentacle only into an empty lane that is not closed (at most 3 per lane), the free tentacle attack happens once with no chain, and the body attacks for 2 in a closed lane. How many Repair Packs does the TSC start with (2 for now)? The Pressmen Ration Pack and Concord Field Dressing now heal 4 HP too.
- [x] Playtests 06 to 08 (difficulty targets: about 85 to 90% of dungeons finished at 5 rooms and 60% at 10 for the starting kit, which the TSC meets with armor soak 3 per piece): Concord (4 units, 26 HP, armor 4 per piece, stun removal on a 4+) is on target with the modal Volley; Pressmen (4 crew, 40 HP, 10 soak, 2 Ration Packs) are at about 92% and 54%, and their healing is meant to be strengthened by a gang passive. Closed: Solidarity with 4 crew and the humanoid HP and soak numbers for Concord and Pressmen were accepted. The stun-counter fuel penalty and concussive damage against lane HP and bodies moved to the playtest leftovers item.
- [ ] Playtest leftovers: how much a rest room or clinic heals mid-expedition (the clinic building currently restores up to 5, 3 or 1 HP), the fuel penalty that stun counters put on enemies (not simulated), whether concussive damage should affect lane HP and monster bodies (working rule: ordinary damage), the TSC pistol-whip (it should be melee and draw a fight-back; not modeled), the Concord Medic as a later recruit, and Field Service healing parity for the TSC.

**Next steps**

1. The Hive Deck and encounters: floor generation, room cards, enemy forces, and how the deck grows as you explore.
2. Crafting numbers: pitch values, upgrade costs, pack odds and prices.
3. Claimed rooms, buildings and downtime: room traits, building requirements, income, and XP for members left behind.
4. Build a full starter faction and run a worked fight to test everything together.
