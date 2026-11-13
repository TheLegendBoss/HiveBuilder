import { describe, expect, it } from 'vitest';
import { cardDefs } from '../data/cards';
import { tscVsScavvers } from '../data/scenarios';
import { listActions, perform } from './actions';
import { enemyAct, enemyPlan } from './enemy';
import { attackLanes, createGame, deployUnit, hitUnit, unitById } from './state';
import { endTurn, enterFight, handOver } from './testkit';
import type { Action, Game, Unit } from './types';

/** A fight past setup: Line A, Vanguard and Heavy in lane 1, Line B and Repair in lane 2, the Scavver pack in place. */
function fight(hand: string[], seed = 5): Game {
  const g = createGame(tscVsScavvers, seed);
  const by = (n: string): Unit => g.units.find((u) => u.name === n && u.side === 'P')!;
  const ev: never[] = [];
  deployUnit(g, by('Line A'), 0, ev);
  deployUnit(g, by('Vanguard'), 0, ev);
  deployUnit(g, by('Heavy'), 0, ev);
  deployUnit(g, by('Line B'), 1, ev);
  deployUnit(g, by('Repair'), 1, ev);
  const foes = g.units.filter((u) => u.side === 'E');
  deployUnit(g, foes[0]!, 0, ev);
  deployUnit(g, foes[1]!, 1, ev);
  deployUnit(g, foes[2]!, 0, ev);
  g.enemyDeck = [foes[3]!.id, foes[4]!.id];
  g.round = 4;
  enterFight(g);
  // Put the named cards in hand and fill the rest with plain fuel (Ammo Crates are worth 2).
  g.deck.push(...g.hand.splice(0), ...g.discard.splice(0));
  for (const n of hand) {
    const i = g.deck.findIndex((c) => c.name === n);
    g.hand.push(g.deck.splice(i, 1)[0]!);
  }
  while (g.hand.length < 7) {
    const i = g.deck.findIndex((c) => c.name === 'Repair Pack');
    g.hand.push(g.deck.splice(i, 1)[0]!);
  }
  return g;
}

const find = (g: Game, f: (a: Action) => boolean): Action => {
  const a = listActions(g).find(f);
  if (!a) throw new Error('action not found');
  return a;
};
const unitNamed = (g: Game, n: string, side: 'P' | 'E' = 'P'): Unit => g.units.find((u) => u.name === n && u.side === side)!;

describe('card rules', () => {
  it('Burst Fire deals 3 to a unit in the actor lane, spends one action from the pool, and cannot reach other lanes', () => {
    const g = fight(['Burst Fire']);
    const chief = unitNamed(g, 'Scavver Chief', 'E');
    const lineA = unitNamed(g, 'Line A');
    expect(listActions(g).some((a) => a.card === 'Burst Fire' && a.actor === lineA.id && a.targets[0]?.k === 'unit' && a.targets[0].id === chief.id)).toBe(false);
    const scav = g.units.find((u) => u.side === 'E' && u.lane === 0)!;
    perform(g, find(g, (a) => a.card === 'Burst Fire' && a.actor === lineA.id && a.targets[0]?.k === 'unit' && a.targets[0].id === scav.id));
    expect(scav.dead).toBe(true);
    expect(g.pool).toBe(4);
    expect(g.turn).toBe('P');
  });

  it('only offers targets in the actor lane until a lane is captured', () => {
    const g = fight(['Burst Fire']);
    const a = unitNamed(g, 'Line A');
    expect(attackLanes(g, a)).toEqual([0]);
    g.laneHP.E[0] = 0;
    expect(attackLanes(g, a)).toEqual([0, 1]);
  });

  it('Focus Fire adds 1 to the next attack on the same target and is then spent', () => {
    const g = fight(['Focus Fire', 'Burst Fire']);
    const scav = g.units.find((u) => u.side === 'E' && u.lane === 0)!;
    perform(g, find(g, (a) => a.card === 'Focus Fire' && a.targets[0]?.k === 'unit' && a.targets[0].id === scav.id));
    expect(g.focus).toBe(scav.id);
    endTurn(g);
    const hp = scav.hp;
    perform(g, find(g, (a) => a.card === 'Burst Fire' && a.targets[0]?.k === 'unit' && a.targets[0].id === scav.id));
    expect(hp - scav.hp).toBe(3);
    expect(g.focus).toBeNull();
    expect(scav.dead).toBe(true);
  });

  it('Pin Down stuns, and the stunned enemy loses its action', () => {
    const g = fight(['Pin Down']);
    const heavy = unitNamed(g, 'Heavy');
    const scav = g.units.find((u) => u.side === 'E' && u.lane === 0)!;
    const act = find(g, (a) => a.card === 'Pin Down' && a.targets[0]?.k === 'unit' && a.targets[0].id === scav.id);
    expect(act.ammo).toBe(2);
    perform(g, act);
    expect(scav.stunned).toBe(true);
    expect(heavy.ammo).toBe(2);
    // The pointer starts at lane 1's first unit, which is the stunned Scavver.
    const plan = enemyPlan(g);
    expect(plan.kind).toBe('stunned');
    handOver(g);
    enemyAct(g);
    expect(scav.stunned).toBe(false);
  });

  it('Sustained Fire hits two units for 2 each and costs 1 ammo', () => {
    const g = fight(['Sustained Fire']);
    const lane0 = g.units.filter((u) => u.side === 'E' && u.lane === 0);
    expect(lane0).toHaveLength(2);
    const act = find(g, (a) => a.card === 'Sustained Fire' && a.targets.length === 2);
    perform(g, act);
    expect(lane0.map((u) => u.hp)).toEqual([1, 1]);
    expect(unitNamed(g, 'Heavy').ammo).toBe(3);
  });

  it('Overdrive takes 1 fuel off the next gear action and is then used up', () => {
    const g = fight(['Overdrive']);
    perform(g, find(g, (a) => a.card === 'Overdrive'));
    expect(g.discount).toBe(1);
    endTurn(g);
    const shot = find(g, (a) => a.kind === 'basic' && a.label === 'Single shot');
    expect(shot.fuel).toBe(0);
    perform(g, shot);
    expect(g.discount).toBe(0);
  });

  it('Sight Alignment makes the next autogun shot +1 damage and 1 fuel cheaper', () => {
    const g = fight(['Sight Alignment']);
    const lineA = unitNamed(g, 'Line A');
    perform(g, find(g, (a) => a.card === 'Sight Alignment' && a.actor === lineA.id));
    expect(lineA.sight).toBe(true);
    endTurn(g);
    const scav = g.units.find((u) => u.side === 'E' && u.lane === 0)!;
    const shot = find(g, (a) => a.kind === 'basic' && a.actor === lineA.id && a.targets[0]?.k === 'unit' && a.targets[0].id === scav.id);
    expect(shot.fuel).toBe(0);
    perform(g, shot);
    expect(scav.hp).toBe(0);
    expect(lineA.sight).toBe(false);
  });

  it('Bulwark redirects the next enemy attack aimed at a squadmate, then wears off', () => {
    const g = fight(['Bulwark']);
    const van = unitNamed(g, 'Vanguard');
    perform(g, find(g, (a) => a.card === 'Bulwark' && a.actor === van.id));
    expect(g.bulwark[0]).toBe(van.id);
    const plan = enemyPlan(g);
    expect(plan.kind).toBe('attack');
    expect(plan.victim).toEqual({ k: 'unit', id: van.id });
    handOver(g);
    enemyAct(g);
    expect(g.bulwark[0]).toBeNull();
  });

  it('Counter hits the attacker for 2 once when its holder is attacked', () => {
    const g = fight(['Counter']);
    const van = unitNamed(g, 'Vanguard');
    for (const u of g.units.filter((x) => x.side === 'P' && x.lane === 0 && x !== van)) u.hp = 5;
    van.hp = 1; // the Scavver picks the lowest HP in its lane
    perform(g, find(g, (a) => a.card === 'Counter' && a.actor === van.id));
    const attacker = unitById(g, enemyPlan(g).unit!);
    const before = attacker.hp;
    handOver(g);
    enemyAct(g);
    expect(before - attacker.hp).toBeGreaterThanOrEqual(2);
    expect(van.counter).toBe(false);
  });

  it('Counter that is never triggered still expires with the round', () => {
    const g = fight(['Counter']);
    const van = unitNamed(g, 'Vanguard');
    unitNamed(g, 'Line A').hp = 1; // the enemy will hit Line A, not the Vanguard
    perform(g, find(g, (a) => a.card === 'Counter' && a.actor === van.id));
    endTurn(g);
    expect(van.counter).toBe(false);
  });

  it('a downed squad member stops screening and Patch stands them back up', () => {
    const g = fight(['Patch']);
    const lineA = unitNamed(g, 'Line A');
    hitUnit(lineA, 50, []);
    expect(lineA.downed).toBe(true);
    const act = find(g, (a) => a.card === 'Patch' && a.targets[0]?.k === 'unit' && a.targets[0].id === lineA.id);
    // Patch needs the Repair droid deployed.
    expect(act).toBeDefined();
    perform(g, act);
    expect(lineA.downed).toBe(false);
    expect(lineA.hp).toBe(2);
  });

  it('Data Burst reorders the top of the results deck', () => {
    const g = fight(['Data Burst']);
    const lineB = unitNamed(g, 'Line B');
    const top3 = g.results.slice(-3);
    perform(g, find(g, (a) => a.card === 'Data Burst' && a.actor === lineB.id && a.variant === 'high'));
    const now = g.results.slice(-3);
    expect(now.slice().sort((x, y) => x - y)).toEqual(top3.slice().sort((x, y) => x - y));
    expect(now[2]).toBe(Math.max(...top3));
    expect(g.results).toHaveLength(52);
  });

  it('cannot burn the card being played or pay with fuel you do not have', () => {
    const g = fight(['Suppressing Fire']);
    const act = find(g, (a) => a.card === 'Suppressing Fire');
    expect(act.fuel).toBe(1);
    expect(() => perform(g, act, [act.cardIid!])).toThrow();
    const burn = g.hand.find((c) => c.iid !== act.cardIid)!;
    perform(g, act, [burn.iid]);
    expect(g.discard.map((c) => c.name)).toContain('Suppressing Fire');
    expect(cardDefs['Suppressing Fire']!.playFuel).toBe(1);
  });

  it('ends the fight the moment a second enemy lane is captured, and the enemy does not act', () => {
    const g = fight(['Burst Fire']);
    g.laneHP.E = [1, 0, 3];
    g.units.filter((u) => u.side === 'E' && u.lane === 0).forEach((u) => hitUnit(u, 50, []));
    const act = find(g, (a) => a.card === 'Burst Fire' && a.targets[0]?.k === 'lane');
    const ev = perform(g, act);
    expect(g.result).toBe('win');
    expect(ev.some((e) => e.t === 'result')).toBe(true);
    expect(listActions(g)).toEqual([]);
    expect(enemyAct(g)).toEqual([]);
  });

  it('Put Out spends one action and a fuel point to clear Burning on a unit in the actor lane, itself included', () => {
    const g = fight([]);
    const van = unitNamed(g, 'Vanguard');
    const heavy = unitNamed(g, 'Heavy');
    van.burning = 3;
    expect(listActions(g).some((a) => a.kind === 'putout' && a.actor === heavy.id && a.targets[0]?.k === 'unit' && a.targets[0].id === van.id)).toBe(true);
    // Line B stands in the other lane, so it cannot reach the fire.
    expect(listActions(g).some((a) => a.kind === 'putout' && a.actor === unitNamed(g, 'Line B').id)).toBe(false);
    const act = find(g, (a) => a.kind === 'putout' && a.actor === van.id && a.targets[0]?.k === 'unit' && a.targets[0].id === van.id);
    expect(act.fuel).toBe(1);
    const pool = g.pool;
    perform(g, act);
    expect(van.burning).toBe(0);
    expect(g.pool).toBe(pool - 1);
  });
});
