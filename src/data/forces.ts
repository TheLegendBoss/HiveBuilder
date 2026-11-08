import type { EnemyActionDef, UnitTemplate } from '../sim/types';

/**
 * Tier-1 enemy forces from data/tier1_patrols_new.csv. Pipe gang and Ash cult cell are left out
 * until Burning and stress exist in the sim.
 *
 * Start layout: `start` goes one unit per lane (lanes 1, 2, 3) over the three setup rounds,
 * `also` lands with the first unit of its lane, `deck` waits for rally and breed actions.
 */
export interface Force {
  id: string;
  name: string;
  /** the CSV marks this force as growing +1 HP and +1 damage per tier step */
  tiered: boolean;
  start: [UnitTemplate, UnitTemplate, UnitTemplate];
  also: Array<{ unit: UnitTemplate; lane: number }>;
  deck: UnitTemplate[];
  actions: Record<string, EnemyActionDef>;
  reward: { loot: number; eagles: number };
}

const atk = (id: string, name: string, dmg: number, melee: boolean, text: string, extra: Partial<EnemyActionDef> = {}): EnemyActionDef => ({
  id, name, kind: 'attack', dmg, melee, text, ...extra
});

const strags = (n: number, t: UnitTemplate): UnitTemplate[] => Array.from({ length: n }, () => t);

// --- Straggler band -------------------------------------------------------------------------
const straggler: UnitTemplate = { name: 'Straggler', hp: 4, builtin: 0, armor: 0, gear: [], pattern: ['rifle', 'cover'], tags: ['straggler'] };
const sergeant: UnitTemplate = { name: 'Straggler Sergeant', hp: 5, builtin: 0, armor: 0, gear: [], pattern: ['sidearm', 'digin'] };

export const stragglerBand: Force = {
  id: 'stragglers',
  name: 'Straggler band',
  tiered: true,
  start: [straggler, sergeant, straggler],
  also: [],
  deck: strags(1, straggler),
  actions: {
    rifle: atk('rifle', 'Rifle', 2, false, '2 damage to a unit in this lane (ranged)'),
    sidearm: atk('sidearm', 'Sidearm', 2, false, '2 damage to a unit in this lane (ranged)'),
    cover: { id: 'cover', name: 'Take Cover', kind: 'buff', dmg: 0, melee: false, text: 'Gain 1 soak', soak: 1, scope: 'self', soakCap: 3 },
    digin: { id: 'digin', name: 'Dig In', kind: 'buff', dmg: 0, melee: false, text: 'A Straggler in this lane gains 2 soak', soak: 2, scope: 'laneTag', tag: 'straggler', soakCap: 3 }
  },
  reward: { loot: 1, eagles: 2 }
};

// --- Toll gang ------------------------------------------------------------------------------
const thug: UnitTemplate = { name: 'Thug', hp: 4, builtin: 1, armor: 0, gear: [], pattern: ['cosh', 'hold'] };
const tollBoss: UnitTemplate = { name: 'Toll Boss', hp: 6, builtin: 0, armor: 0, gear: [], pattern: ['shakedown', 'boys'] };

export const tollGang: Force = {
  id: 'toll',
  name: 'Toll gang',
  tiered: false,
  start: [thug, tollBoss, thug],
  also: [],
  deck: strags(1, thug),
  actions: {
    cosh: atk('cosh', 'Cosh', 2, true, '2 damage (melee)'),
    hold: { id: 'hold', name: 'Hold the Line', kind: 'buff', dmg: 0, melee: false, text: 'Gain 1 soak', soak: 1, scope: 'self', soakCap: 3 },
    shakedown: atk('shakedown', 'Shakedown', 1, true, '1 damage (melee) and Suppressed for 2 rounds', { suppress: 2 }),
    boys: { id: 'boys', name: 'Call the Boys', kind: 'rally', dmg: 0, melee: false, text: 'Deploy a Thug from the deck into this lane' }
  },
  reward: { loot: 1, eagles: 4 }
};

// --- Rat swarm ------------------------------------------------------------------------------
const rat: UnitTemplate = { name: 'Rat', hp: 1, builtin: 0, armor: 0, gear: [], pattern: ['gnaw1'] };
const broodRat: UnitTemplate = { name: 'Brood Rat', hp: 5, builtin: 0, armor: 0, gear: [], pattern: ['gnaw2', 'breed'] };

export const ratSwarm: Force = {
  id: 'rats',
  name: 'Rat swarm',
  tiered: false,
  start: [rat, broodRat, rat],
  also: [{ unit: rat, lane: 0 }, { unit: rat, lane: 2 }],
  deck: strags(2, rat),
  actions: {
    gnaw1: atk('gnaw1', 'Gnaw', 1, true, '1 damage (melee)'),
    gnaw2: atk('gnaw2', 'Gnaw', 2, true, '2 damage (melee)'),
    breed: { id: 'breed', name: 'Breed', kind: 'rally', dmg: 0, melee: false, text: 'Deploy a Rat into this lane (at most 4 per lane)', cap: 4 }
  },
  reward: { loot: 1, eagles: 1 }
};

export const forces: Force[] = [stragglerBand, tollGang, ratSwarm];

/**
 * Tier step 0 is the CSV as written. Each step adds 1 HP to every unit and 1 damage to every attack.
 * Only the Straggler band is tiered in the CSV; the sandbox scales all of them so the ramp has teeth
 * (working rule, see decisions.md).
 */
export function scaleForce(f: Force, step: number): Force {
  if (step <= 0) return f;
  const t = (u: UnitTemplate): UnitTemplate => ({ ...u, hp: u.hp + step });
  const actions: Record<string, EnemyActionDef> = {};
  for (const [k, a] of Object.entries(f.actions)) actions[k] = a.kind === 'attack' ? { ...a, dmg: a.dmg + step } : a;
  return {
    ...f,
    start: f.start.map(t) as Force['start'],
    also: f.also.map((x) => ({ ...x, unit: t(x.unit) })),
    deck: f.deck.map(t),
    actions
  };
}
