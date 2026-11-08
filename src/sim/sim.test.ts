import { describe, expect, it } from 'vitest';
import { tscVsScavvers, tscVsScavversPaper } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { enemyAct, enemyPlan } from './enemy';
import { parseCsv } from './csv';
import { createGame, hitUnit, inLane } from './state';
import { beginTurn } from './turn';
import { tscDeck } from '../data/cards';

describe('csv and card data', () => {
  it('parses quoted fields', () => {
    expect(parseCsv('a,b\n"x, y",2\n')).toEqual([{ a: 'x, y', b: '2' }]);
  });
  it('loads the TSC starter deck', () => {
    expect(tscDeck.reduce((s, c) => s + c.count, 0)).toBe(32);
    expect(tscDeck.find((c) => c.name === 'Ammo Crate')?.fuelValue).toBe(2);
    expect(tscDeck.find((c) => c.name === 'Pin Down')?.ammoCost).toBe(2);
  });
});

describe('setup and turns', () => {
  it('only allows deploying into empty lanes during setup', () => {
    const g = createGame(tscVsScavvers, 1);
    beginTurn(g);
    const acts = listActions(g);
    expect(acts.every((a) => a.kind === 'deploy')).toBe(true);
    expect(g.hand).toHaveLength(7);
    const first = acts.find((a) => a.lane === 0)!;
    perform(g, first);
    expect(g.turn).toBe('E');
    expect(enemyPlan(g).kind).toBe('deploy');
    enemyAct(g);
    expect(inLane(g, 'E', 0)).toHaveLength(1);
    beginTurn(g);
    expect(listActions(g).some((a) => a.lane === 0)).toBe(false);
  });

  it('opens up cards and gear actions after the three setup rounds', () => {
    const g = createGame(tscVsScavvers, 2);
    const lanes: Record<string, number> = { 'Line A': 0, Vanguard: 1, 'Line B': 2 };
    for (let i = 0; i < 3; i++) {
      beginTurn(g);
      const a = listActions(g).find((x) => lanes[g.units.find((u) => u.id === x.unit)!.name] === x.lane)!;
      perform(g, a);
      enemyAct(g);
    }
    beginTurn(g);
    const acts = listActions(g);
    expect(acts.some((a) => a.kind === 'basic')).toBe(true);
    expect(acts.some((a) => a.kind === 'cycle')).toBe(true);
    // fuel is always affordable from the rest of the hand
    for (const a of acts) expect(a.fuel).toBeLessThanOrEqual(g.hand.length * 2);
  });
});

describe('damage rules', () => {
  it('soaks armor, then built-in soak, then HP, and downs a squad member at 0', () => {
    const g = createGame(tscVsScavvers, 3);
    const u = g.units[0]!;
    hitUnit(u, 4, []);
    expect([u.armor, u.builtin, u.hp]).toEqual([0, 1, 5]);
    hitUnit(u, 7, []);
    expect([u.builtin, u.hp, u.downed]).toEqual([0, 0, true]);
  });
  it('Exposed adds one to the next hit only', () => {
    const g = createGame(tscVsScavvers, 3);
    const e = g.units.find((x) => x.side === 'E')!;
    e.exposed = true;
    hitUnit(e, 1, []);
    expect(e.hp).toBe(1);
    expect(e.exposed).toBe(false);
  });
});

describe('whole fights', () => {
  it('replays the same fight from the same seed', () => {
    const a = createGame(tscVsScavvers, 42);
    const b = createGame(tscVsScavvers, 42);
    expect(autoPlay(a)).toBe(autoPlay(b));
    expect(a.round).toBe(b.round);
    expect(a.stats).toEqual(b.stats);
  });

  it('matches the paper-fight sim: the stand-in crew beats the Scavver pack in about ten actions', () => {
    let wins = 0;
    let rounds = 0;
    let downed = 0;
    const N = 300;
    for (let seed = 0; seed < N; seed++) {
      const g = createGame(tscVsScavversPaper, seed);
      if (autoPlay(g) === 'win') wins++;
      rounds += g.round - 3;
      downed += g.units.filter((u) => u.side === 'P' && u.downed).length;
    }
    const avg = rounds / N;
    // Python paper sim: 2000/2000 wins, 10.0 actions after setup, 0.0 downed.
    expect(wins / N).toBeGreaterThan(0.97);
    expect(avg).toBeGreaterThan(7);
    expect(avg).toBeLessThan(14);
    expect(downed / N).toBeLessThan(0.3);
  });
});
