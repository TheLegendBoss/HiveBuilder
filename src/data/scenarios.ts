import { gearCardSpecs, tscDeck } from './cards';
import type { EnemyActionDef, Scenario, UnitTemplate } from '../sim/types';
import { scaleForce, type Force } from './forces';
import { isSlotted } from './gear';

const plating = 'Light plating';

/** The TSC crew the paper-fight sims used. Numbers are placeholders from docs/design.md. */
export const tscSquad: UnitTemplate[] = [
  { name: 'Line A', hp: 5, builtin: 2, armor: 3, attrs: { force: 3, wits: 2, nerve: 2, tech: 2 }, gear: ['Autogun', plating, 'Line droid skill', 'Laser Sight'] },
  { name: 'Line B', hp: 5, builtin: 2, armor: 3, attrs: { force: 2, wits: 3, nerve: 2, tech: 2 }, gear: ['Autogun', plating, 'Line droid skill', 'Uplink Module'] },
  { name: 'Vanguard', hp: 6, builtin: 2, armor: 5, attrs: { force: 3, wits: 2, nerve: 3, tech: 2 }, gear: ['Combat shield', 'Vanguard skill', plating], weaponSlots: 3 },
  { name: 'Heavy', hp: 6, builtin: 2, armor: 3, attrs: { force: 4, wits: 2, nerve: 2, tech: 2 }, gear: ['Heavy autofire', 'Heavy arms skill', plating], ammo: 4, weaponSlots: 3 },
  { name: 'Repair', hp: 5, builtin: 2, armor: 3, attrs: { force: 2, wits: 2, nerve: 2, tech: 4 }, gear: ['Repair kit', 'Repair droid skill', plating] }
];

export const scavverActions: Record<string, EnemyActionDef> = {
  pot: { id: 'pot', name: 'Pot Shot', kind: 'attack', dmg: 2, melee: false, text: '2 damage to a unit in this lane (ranged)' },
  shiv: { id: 'shiv', name: 'Shiv', kind: 'attack', dmg: 1, melee: true, text: '1 damage (melee)' },
  bludgeon: { id: 'bludgeon', name: 'Bludgeon', kind: 'attack', dmg: 2, melee: true, text: '2 damage (melee)' },
  rally: { id: 'rally', name: 'Rally', kind: 'rally', dmg: 0, melee: false, text: 'Deploy a Scavver from the deck into this lane' }
};

const scavver: UnitTemplate = { name: 'Scavver', hp: 3, builtin: 0, armor: 0, gear: [], pattern: ['pot', 'shiv'] };
const chief: UnitTemplate = { name: 'Scavver Chief', hp: 5, builtin: 0, armor: 0, gear: [], pattern: ['rally', 'bludgeon'] };

/** Test battlefield from the design doc: lane HP 3 / 4 / 3, no modifiers. */
export const serviceCorridor = { name: 'Service corridor', laneHp: [3, 4, 3] as [number, number, number] };

export const tscVsScavvers: Scenario = {
  name: 'TSC crew vs Scavver pack',
  battlefield: serviceCorridor,
  squad: tscSquad,
  deck: tscDeck.map((c) => ({ name: c.name, count: c.count })),
  handSize: 7,
  enemyName: 'Scavver pack',
  enemyStart: [scavver, chief, scavver],
  enemyDeck: [scavver, scavver],
  enemyActions: scavverActions,
  setupRounds: 3,
  laneCap: null,
  cycleLimit: 2
};

/**
 * The deck a squad brings: only slotted gear feeds it. A card whose gear nobody in the squad carries stays out; cards
 * from role gear and supplies are always in.
 */
export function deckFor(squad: UnitTemplate[]): Array<{ name: string; count: number }> {
  const carried = new Set(squad.flatMap((u) => u.gear));
  const base = tscDeck.filter((c) => !isSlotted(c.source) || carried.has(c.source)).map((c) => ({ name: c.name, count: c.count }));
  const loot = gearCardSpecs.filter((s) => carried.has(s.def.source)).map((s) => ({ name: s.def.name, count: s.def.count }));
  return [...base, ...loot];
}

/** Same fight with the assumptions the Python paper sim used (2 bodies a lane, discard up to 3). */
export const tscVsScavversPaper: Scenario = { ...tscVsScavvers, laneCap: 2, cycleLimit: 3 };

/** The TSC crew against one tier-1 force. `step` is the tier step (0 is the CSV as written). */
export function tscVsForce(force: Force, step = 0, squad: UnitTemplate[] = tscSquad): Scenario {
  const f = scaleForce(force, step);
  return {
    ...tscVsScavvers,
    squad,
    deck: deckFor(squad),
    name: `TSC crew vs ${f.name}`,
    enemyName: f.name,
    enemyStart: f.start,
    startLanes: f.startLanes,
    surviveRounds: f.surviveRounds,
    bossTag: f.bossTag,
    linked: f.linked,
    enemyAlso: f.also,
    enemyDeck: f.deck,
    enemyActions: f.actions
  };
}
