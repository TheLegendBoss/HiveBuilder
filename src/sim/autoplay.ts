import { cardDefs } from '../data/cards';
import { deadCards, listActions, perform, suggestBurn } from './actions';
import { enemyAct } from './enemy';
import { nextRandom } from './rng';
import { inLane, totalSoakHp, unitById } from './state';
import { beginTurn } from './turn';
import type { Action, Game, Target, Unit } from './types';

/**
 * A simple stand-in player used by tests and tuning runs. It scores every available action with
 * the same rough values the paper-fight sim used, then burns the cards that have no better use.
 * It is not a model of good play.
 */

const SETUP_LANES: Record<string, number> = { 'Line A': 0, Vanguard: 1, 'Line B': 2 };

function unitOf(g: Game, t: Target): Unit | null {
  return t.k === 'unit' ? unitById(g, t.id) : null;
}

function strikeValue(g: Game, t: Target, dmg: number): number {
  const u = unitOf(g, t);
  if (u) {
    const real = Math.min(dmg + (u.exposed ? 1 : 0), totalSoakHp(u));
    return real + (real >= totalSoakHp(u) ? 3 : 0) + (u.name.includes('Chief') ? 1.5 : 0);
  }
  const lane = (t as { lane: number }).lane;
  const hp = g.laneHP.E[lane]!;
  const real = Math.min(dmg, hp);
  let v = real * 1.3;
  if (real >= hp) {
    v += 3;
    if (g.laneHP.E.filter((x) => x === 0).length === 1) v += 6;
  }
  return v;
}

function bonusHint(g: Game, actor: Unit, t: Target): number {
  let b = 0;
  if (t.k === 'unit' && g.focus === t.id) b += 1;
  if (actor.sight && actor.gear.includes('Autogun')) b += 1;
  const s = g.sync[actor.lane!];
  if (s !== null && s !== undefined && s !== actor.id) b += 1;
  return b;
}

export function scoreAction(g: Game, a: Action): number {
  const actor = a.actor ? unitById(g, a.actor) : null;
  const friends = g.units.filter((u) => u.side === 'P' && u.lane !== null && !u.downed);
  const tgt = a.targets[0] ? unitOf(g, a.targets[0]) : null;
  const fuelCost = 0.45 * a.fuel;

  if (a.kind === 'deploy') {
    const u = unitById(g, a.unit!);
    if (g.round <= g.scenario.setupRounds) return SETUP_LANES[u.name] === a.lane ? 100 : 50;
    const L = a.lane!;
    if (u.name === 'Heavy') return 1.2 + 0.8 * inLane(g, 'E', L).length + (inLane(g, 'P', L).length ? 0.5 : 0);
    if (u.name === 'Repair') {
      const dmg = friends.reduce((s, x) => s + x.maxHp - x.hp + x.armorMax - x.armor, 0);
      return 0.6 + 0.35 * dmg + (dmg ? 0.5 * inLane(g, 'P', L).length : 0);
    }
    return inLane(g, 'P', L).length ? 0.3 : 1.5;
  }
  if (a.kind === 'cycle') {
    const dead = deadCards(g, listActions(g)).size;
    return 0.35 * Math.min(g.scenario.cycleLimit, dead);
  }

  let v = 0;
  const damaging = a.kind === 'basic' || ['Burst Fire', 'Sustained Fire'].includes(a.card!);
  if (damaging) {
    const dmg =
      a.kind === 'basic' ? (a.gear === 'Armory' ? 1 : 2) : a.card === 'Burst Fire' ? 3 : 2;
    for (const t of a.targets) v += strikeValue(g, t, dmg + bonusHint(g, actor!, t));
  } else {
    switch (a.card) {
      case 'Suppressing Fire': {
        const lane = (a.targets[0] as { lane: number }).lane;
        const en = inLane(g, 'E', lane);
        v = en.length
          ? en.reduce((s, e) => s + Math.min(1 + (e.exposed ? 1 : 0), totalSoakHp(e)) + (totalSoakHp(e) <= 1 ? 3 : 0), 0)
          : 1.3;
        break;
      }
      case 'Pin Down':
        v = 2.2 + (tgt?.name.includes('Chief') ? 1 : 0);
        break;
      case 'Brace':
      case 'Jury-Rig':
      case 'Repair Parts':
      case 'Shield Up': {
        const amt = { Brace: 2, 'Jury-Rig': 2, 'Repair Parts': 3, 'Shield Up': 3 }[a.card]!;
        const t = tgt ?? actor!;
        const real = Math.min(amt, t.armorMax - t.armor);
        const urgency = 1 + (t.hp <= 3 ? 0.5 : 0) + (t.lane !== null && inLane(g, 'E', t.lane).length ? 0.3 : -0.3);
        v = real * 0.7 * urgency;
        break;
      }
      case 'Counter':
        v = inLane(g, 'E', actor!.lane!).length ? 1 : 0.1;
        break;
      case 'Bulwark':
        v = inLane(g, 'P', actor!.lane!).length >= 2 && inLane(g, 'E', actor!.lane!).length ? 1.4 : 0.1;
        break;
      case 'Focus Fire':
        v = 1.1 - 0.01 * (tgt ? totalSoakHp(tgt) : 0);
        break;
      case 'Overdrive':
        v = 0.4;
        break;
      case 'Field Fix':
        v = 1;
        break;
      case 'Patch':
      case 'Repair Pack': {
        const t = tgt!;
        const amt = a.card === 'Patch' ? 2 : 4;
        v = Math.min(amt, t.maxHp - t.hp) * 1.2 + (t.downed ? 3 : 0);
        break;
      }
      case 'Ammo Crate':
        v = Math.min(2, tgt!.ammoMax - tgt!.ammo) * 0.8;
        break;
      case 'Sight Alignment':
        v = 1;
        break;
      case 'Paint Target':
        v = 1.4 + 0.02 * (tgt?.hp ?? 0);
        break;
      case 'Sync':
        v = inLane(g, 'P', actor!.lane!).length >= 2 ? 0.9 : 0.1;
        break;
      case 'Data Burst':
        v = 0.1;
        break;
    }
  }
  return v - (a.kind === 'basic' ? 0.5 * a.fuel : 0) - fuelCost;
}

export interface Choice {
  action: Action;
  cards?: number[];
}

/** Pick the best-scoring action. Burns the cards whose best use is worth the least per fuel point. */
export function chooseAction(g: Game): Choice | null {
  const actions = listActions(g);
  if (!actions.length) return null;
  let best: Action | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    const s = scoreAction(g, a) + nextRandom(g) * 1e-6;
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  const a = best!;
  if (a.kind === 'cycle') {
    const dead = deadCards(g, actions);
    const cards = g.hand.filter((c) => dead.has(c.name)).slice(0, g.scenario.cycleLimit);
    if (!cards.length) return { action: a, cards: [g.hand[0]!.iid] };
    return { action: a, cards: cards.map((c) => c.iid) };
  }
  if (a.fuel <= 0) return { action: a };
  // Value of each card = best score among plays using it, per fuel point.
  const cardBest: Record<string, number> = {};
  for (const x of actions) if (x.kind === 'play') cardBest[x.card!] = Math.max(cardBest[x.card!] ?? 0, scoreAction(g, x));
  const pool = g.hand
    .filter((c) => c.iid !== a.cardIid)
    .sort((p, q) => {
      const fp = cardDefs[p.name]?.fuelValue ?? 1;
      const fq = cardDefs[q.name]?.fuelValue ?? 1;
      return (cardBest[p.name] ?? 0) / fp - (cardBest[q.name] ?? 0) / fq || fq - fp;
    });
  const cards: number[] = [];
  let need = a.fuel;
  for (const c of pool) {
    if (need <= 0) break;
    cards.push(c.iid);
    need -= cardDefs[c.name]?.fuelValue ?? 1;
  }
  return { action: a, cards: cards.length ? cards : suggestBurn(g, a, actions) };
}

/** Play a whole fight with the stand-in player. Returns the result, or 'timeout'. */
export function autoPlay(g: Game, maxRounds = 80): 'win' | 'loss' | 'timeout' {
  while (!g.result && g.round < maxRounds) {
    beginTurn(g);
    const c = chooseAction(g);
    if (!c) return 'timeout';
    perform(g, c.action, c.cards);
    if (g.result) break;
    enemyAct(g);
  }
  return g.result ?? 'timeout';
}
