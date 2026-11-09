import {
  adjacent,
  bodiesInLane,
  checkResult,
  deployUnit,
  endRound,
  hitLane,
  hitUnit,
  inLane,
  laneHasRoom,
  laneTarget,
  unitById,
  unitTarget
} from './state';
import type { EnemyActionDef, Ev, EnemyPlan, Game, Target, Unit } from './types';

function pickVictim(g: Game, lane: number): { target: Target; redirected: boolean } | null {
  const units = inLane(g, 'P', lane);
  if (units.length) {
    const sorted = [...units].sort((a, b) => a.hp - b.hp || a.armor + a.builtin - (b.armor + b.builtin) || a.arrived - b.arrived);
    let t = sorted[0]!;
    let redirected = false;
    const guard = g.bulwark[lane];
    if (guard !== null && guard !== undefined && guard !== t.id) {
      const v = units.find((x) => x.id === guard);
      if (v) {
        t = v;
        redirected = true;
      }
    }
    return { target: unitTarget(t), redirected };
  }
  if (g.laneHP.P[lane]! > 0) return { target: laneTarget('P', lane), redirected: false };
  return null;
}

/** Where an enemy unit's attack lands: its own lane, then (once its lane is captured) the neighbours. */
function victimFor(g: Game, u: Unit): { target: Target; redirected: boolean } | null {
  const own = pickVictim(g, u.lane!);
  if (own) return own;
  if (g.laneHP.P[u.lane!] !== 0) return null;
  for (const L of adjacent(u.lane!)) {
    const v = pickVictim(g, L);
    if (v) return v;
  }
  return null;
}

/** The lane with the most live squad members: where an area attack lands. Ties go to the lowest lane. */
function crowdedLane(g: Game): number | null {
  let best: number | null = null;
  let most = 0;
  for (let L = 0; L < 3; L++) {
    const n = inLane(g, 'P', L).length;
    if (n > most) {
      most = n;
      best = L;
    }
  }
  return best;
}

/** The squad member a reaching attack picks: the healthiest live unit that is not already stunned. */
function anyLaneVictim(g: Game): Unit | null {
  const pool = g.units.filter((u) => u.side === 'P' && u.lane !== null && !u.downed && !u.dead);
  const open = pool.filter((u) => !u.stunned);
  const from = open.length ? open : pool;
  from.sort((a, b) => b.hp - a.hp || a.arrived - b.arrived);
  return from[0] ?? null;
}

function canBreed(g: Game, u: Unit, def: EnemyActionDef): boolean {
  if (g.enemyDeck.length === 0) return false;
  return def.cap !== undefined ? bodiesInLane(g, 'E', u.lane!) < def.cap : laneHasRoom(g, 'E', u.lane!);
}

/** Who gains the soak from a buff, or null when nobody can use it. */
function buffTarget(g: Game, u: Unit, def: EnemyActionDef): Unit | null {
  const room = (x: Unit): boolean => def.soakCap === undefined || x.builtin < def.soakCap;
  if (def.scope === 'laneTag') {
    const pool = inLane(g, 'E', u.lane!).filter((x) => x.tags.includes(def.tag ?? '') && room(x));
    pool.sort((a, b) => a.hp - b.hp || a.builtin - b.builtin || a.arrived - b.arrived);
    return pool[0] ?? null;
  }
  return room(u) ? u : null;
}

function enemyUnitsInOrder(g: Game): Unit[] {
  const out: Unit[] = [];
  for (let L = 0; L < 3; L++) out.push(...inLane(g, 'E', L));
  return out;
}

/** Burning and Stun riders on a hit. A stun cancels any wind-up and, on a squad member, outlasts one round. */
function applyEffects(t: Unit, burn: number | undefined, stun: boolean | undefined, ev: Ev[]): void {
  if (t.downed || t.dead) return;
  if (burn && burn > t.burning) {
    t.burning = burn;
    ev.push({ t: 'status', unit: t.id, status: 'burning', on: true });
    ev.push({ t: 'log', text: `${t.name} catches fire for ${burn} rounds` });
  }
  if (stun && !t.stunned) {
    t.stunned = true;
    t.stunWait = t.side === 'P' ? 1 : 0;
    t.charging = null;
    ev.push({ t: 'status', unit: t.id, status: 'stunned', on: true });
    ev.push({ t: 'log', text: `${t.name} is stunned` });
  }
}

/** What the enemy will do on its next action. Nothing here changes the game. */
export function enemyPlan(g: Game): EnemyPlan {
  const pass = (text: string): EnemyPlan => ({
    kind: 'pass', unit: null, name: 'Pass', dmg: 0, melee: false, victim: null, redirected: false,
    lane: null, nextPtr: g.eptr, nextPi: null, text
  });
  if (g.round <= g.scenario.setupRounds) {
    const id = g.enemyStart[g.round - 1];
    if (id === undefined) return pass('Nothing left to deploy');
    const u = unitById(g, id);
    const lane = g.scenario.startLanes?.[g.round - 1] ?? g.round - 1;
    return {
      kind: 'deploy', unit: u.id, name: 'Deploy', dmg: 0, melee: false, victim: null, redirected: false,
      lane, nextPtr: g.eptr, nextPi: null, text: `${u.name} takes lane ${lane + 1}`
    };
  }
  const units = enemyUnitsInOrder(g);
  const n = units.length;
  if (n === 0) return pass('No units left to act');
  for (let k = 0; k < n; k++) {
    const u = units[(g.eptr + k) % n]!;
    const ptr = (g.eptr + k + 1) % n;
    if (u.stunned) {
      return {
        kind: 'stunned', unit: u.id, name: 'Stunned', dmg: 0, melee: false, victim: null, redirected: false,
        lane: u.lane, nextPtr: ptr, nextPi: null, text: `${u.name} loses its action`
      };
    }
    for (let j = 0; j < u.pattern.length; j++) {
      const id = u.pattern[(u.pi + j) % u.pattern.length]!;
      const def = g.scenario.enemyActions[id]!;
      const nextPi = (u.pi + j + 1) % u.pattern.length;
      if (def.kind === 'rally') {
        if (!canBreed(g, u, def)) continue;
        return {
          kind: 'rally', unit: u.id, name: def.name, dmg: 0, melee: false, victim: null, redirected: false,
          lane: u.lane, nextPtr: ptr, nextPi, text: def.text
        };
      }
      if (def.kind === 'buff') {
        const ally = buffTarget(g, u, def);
        if (!ally) continue;
        return {
          kind: 'buff', unit: u.id, name: def.name, dmg: 0, melee: false, victim: null, redirected: false,
          ally: ally.id, soak: def.soak ?? 1, lane: u.lane, nextPtr: ptr, nextPi, text: def.text
        };
      }
      if (def.windup && u.charging !== def.id) {
        return {
          kind: 'windup', unit: u.id, name: def.name, dmg: def.dmg, melee: def.melee, victim: null, redirected: false,
          lane: u.lane, nextPtr: ptr, nextPi: u.pi, text: `${u.name} winds up ${def.name}`
        };
      }
      if (def.area) {
        const lane = crowdedLane(g);
        return {
          kind: 'attack', unit: u.id, name: def.name, dmg: def.dmg, melee: def.melee, burn: def.burn, stun: def.stun,
          victim: null, areaLane: lane, redirected: false, lane: u.lane, nextPtr: ptr, nextPi, text: def.text
        };
      }
      if (def.anyLane) {
        const t = anyLaneVictim(g);
        return {
          kind: 'attack', unit: u.id, name: def.name, dmg: def.dmg, melee: def.melee, burn: def.burn, stun: def.stun,
          victim: t ? unitTarget(t) : null, redirected: false, lane: u.lane, nextPtr: ptr, nextPi, text: def.text
        };
      }
      const v = victimFor(g, u);
      return {
        kind: 'attack', unit: u.id, name: def.name, dmg: def.dmg, melee: def.melee, suppress: def.suppress, burn: def.burn, stun: def.stun,
        victim: v?.target ?? null, redirected: v?.redirected ?? false, lane: u.lane, nextPtr: ptr, nextPi, text: def.text
      };
    }
  }
  return pass('Nothing legal to do');
}

/** Run the enemy's action, then close the round. */
export function enemyAct(g: Game): Ev[] {
  const ev: Ev[] = [];
  if (g.result || g.turn !== 'E') return ev;
  const plan = enemyPlan(g);
  const u = plan.unit !== null ? unitById(g, plan.unit) : null;
  g.eptr = plan.nextPtr;
  if (u && plan.nextPi !== null) u.pi = plan.nextPi;

  switch (plan.kind) {
    case 'deploy':
      deployUnit(g, u!, plan.lane!, ev);
      ev.push({ t: 'log', text: `${u!.name} deploys to lane ${plan.lane! + 1}` });
      for (const a of g.enemyAlso) {
        if (a.lane !== plan.lane) continue;
        const extra = unitById(g, a.id);
        deployUnit(g, extra, a.lane, ev);
        ev.push({ t: 'log', text: `${extra.name} deploys to lane ${a.lane + 1}` });
      }
      break;
    case 'stunned':
      u!.stunned = false;
      u!.charging = null;
      ev.push({ t: 'status', unit: u!.id, status: 'stunned', on: false });
      ev.push({ t: 'intentSkip', unit: u!.id });
      ev.push({ t: 'log', text: `${u!.name} is stunned and loses its action` });
      break;
    case 'windup': {
      const def = g.scenario.enemyActions[u!.pattern[u!.pi]!]!;
      u!.charging = def.id;
      ev.push({ t: 'log', text: plan.text });
      break;
    }
    case 'rally': {
      const def = g.scenario.enemyActions[u!.pattern[(plan.nextPi === 0 ? u!.pattern.length : plan.nextPi!) - 1]!]!;
      for (let k = 0; k < (def.count ?? 1); k++) {
        if (k > 0 && !canBreed(g, u!, def)) break;
        const next = unitById(g, g.enemyDeck.shift()!);
        deployUnit(g, next, plan.lane!, ev);
        ev.push({ t: 'log', text: `${u!.name} rallies: ${next.name} joins lane ${plan.lane! + 1}` });
      }
      break;
    }
    case 'buff': {
      const ally = unitById(g, plan.ally!);
      ally.builtin += plan.soak ?? 1;
      ev.push({ t: 'soakGain', unit: ally.id, amount: plan.soak ?? 1 });
      ev.push({ t: 'log', text: ally === u ? `${u!.name}: ${plan.name}, +${plan.soak ?? 1} soak` : `${u!.name}: ${plan.name}, ${ally.name} gains ${plan.soak ?? 1} soak` });
      break;
    }
    case 'attack': {
      const v = plan.victim;
      u!.charging = null;
      if (plan.areaLane !== undefined) {
        const lane = plan.areaLane;
        if (lane === null) ev.push({ t: 'log', text: `${u!.name} has nothing to hit` });
        else {
          ev.push({ t: 'log', text: `${u!.name}: ${plan.name} sweeps lane ${lane + 1}` });
          for (const t of inLane(g, 'P', lane)) {
            if (plan.dmg > 0) hitUnit(t, plan.dmg, ev);
            applyEffects(t, plan.burn, plan.stun, ev);
          }
        }
      } else if (!v) {
        ev.push({ t: 'log', text: `${u!.name} has nothing to hit` });
      } else if (v.k === 'lane') {
        ev.push({ t: 'log', text: `${u!.name}: ${plan.name} on your lane ${v.lane + 1} for ${plan.dmg}` });
        hitLane(g, 'P', v.lane, plan.dmg, ev);
      } else {
        const t = unitById(g, v.id);
        if (plan.redirected) {
          g.bulwark[t.lane!] = null;
          ev.push({ t: 'log', text: `${t.name} takes the hit meant for a squadmate` });
        }
        ev.push({ t: 'log', text: `${u!.name}: ${plan.name} on ${t.name} for ${plan.dmg}` });
        if (plan.dmg > 0) hitUnit(t, plan.dmg, ev);
        applyEffects(t, plan.burn, plan.stun, ev);
        if (plan.suppress && !t.downed && !t.dead) {
          t.suppressed = Math.max(t.suppressed, plan.suppress);
          ev.push({ t: 'status', unit: t.id, status: 'suppressed', on: true });
          ev.push({ t: 'log', text: `${t.name} is suppressed for ${plan.suppress} rounds` });
        }
        if (t.counter && !u!.dead) {
          t.counter = false;
          ev.push({ t: 'status', unit: t.id, status: 'counter', on: false });
          ev.push({ t: 'log', text: `${t.name} counters for 2` });
          hitUnit(u!, 2, ev);
        }
        if (plan.melee && plan.dmg > 0 && !t.downed && !u!.dead) {
          ev.push({ t: 'log', text: `${t.name} fights back for 1` });
          hitUnit(u!, 1, ev);
        }
      }
      break;
    }
    case 'pass':
      ev.push({ t: 'log', text: plan.text });
      break;
  }

  checkResult(g, ev);
  if (!g.result) {
    endRound(g, ev);
    const hold = g.scenario.surviveRounds;
    if (hold !== undefined && g.round >= g.scenario.setupRounds + hold) {
      g.result = 'win';
      ev.push({ t: 'log', text: 'The reactor shuts down. The squad held.' });
      ev.push({ t: 'result', result: 'win' });
    }
    g.turn = 'P';
  }
  return ev;
}
