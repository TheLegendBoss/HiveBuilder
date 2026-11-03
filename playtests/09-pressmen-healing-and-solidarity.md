# Playtest 09: Pressmen healing passive and what Solidarity is worth

**Setup.** The Pressmen as agreed in playtest 08: four crew, 10 HP each (40 total), 10 total armor soak (Hammerhand 2, Ironback 4, Rivet Gunner 2, Furnace Medic 2), 29 cards with 2 Ration Packs. Same rules as before: lane HP 3/4/3, +1 enemy damage (fight-backs included), empty-only squid spawning, armor refills between fights, downed units rise at 1 HP. 300 dungeons per row against the five test forces mixed. Target: 85 to 90% at 5 rooms and 60% at 10. Simulator: `tools/faction_sim.py` (options added: `rest`, `rest_every`, `no_shoulder`, `no_grudge`).

**The healing passive is not defined yet,** so these rows are proxies for how strong it needs to be. "Rest" means a rest room that heals HP across the squad (the weakest units first) after every 5th fight, unless stated. "Ration Pack heals N" stands for a passive that makes healing supplies stronger.

```
Pressmen: HP 40 (10 each), soak 10 (2/4/2/2), 2 Ration Packs; healing passive tests
baseline (Ration Pack heals 4, no rest rooms)                  finish 5/8/10 rooms [92, 70, 54]
Ration Pack heals 5                                            finish 5/8/10 rooms [92, 78, 66]
Ration Pack heals 6                                            finish 5/8/10 rooms [98, 90, 81]
rest after every 5th fight heals 4 HP                          finish 5/8/10 rooms [92, 77, 56]
rest after every 5th fight heals 8 HP                          finish 5/8/10 rooms [92, 81, 67]
rest after every 5th fight heals 12 HP                         finish 5/8/10 rooms [92, 86, 72]
rest after every 3rd fight heals 4 HP                          finish 5/8/10 rooms [94, 80, 69]
Ration Pack heals 5 and rest every 5th fight heals 4           finish 5/8/10 rooms [92, 84, 69]
Ration Pack heals 6 and rest every 5th fight heals 8           finish 5/8/10 rooms [98, 96, 91]

What Solidarity is worth (baseline setup)
both parts on (baseline)                                       finish 5/8/10 rooms [92, 70, 54]
no Shoulder to Shoulder                                        finish 5/8/10 rooms [29, 6, 1]
no Union Grudge                                                finish 5/8/10 rooms [61, 20, 8]
neither                                                        finish 5/8/10 rooms [6, 0, 0]

Baseline: where do the Pressmen lose? (10-room dungeons)
  loss rate per fight: Scavver pack 5% of 535, Slag hauler 8% of 530, Sump sniper team 0% of 516, Sump squid 4% of 530, Deserter patrol 8% of 520

Baseline single fights
  Scavver pack       win 100%  actions  14.5  downed 0.03  HP left 33.8/40
  Slag hauler        win 100%  actions  13.9  downed 0.34  HP left 29.3/40
  Sump sniper team   win 100%  actions  12.0  downed 0.00  HP left 37.7/40
  Sump squid         win 100%  actions  21.9  downed 0.01  HP left 31.6/40
  Deserter patrol    win 100%  actions  16.7  downed 0.45  HP left 27.0/40
```

## Findings

1. **A modest passive reaches the target.** The baseline is 92% at 5 rooms and 54% at 10. Ration Packs healing 5 instead of 4 raises 10 rooms to 66%, and a rest worth 8 HP after every 5th fight gets 67%. Both together reach 84% at 8 rooms and 69% at 10. Healing 6 per pack is too strong (81% and 90% at 10 and 8 rooms) and takes the 5-room result to 98%.
2. **Solidarity is carrying the whole faction.** Without Shoulder to Shoulder (+1 soak per round and +1 melee damage when two Pressmen share a lane) the Pressmen finish 29% at 5 rooms and 1% at 10. Without Union Grudge, 61% and 8%. Without both, 6% and 0%. The numbers in playtests 08 and 09 therefore depend on the squad being able to pair up in a lane, and on the soak regeneration in particular, since total soak is only 10.
3. **Single fights are safe, attrition is the cost.** They win 100% of single fights against every test force. In 10-room dungeons they lose 5% of Scavver pack fights, 8% of Slag hauler, 4% of squid, 8% of Deserter patrol and 0% of Sump sniper, mostly from damage carried over from earlier fights.
4. **The squad's weak point is soak.** Playtest 08 already showed that soak moves the result far more than HP. Solidarity's regeneration is what keeps total soak useful.

## Open questions for the designer

- Is the healing passive a stronger supply heal (about 5 per pack), a stronger rest (about 8 HP per rest room), or both (84% at 8 rooms, 69% at 10)?
- Since Solidarity carries so much of the faction, should that load be spread (for example a smaller soak regeneration with a larger melee bonus)? And what should happen when a Pressman is alone in a lane or downed?
- Should the Pressmen later be allowed to start with a different squad size, given that the pairing rule needs at least four crew?
