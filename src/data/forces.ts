import type { EnemyActionDef, UnitTemplate } from '../sim/types';

/**
 * Tier-1 enemy forces from data/tier1_patrols_new.csv, plus the five control room bosses from docs/design.md.
 * The Ash cult cell is left out: its Dread Chant adds stress, and droids have no stress track.
 *
 * Start layout: `start` goes one unit per lane (lanes 1, 2, 3) over the three setup rounds,
 * `also` lands with the first unit of its lane, `deck` waits for rally and breed actions.
 */
export interface Force {
  id: string;
  name: string;
  /** the CSV marks this force as growing +1 HP and +1 damage per tier step */
  tiered: boolean;
  /** a control room boss: grows +2 HP and +1 damage per two tier steps */
  boss?: boolean;
  start: UnitTemplate[];
  /** lane index for each start unit (default 0, 1, 2) */
  startLanes?: number[];
  /** win once this many rounds have passed after setup */
  surviveRounds?: number;
  /** win when every enemy with this tag is dead */
  bossTag?: string;
  linked?: Array<{ leader: string; followers: string }>;
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

// --- Pipe gang ------------------------------------------------------------------------------
const pipeHand: UnitTemplate = { name: 'Pipe Hand', hp: 4, builtin: 0, armor: 0, gear: [], pattern: ['swing', 'brace'] };
const torchWelder: UnitTemplate = { name: 'Torch Welder', hp: 3, builtin: 0, armor: 0, gear: [], pattern: ['torch', 'flare'] };

export const pipeGang: Force = {
  id: 'pipes',
  name: 'Pipe gang',
  tiered: false,
  start: [pipeHand, torchWelder, pipeHand],
  also: [],
  deck: [pipeHand, torchWelder],
  actions: {
    swing: atk('swing', 'Pipe Swing', 2, true, '2 damage (melee)'),
    brace: { id: 'brace', name: 'Brace', kind: 'buff', dmg: 0, melee: false, text: 'Gain 1 soak', soak: 1, scope: 'self', soakCap: 3 },
    torch: atk('torch', 'Torch', 1, true, '1 damage (melee) and Burning for 2 rounds', { burn: 2 }),
    flare: atk('flare', 'Flare', 0, false, 'Burning for 2 rounds on a unit in this lane. Wind-up 1', { burn: 2, windup: true })
  },
  reward: { loot: 1, eagles: 3 }
};

export const forces: Force[] = [stragglerBand, tollGang, ratSwarm, pipeGang];

// --- Control room bosses (tier 1 numbers; see "Sandbox boss numbers" in docs/design.md) ---------------
const dynamo: UnitTemplate = {
  name: 'Runaway Dynamo', hp: 20, builtin: 2, armor: 0, gear: [], tags: ['boss'],
  pattern: ['arc', 'arc', 'arc', 'overload', 'arc', 'overload']
};

export const runawayDynamo: Force = {
  id: 'dynamo',
  name: 'Runaway Dynamo',
  tiered: false,
  boss: true,
  start: [dynamo],
  startLanes: [1],
  surviveRounds: 6,
  bossTag: 'boss',
  also: [],
  deck: [],
  actions: {
    arc: atk('arc', 'Arc Surge', 2, false, '2 damage to every unit in the lane with the most squad members', { area: true }),
    overload: atk('overload', 'Overload', 3, false, '3 damage to every unit in one lane. Wind-up 1', { area: true, windup: true })
  },
  reward: { loot: 1, eagles: 5 }
};

const foreman: UnitTemplate = { name: 'Foundry Foreman', hp: 10, builtin: 1, armor: 0, gear: [], tags: ['boss'], pattern: ['slag', 'pour'] };
const slagHand: UnitTemplate = { name: 'Pipe Hand', hp: 6, builtin: 0, armor: 0, gear: [], pattern: ['hand'] };

export const foundryForeman: Force = {
  id: 'foreman',
  name: 'Foundry Foreman',
  tiered: false,
  boss: true,
  start: [slagHand, foreman, slagHand],
  bossTag: 'boss',
  also: [],
  deck: [slagHand],
  actions: {
    slag: atk('slag', 'Slag Hammer', 2, true, '2 damage (melee) and Burning for 2 rounds', { burn: 2 }),
    pour: atk('pour', 'Pour', 0, false, 'Burning for 2 rounds on every unit in a lane. Wind-up 1', { area: true, burn: 2, windup: true }),
    hand: atk('hand', 'Pipe Swing', 2, true, '2 damage (melee) and Burning for 1 round', { burn: 1 })
  },
  reward: { loot: 1, eagles: 5 }
};

const warden: UnitTemplate = { name: 'The Warden', hp: 12, builtin: 1, armor: 0, gear: [], tags: ['boss'], pattern: ['baton', 'lockdown'] };
const cellGuard: UnitTemplate = { name: 'Cell Guard', hp: 5, builtin: 1, armor: 0, gear: [], pattern: ['cosh'] };

export const theWarden: Force = {
  id: 'warden',
  name: 'The Warden',
  tiered: false,
  boss: true,
  start: [cellGuard, warden, cellGuard],
  bossTag: 'boss',
  also: [],
  deck: [],
  actions: {
    baton: atk('baton', 'Shock Baton', 2, true, '2 damage (melee) and Stun a unit in this lane', { stun: true }),
    lockdown: atk('lockdown', 'Lockdown', 0, false, 'Stun one unit in any lane. Wind-up 1', { stun: true, anyLane: true, windup: true }),
    cosh: atk('cosh', 'Cosh', 2, true, '2 damage (melee)')
  },
  reward: { loot: 1, eagles: 5 }
};

const broodQueen: UnitTemplate = { name: 'Brood Queen', hp: 12, builtin: 0, armor: 0, gear: [], tags: ['boss', 'queen'], pattern: ['rend', 'brood'] };
const broodRatB: UnitTemplate = { name: 'Rat', hp: 1, builtin: 0, armor: 0, gear: [], tags: ['brood'], pattern: ['gnaw'] };

export const broodQueenForce: Force = {
  id: 'queen',
  name: 'Brood Queen',
  tiered: false,
  boss: true,
  start: [broodRatB, broodQueen, broodRatB],
  bossTag: 'boss',
  linked: [{ leader: 'queen', followers: 'brood' }],
  also: [{ unit: broodRatB, lane: 0 }, { unit: broodRatB, lane: 2 }],
  deck: strags(8, broodRatB),
  actions: {
    rend: atk('rend', 'Rend', 3, true, '3 damage (melee)'),
    brood: { id: 'brood', name: 'Brood', kind: 'rally', dmg: 0, melee: false, text: 'Deploy 2 Rats into this lane (at most 6 per lane)', cap: 6, count: 2 },
    gnaw: atk('gnaw', 'Gnaw', 1, true, '1 damage (melee)')
  },
  reward: { loot: 1, eagles: 5 }
};

export const bosses: Force[] = [runawayDynamo, foundryForeman, theWarden, broodQueenForce];

/**
 * Tier step 0 is the CSV as written. Each step adds 1 HP to every unit and 1 damage to every attack.
 * Only the Straggler band is tiered in the CSV; the sandbox scales all of them so the ramp has teeth
 * (working rule, see decisions.md).
 */
/** Patrol growth per tier step: +1 HP, and +1 damage every `dmgEvery` steps (1 is the CSV's +1 and +1). Working. */
export const growth = { dmgEvery: 2 };

/**
 * Pooled-action tuning. The squad gets one action per body, so a patrol brings more bodies and hits harder, rather than
 * just soaking more HP (which only makes fights longer). `extraBodies` copies of the weakest starting unit land in the
 * outer lanes first; `dmgMult` and `hpMult` apply to every force after tier growth. Patrols only, bosses stand alone.
 */
export const pooled = { extraBodies: 1, dmgMult: 1.5, hpMult: 1 };

const EXTRA_LANES = [0, 2, 1, 0, 2, 1];

export function scaleForce(f: Force, step: number): Force {
  const grown = growForce(f, step);
  if (f.boss) return grown;
  const hp = (u: UnitTemplate): UnitTemplate => (pooled.hpMult === 1 ? u : { ...u, hp: Math.max(1, Math.round(u.hp * pooled.hpMult)) });
  const actions: Record<string, EnemyActionDef> = {};
  for (const [k, a] of Object.entries(grown.actions)) {
    actions[k] = a.kind === 'attack' && a.dmg > 0 && pooled.dmgMult !== 1 ? { ...a, dmg: Math.max(1, Math.round(a.dmg * pooled.dmgMult)) } : a;
  }
  const weakest = hp(grown.start[0]!);
  const extra = Array.from({ length: pooled.extraBodies }, (_, i) => ({ unit: { ...weakest }, lane: EXTRA_LANES[i % EXTRA_LANES.length]! }));
  return {
    ...grown,
    start: grown.start.map(hp) as Force['start'],
    also: [...grown.also.map((x) => ({ ...x, unit: hp(x.unit) })), ...extra],
    deck: grown.deck.map(hp),
    actions
  };
}

function growForce(f: Force, step: number): Force {
  if (step <= 0) return f;
  // a boss grows +2 HP and +1 damage per two tier steps; patrols grow +1 and +1 per step
  const hpUp = f.boss ? 2 * Math.floor(step / 2) : step;
  const dmgUp = f.boss ? Math.floor(step / 2) : Math.floor((step + growth.dmgEvery - 1) / growth.dmgEvery);
  const t = (u: UnitTemplate): UnitTemplate => ({ ...u, hp: u.hp + hpUp });
  const actions: Record<string, EnemyActionDef> = {};
  for (const [k, a] of Object.entries(f.actions)) actions[k] = a.kind === 'attack' && a.dmg > 0 ? { ...a, dmg: a.dmg + dmgUp } : a;
  return {
    ...f,
    start: f.start.map(t) as Force['start'],
    also: f.also.map((x) => ({ ...x, unit: t(x.unit) })),
    deck: f.deck.map(t),
    actions
  };
}
