import {
  adjacent,
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
import type { Ev, EnemyPlan, Game, Target, Unit } from './types';

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

function enemyUnitsInOrder(g: Game): Unit[] {
  const out: Unit[] = [];
  for (let L = 0; L < 3; L++) out.push(...inLane(g, 'E', L));
  return out;
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
    return {
      kind: 'deploy', unit: u.id, name: 'Deploy', dmg: 0, melee: false, victim: null, redirected: false,
      lane: g.round - 1, nextPtr: g.eptr, nextPi: null, text: `${u.name} takes lane ${g.round}`
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
        if (g.enemyDeck.length === 0 || !laneHasRoom(g, 'E', u.lane!)) continue;
        return {
          kind: 'rally', unit: u.id, name: def.name, dmg: 0, melee: false, victim: null, redirected: false,
          lane: u.lane, nextPtr: ptr, nextPi, text: def.text
        };
      }
      const v = victimFor(g, u);
      return {
        kind: 'attack', unit: u.id, name: def.name, dmg: def.dmg, melee: def.melee,
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
      break;
    case 'stunned':
      u!.stunned = false;
      ev.push({ t: 'status', unit: u!.id, status: 'stunned', on: false });
      ev.push({ t: 'intentSkip', unit: u!.id });
      ev.push({ t: 'log', text: `${u!.name} is stunned and loses its action` });
      break;
    case 'rally': {
      const next = unitById(g, g.enemyDeck.shift()!);
      deployUnit(g, next, plan.lane!, ev);
      ev.push({ t: 'log', text: `${u!.name} rallies: ${next.name} joins lane ${plan.lane! + 1}` });
      break;
    }
    case 'attack': {
      const v = plan.victim;
      if (!v) {
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
        hitUnit(t, plan.dmg, ev);
        if (t.counter && !u!.dead) {
          t.counter = false;
          ev.push({ t: 'status', unit: t.id, status: 'counter', on: false });
          ev.push({ t: 'log', text: `${t.name} counters for 2` });
          hitUnit(u!, 2, ev);
        }
        if (plan.melee && !t.downed && !u!.dead) {
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
    g.turn = 'P';
  }
  return ev;
}
