import { cardDefs } from '../data/cards';
import type { GearAction } from '../data/gearActions';
import { nextRandom } from './rng';
import {
  attackLanes,
  hitLane,
  hitUnit,
  inLane,
  isLive,
  laneTarget,
  unitById,
  unitTarget
} from './state';
import type { Ev, Game, Target, Unit } from './types';

/** One way a card can be played with a given actor: its targets and an optional variant. */
export interface Variant {
  targets: Target[];
  variant?: string;
}

export interface CardRule {
  options(g: Game, actor: Unit | null): Variant[];
  apply(g: Game, actor: Unit | null, v: Variant, ev: Ev[]): void;
}

// ---------- helpers shared with basic gear actions

/** All the places a single attack can land: standing enemies, or a lane's HP once the lane is empty. */
export function attackTargets(g: Game, actor: Unit): Target[] {
  const out: Target[] = [];
  for (const L of attackLanes(g, actor)) {
    const en = inLane(g, 'E', L);
    if (en.length) for (const e of en) out.push(unitTarget(e));
    else if (g.laneHP.E[L]! > 0) out.push(laneTarget('E', L));
  }
  return out;
}

/** Sets of up to `most` enemies in one lane, or the lane itself when nobody stands in it. */
export function multiTargets(g: Game, actor: Unit, most: number): Target[][] {
  const out: Target[][] = [];
  for (const L of attackLanes(g, actor)) {
    const en = inLane(g, 'E', L);
    if (!en.length) {
      if (g.laneHP.E[L]! > 0) out.push([laneTarget('E', L)]);
      continue;
    }
    for (let i = 0; i < en.length; i++) {
      out.push([unitTarget(en[i]!)]);
      if (most >= 2) for (let j = i + 1; j < en.length; j++) out.push([unitTarget(en[i]!), unitTarget(en[j]!)]);
    }
  }
  return out;
}

function bonus(g: Game, actor: Unit, target: Unit | null, gear: string): number {
  let b = 0;
  if (target && g.focus === target.id) b += 1;
  if (actor.sight && gear === 'Autogun') b += 1;
  const lane = actor.lane!;
  const syncer = g.sync[lane];
  if (syncer !== null && syncer !== undefined && syncer !== actor.id) b += 1;
  return b;
}

/** Damage from a player unit, with Focus Fire, Sight Alignment and Sync added. */
export function strike(g: Game, actor: Unit, t: Target, base: number, gear: string, ev: Ev[]): void {
  if (t.k === 'unit') {
    const u = unitById(g, t.id);
    const d = base + bonus(g, actor, u, gear);
    ev.push({ t: 'log', text: `${actor.name} hits ${u.name} for ${d}` });
    ev.push({ t: 'strike', from: actor.id, to: t, melee: false, dmg: d });
    hitUnit(u, d, ev);
  } else {
    const d = base + bonus(g, actor, null, gear);
    ev.push({ t: 'log', text: `${actor.name} hits their lane ${t.lane + 1} for ${d}` });
    ev.push({ t: 'strike', from: actor.id, to: t, melee: false, dmg: d });
    hitLane(g, t.side, t.lane, d, ev);
  }
}

/** One-shot bonuses are used up by the next attack. */
export function spendBonuses(g: Game, actor: Unit, gear: string, ev: Ev[]): void {
  g.focus = null;
  if (actor.sight && gear === 'Autogun') {
    actor.sight = false;
    ev.push({ t: 'status', unit: actor.id, status: 'sight', on: false });
  }
  const lane = actor.lane!;
  const syncer = g.sync[lane];
  if (syncer !== null && syncer !== undefined && syncer !== actor.id) g.sync[lane] = null;
}

export function deployedFriends(g: Game, liveOnly = true): Unit[] {
  return g.units.filter((u) => u.side === 'P' && u.lane !== null && !u.dead && (!liveOnly || isLive(u)));
}

function restoreSoak(u: Unit, n: number, ev: Ev[]): void {
  const real = Math.min(n, u.armorMax - u.armor);
  u.armor += real;
  ev.push({ t: 'soakGain', unit: u.id, amount: real });
}

function heal(u: Unit, n: number, ev: Ev[]): void {
  const before = u.hp;
  u.hp = Math.min(u.maxHp, u.hp + n);
  const revived = u.downed && u.hp > 0;
  if (revived) u.downed = false;
  ev.push({ t: 'heal', unit: u.id, hp: u.hp - before, revived });
}

const soakNeeded = (u: Unit): boolean => u.armorMax - u.armor > 0;
const hurt = (u: Unit): boolean => u.hp < u.maxHp;

const one = (t: Target): Variant => ({ targets: [t] });

function soakRule(n: number, scope: 'lane' | 'any' | 'self'): CardRule {
  return {
    options(g, actor) {
      if (scope === 'self') return actor && soakNeeded(actor) ? [{ targets: [] }] : [];
      const pool = scope === 'lane' ? inLane(g, 'P', actor!.lane!) : deployedFriends(g);
      return pool.filter(soakNeeded).map((u) => one(unitTarget(u)));
    },
    apply(g, actor, v, ev) {
      const u = v.targets[0] ? unitById(g, (v.targets[0] as { id: number }).id) : actor!;
      restoreSoak(u, n, ev);
      ev.push({ t: 'log', text: `${u.name} regains ${n} soak` });
    }
  };
}

function healRule(n: number): CardRule {
  return {
    options(g) {
      return deployedFriends(g, false)
        .filter(hurt)
        .map((u) => one(unitTarget(u)));
    },
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      heal(u, n, ev);
      ev.push({ t: 'log', text: `${u.name} is patched for ${n}` });
    }
  };
}

function unitTargets(g: Game, actor: Unit, filter: (u: Unit) => boolean): Variant[] {
  const out: Variant[] = [];
  for (const L of attackLanes(g, actor)) for (const e of inLane(g, 'E', L)) if (filter(e)) out.push(one(unitTarget(e)));
  return out;
}

/** The ordered rules for every card in the TSC starter deck, keyed by card name. */
export const cardRules: Record<string, CardRule> = {
  'Burst Fire': {
    options: (g, a) => attackTargets(g, a!).map(one),
    apply(g, a, v, ev) {
      strike(g, a!, v.targets[0]!, 3, 'Autogun', ev);
      spendBonuses(g, a!, 'Autogun', ev);
    }
  },
  'Suppressing Fire': {
    options(g, a) {
      const out: Variant[] = [];
      for (const L of attackLanes(g, a!)) {
        if (inLane(g, 'E', L).length || g.laneHP.E[L]! > 0) out.push(one(laneTarget('E', L)));
      }
      return out;
    },
    apply(g, a, v, ev) {
      const t = v.targets[0] as { side: 'E'; lane: number };
      const en = inLane(g, 'E', t.lane);
      if (en.length) {
        for (const e of en) {
          strike(g, a!, unitTarget(e), 1, 'Autogun', ev);
          if (!e.dead) {
            e.suppressed = 2;
            ev.push({ t: 'status', unit: e.id, status: 'suppressed', on: true });
          }
        }
      } else strike(g, a!, laneTarget('E', t.lane), 1, 'Autogun', ev);
      spendBonuses(g, a!, 'Autogun', ev);
    }
  },
  Brace: soakRule(2, 'lane'),
  'Focus Fire': {
    options: (g, a) => unitTargets(g, a!, () => true),
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      g.focus = u.id;
      ev.push({ t: 'log', text: `Focus on ${u.name}: the next attack against it deals +1` });
    }
  },
  'Shield Up': soakRule(3, 'self'),
  Counter: {
    options: (_g, a) => (a && !a.counter ? [{ targets: [] }] : []),
    apply(_g, a, _v, ev) {
      a!.counter = true;
      ev.push({ t: 'status', unit: a!.id, status: 'counter', on: true });
      ev.push({ t: 'log', text: `${a!.name} braces to counter` });
    }
  },
  Bulwark: {
    options: (g, a) => (g.bulwark[a!.lane!] === null ? [{ targets: [] }] : []),
    apply(g, a, _v, ev) {
      g.bulwark[a!.lane!] = a!.id;
      ev.push({ t: 'log', text: `${a!.name} stands guard: the next attack on a squadmate here hits them` });
    }
  },
  'Sustained Fire': {
    options: (g, a) => multiTargets(g, a!, 2).map((targets) => ({ targets })),
    apply(g, a, v, ev) {
      for (const t of v.targets) strike(g, a!, t, 2, 'Heavy autofire', ev);
      spendBonuses(g, a!, 'Heavy autofire', ev);
    }
  },
  'Pin Down': {
    options: (g, a) => unitTargets(g, a!, (e) => !e.stunned),
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      u.stunned = true;
      ev.push({ t: 'status', unit: u.id, status: 'stunned', on: true });
      ev.push({ t: 'log', text: `${u.name} is pinned down and loses its next action` });
    }
  },
  Overdrive: {
    options: () => [{ targets: [] }],
    apply(g, _a, _v, ev) {
      g.discount += 1;
      ev.push({ t: 'log', text: 'Overdrive: the next gear action costs 1 fuel less' });
    }
  },
  'Jury-Rig': soakRule(2, 'any'),
  'Field Fix': {
    options(g) {
      const out: Variant[] = [];
      for (const u of deployedFriends(g)) {
        if (u.stunned) out.push({ targets: [unitTarget(u)], variant: 'stunned' });
        if (u.exposed) out.push({ targets: [unitTarget(u)], variant: 'exposed' });
        if (u.suppressed > 0) out.push({ targets: [unitTarget(u)], variant: 'suppressed' });
      }
      return out;
    },
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      if (v.variant === 'stunned') u.stunned = false;
      else if (v.variant === 'exposed') u.exposed = false;
      else u.suppressed = 0;
      ev.push({ t: 'status', unit: u.id, status: v.variant as 'stunned' | 'exposed' | 'suppressed', on: false });
      ev.push({ t: 'log', text: `${u.name} is cleared of ${v.variant}` });
    }
  },
  Patch: healRule(2),
  'Ammo Crate': {
    options: (g) =>
      deployedFriends(g)
        .filter((u) => u.ammoMax > 0 && u.ammo < u.ammoMax)
        .map((u) => one(unitTarget(u))),
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      const real = Math.min(2, u.ammoMax - u.ammo);
      u.ammo += real;
      ev.push({ t: 'ammoGain', unit: u.id, amount: real });
      ev.push({ t: 'log', text: `${u.name} reloads ${real}` });
    }
  },
  'Repair Parts': soakRule(3, 'any'),
  'Repair Pack': healRule(4),
  'Sight Alignment': {
    options: (_g, a) => (a && !a.sight ? [{ targets: [] }] : []),
    apply(_g, a, _v, ev) {
      a!.sight = true;
      ev.push({ t: 'status', unit: a!.id, status: 'sight', on: true });
      ev.push({ t: 'log', text: `${a!.name} lines up the sight: next shot +1 damage and 1 fuel less` });
    }
  },
  'Paint Target': {
    options: (g, a) => unitTargets(g, a!, (e) => !e.exposed),
    apply(g, _a, v, ev) {
      const u = unitById(g, (v.targets[0] as { id: number }).id);
      u.exposed = true;
      ev.push({ t: 'status', unit: u.id, status: 'exposed', on: true });
      ev.push({ t: 'log', text: `${u.name} is painted: the next hit deals +1` });
    }
  },
  'Data Burst': {
    options: () => [
      { targets: [], variant: 'high' },
      { targets: [], variant: 'low' }
    ],
    apply(g, _a, v, ev) {
      // The top of the results deck is the end of the array. Reorder the top three.
      const top = g.results.splice(-3).sort((x, y) => x - y);
      if (v.variant === 'low') top.reverse();
      g.results.push(...top);
      ev.push({ t: 'results', cards: [...top].reverse() });
      ev.push({ t: 'log', text: `Data Burst: next results are ${[...top].reverse().join(', ')}` });
    }
  },
  Sync: {
    options: (g, a) => (g.sync[a!.lane!] === null ? [{ targets: [] }] : []),
    apply(g, a, _v, ev) {
      g.sync[a!.lane!] = a!.id;
      ev.push({ t: 'log', text: `${a!.name} syncs the lane: a squadmate's next attack here deals +1` });
    }
  }
};

export function drawResult(g: Game): number {
  if (g.results.length === 0) {
    g.results = Array.from({ length: 52 }, (_, i) => (i % 13) + 1);
    for (let i = g.results.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(g) * (i + 1));
      const tmp = g.results[i]!;
      g.results[i] = g.results[j]!;
      g.results[j] = tmp;
    }
  }
  return g.results.pop() as number;
}

/** Does this card's source need a unit carrying that gear? Supplies do not. */
export function needsActor(cardName: string): boolean {
  return cardDefs[cardName]?.sourceType !== 'supply';
}

export function sourceOf(cardName: string): string {
  return cardDefs[cardName]?.source ?? '';
}

// ---------- basic gear actions

/** Low, mid or high result from the top of the results deck (A to 5, 6 to 9, 10 to K). */
function resultBand(v: number): 0 | 1 | 2 {
  return v <= 5 ? 0 : v <= 9 ? 1 : 2;
}

/** Every way a basic gear action can be aimed right now. An empty target list means it needs none. */
export function gearTargets(g: Game, actor: Unit, ga: GearAction): Target[][] {
  if (ga.soak) return soakNeeded(actor) ? [[]] : [];
  if (ga.heal) return inLane(g, 'P', actor.lane!, false).filter(hurt).map((u) => [unitTarget(u)]);
  if (ga.area) {
    const out: Target[][] = [];
    for (const L of attackLanes(g, actor)) {
      if (inLane(g, 'E', L).length || g.laneHP.E[L]! > 0) out.push([laneTarget('E', L)]);
    }
    return out;
  }
  return ga.targets === 1 ? attackTargets(g, actor).map((t) => [t]) : multiTargets(g, actor, ga.targets);
}

/** A hit that ignores up to `pierce` points of the target's soak. */
function pierceHit(u: Unit, d: number, pierce: number, ev: Ev[]): void {
  const fromArmor = Math.min(pierce, u.armor);
  const fromBuilt = Math.min(pierce - fromArmor, u.builtin);
  u.armor -= fromArmor;
  u.builtin -= fromBuilt;
  hitUnit(u, d, ev);
  u.armor += fromArmor;
  u.builtin += fromBuilt;
}

/** Do a basic gear action: restore, heal, or damage rolled from the results deck, with riders. */
export function applyGearAction(g: Game, actor: Unit, ga: GearAction, targets: Target[], ev: Ev[]): void {
  if (ga.soak) {
    restoreSoak(actor, ga.soak, ev);
    ev.push({ t: 'log', text: `${actor.name} regains ${ga.soak} soak` });
    return;
  }
  if (ga.heal) {
    const u = unitById(g, (targets[0] as { id: number }).id);
    heal(u, ga.heal, ev);
    ev.push({ t: 'log', text: `${u.name} is patched for ${ga.heal}` });
    return;
  }
  let base = ga.dmg;
  if (ga.dmgMax !== undefined && ga.dmgMax > ga.dmg) {
    const v = drawResult(g);
    const band = resultBand(v);
    base = band === 0 ? ga.dmg : band === 2 ? ga.dmgMax : Math.round((ga.dmg + ga.dmgMax) / 2);
    ev.push({ t: 'log', text: `${ga.name}: a ${v} on the results deck, ${band === 0 ? 'low' : band === 2 ? 'high' : 'mid'}` });
  }
  const riders = ga.riders && (!ga.riderSolo || targets.length === 1) ? ga.riders : [];
  const hit = (t: Target): void => {
    if (t.k === 'unit' && ga.pierce) {
      const u = unitById(g, t.id);
      const d = base + bonus(g, actor, u, ga.gear);
      ev.push({ t: 'log', text: `${actor.name} hits ${u.name} for ${d}, ignoring ${ga.pierce} soak` });
      ev.push({ t: 'strike', from: actor.id, to: t, melee: false, dmg: d });
      pierceHit(u, d, ga.pierce, ev);
    } else strike(g, actor, t, base, ga.gear, ev);
    if (t.k !== 'unit') return;
    const u = unitById(g, t.id);
    if (u.dead) return;
    for (const r of riders) {
      if (r === 'stunned' && !u.stunned) u.stunned = true;
      else if (r === 'exposed' && !u.exposed) u.exposed = true;
      else if (r === 'suppressed') u.suppressed = 2;
      else continue;
      ev.push({ t: 'status', unit: u.id, status: r, on: true });
    }
  };
  for (const t of targets) {
    if (t.k === 'lane' && ga.area) {
      const en = inLane(g, 'E', t.lane);
      if (en.length) for (const e of en) hit(unitTarget(e));
      else hit(t);
    } else hit(t);
  }
  spendBonuses(g, actor, ga.gear, ev);
}
