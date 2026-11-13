import { describe, expect, it } from 'vitest';
import { tscVsScavvers, tscVsScavversPaper } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { parseCsv } from './csv';
import { createGame, hitUnit, inLane } from './state';
import { endTurn, startFight } from './testkit';
import { enemyBodies, openFight, playerBodies } from './turn';
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

describe('deployment and turns', () => {
  it('opens with deployment: any unit into any lane, no cap, nothing else until Ready', () => {
    const g = createGame(tscVsScavvers, 1);
    openFight(g);
    expect(g.phase).toBe('deploy');
    let acts = listActions(g);
    expect(acts.every((a) => a.kind === 'deploy')).toBe(true);
    expect(acts.filter((a) => a.lane === 0)).toHaveLength(5);
    // Everyone can stand in one lane.
    for (const u of g.units.filter((x) => x.side === 'P')) perform(g, listActions(g).find((a) => a.kind === 'deploy' && a.unit === u.id && a.lane === 0)!);
    expect(inLane(g, 'P', 0)).toHaveLength(5);
    acts = listActions(g);
    expect(acts.map((a) => a.kind)).toEqual(['ready']);
  });

  it('the enemy puts its whole starting force on the board, either before or after the squad', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const g = createGame(tscVsScavvers, seed);
      openFight(g);
      perform(g, listActions(g).find((a) => a.kind === 'deploy')!);
      perform(g, listActions(g).find((a) => a.kind === 'ready')!);
      expect(g.enemyDeployed).toBe(true);
      expect(enemyBodies(g)).toBe(3);
      expect(g.phase).toBe('fight');
    }
  });

  it('gives the squad one action per body that can act, and a turn ends when the pool is spent', () => {
    const g = createGame(tscVsScavvers, 2);
    startFight(g);
    expect(g.turn).toBe('P');
    expect(g.round).toBe(1);
    expect(g.pool).toBe(3);
    const acts = listActions(g);
    expect(acts.some((a) => a.kind === 'basic')).toBe(true);
    expect(acts.some((a) => a.kind === 'cycle')).toBe(true);
    expect(acts.some((a) => a.kind === 'pass')).toBe(true);
    for (const a of acts) expect(a.fuel).toBeLessThanOrEqual(g.hand.length * 2);
    perform(g, acts.find((a) => a.kind === 'cycle')!, [g.hand[0]!.iid]);
    expect(g.pool).toBe(2);
    expect(g.turn).toBe('P');
    expect(g.hand).toHaveLength(7);
  });

  it('a unit stunned when the turn opens adds no action', () => {
    const g = createGame(tscVsScavvers, 2);
    startFight(g);
    expect(playerBodies(g)).toBe(3);
    inLane(g, 'P', 1)[0]!.stunned = true;
    expect(playerBodies(g)).toBe(2);
  });

  it('draws initiative every round, and the round only closes when both sides have gone', () => {
    const g = createGame(tscVsScavvers, 3);
    startFight(g);
    expect(g.round).toBe(1);
    endTurn(g);
    expect(g.round).toBe(2);
    endTurn(g, 'E');
    // The enemy went first in round 3: its whole turn already played, and it is now the squad's.
    expect(g.round).toBe(3);
    expect(g.first).toBe('E');
    expect(g.turn).toBe('P');
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

  it('the stand-in crew beats the Scavver pack in a couple of rounds of bursts', () => {
    let wins = 0;
    let rounds = 0;
    let downed = 0;
    const N = 300;
    for (let seed = 0; seed < N; seed++) {
      const g = createGame(tscVsScavversPaper, seed);
      if (autoPlay(g) === 'win') wins++;
      rounds += g.round;
      downed += g.units.filter((u) => u.side === 'P' && u.downed).length;
    }
    const avg = rounds / N;
    // Pooled actions: five bodies, a few rounds. The paper sim won 2000/2000 with 0.0 downed.
    expect(wins / N).toBeGreaterThan(0.97);
    expect(avg).toBeGreaterThan(1);
    expect(avg).toBeLessThan(5);
    expect(downed / N).toBeLessThan(0.3);
  });
});
