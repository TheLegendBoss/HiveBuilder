import { describe, expect, it } from 'vitest';
import { forces, ratSwarm, stragglerBand, tollGang } from '../data/forces';
import { tscVsForce } from '../data/scenarios';
import { autoPlay } from './autoplay';
import { enemyAct, enemyPlan } from './enemy';
import { bodiesInLane, createGame, inLane, unitById } from './state';
import { startFight } from './testkit';

/** Deploy the squad's three, ready up, and let the enemy's opening turn play out. */
function setup(g: ReturnType<typeof createGame>): void {
  startFight(g);
}

describe('tier-1 forces', () => {
  it('deploys the CSV layout during setup', () => {
    const g = createGame(tscVsForce(ratSwarm), 3);
    setup(g);
    expect(inLane(g, 'E', 0)).toHaveLength(3); // the CSV pair plus the pooled-action extra body
    expect(inLane(g, 'E', 1).map((u) => u.name)).toEqual(['Brood Rat']);
    expect(inLane(g, 'E', 2)).toHaveLength(2);
    expect(g.enemyDeck).toHaveLength(2);
  });

  it('breeds only up to 4 rats a lane', () => {
    const g = createGame(tscVsForce(ratSwarm), 4);
    setup(g);
    const brood = inLane(g, 'E', 1)[0]!;
    brood.pi = 1;
    g.eptr = 0;
    g.round = 4;
    // fill lane 2 to the cap, then Breed must be skipped
    const movers = [...inLane(g, 'E', 0), ...inLane(g, 'E', 2)].slice(0, 3);
    for (const rat of movers) {
      rat.lane = 1;
      rat.arrived = ++g.arrivals;
    }
    expect(bodiesInLane(g, 'E', 1)).toBe(4);
    const plan = enemyPlan(g);
    expect(plan.kind === 'rally' && plan.unit === brood.id).toBe(false);
  });

  it('Shakedown suppresses the unit it hits', () => {
    const g = createGame(tscVsForce(tollGang), 5);
    setup(g);
    const boss = inLane(g, 'E', 1)[0]!;
    boss.pi = 0;
    const order = [0, 1, 2].flatMap((L) => inLane(g, 'E', L));
    g.eptr = order.findIndex((u) => u.id === boss.id);
    g.round = 4;
    g.turn = 'E';
    const plan = enemyPlan(g);
    expect(plan.unit).toBe(boss.id);
    expect(plan.suppress).toBe(2);
    enemyAct(g);
    const victim = plan.victim!.k === 'unit' ? unitById(g, plan.victim!.id) : null;
    expect(victim?.suppressed ?? 0).toBeGreaterThan(0);
  });

  it('Dig In only helps a Straggler and stops at the soak cap', () => {
    const g = createGame(tscVsForce(stragglerBand), 6);
    setup(g);
    const sgt = inLane(g, 'E', 1)[0]!;
    expect(sgt.name).toBe('Straggler Sergeant');
    // no Straggler in lane 2: Dig In is skipped, so Sidearm comes next
    sgt.pi = 1;
    g.eptr = 0;
    g.round = 4;
    const lonely = enemyPlan(g);
    expect(lonely.kind === 'buff' && lonely.unit === sgt.id).toBe(false);
  });

  it('scales HP and damage per tier step', () => {
    const s = tscVsForce(stragglerBand, 2);
    expect(s.enemyStart[0]!.hp).toBe(6);
    expect(s.enemyActions['rifle']!.dmg).toBe(5); // +1 damage every second step (2 -> 3), then x1.5 for the pooled-action tuning
    expect(s.enemyActions['cover']!.soak).toBe(1);
  });

  it('carries squad HP into a fight but never starts anyone downed', () => {
    const g = createGame(tscVsForce(tollGang), 7, { squadHp: [2, 99, 0, 3, 1] });
    const hp = g.units.filter((u) => u.side === 'P').map((u) => u.hp);
    expect(hp).toEqual([2, 5, 1, 3, 1]);
  });

  it('autoplay clears every force at tier 1', () => {
    for (const f of forces) {
      let wins = 0;
      const N = 60;
      for (let s = 1; s <= N; s++) {
        const g = createGame(tscVsForce(f), s);
        if (autoPlay(g) === 'win') wins++;
      }
      expect(wins / N, f.name).toBeGreaterThan(0.8);
    }
  });
});
