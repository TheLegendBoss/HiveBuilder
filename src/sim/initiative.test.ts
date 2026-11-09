import { describe, expect, it } from 'vitest';
import { tscVsScavvers } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { enemyAct, enemyPlan } from './enemy';
import { rollInitiative } from './initiative';
import { checkResult, createGame, enemyHasForces, inLane } from './state';
import { beginEnemyTurn, beginTurn } from './turn';
import type { Ev, Game } from './types';

/** Stack the top of the results deck: the squad draws `squad`, then the enemy draws `enemy`. */
function stacked(seed: number, squad: number, enemy: number): Game {
  const g = createGame(tscVsScavvers, seed);
  g.results.push(enemy, squad);
  return g;
}

const lanes: Record<string, number> = { 'Line A': 0, Vanguard: 1, 'Line B': 2 };

function deployNext(g: Game): void {
  const a = listActions(g).find((x) => x.kind === 'deploy' && lanes[g.units.find((u) => u.id === x.unit)!.name] === x.lane && g.units.find((u) => u.id === x.unit)!.lane === null)!;
  perform(g, a);
}

describe('initiative', () => {
  it('lets the higher card act first and breaks a tie on suit', () => {
    expect(rollInitiative(stacked(1, 12, 5)).find((e) => e.t === 'initiative')).toMatchObject({ first: 'P' });
    const lose = stacked(1, 5, 12);
    expect(rollInitiative(lose).find((e) => e.t === 'initiative')).toMatchObject({ first: 'E' });
    expect(lose.first).toBe('E');
    expect(lose.turn).toBe('E');
    for (let seed = 1; seed < 40; seed++) {
      const g = stacked(seed, 7, 7);
      const e = rollInitiative(g).find((x): x is Extract<Ev, { t: 'initiative' }> => x.t === 'initiative')!;
      expect(e.squad.suit).not.toBe(e.enemy.suit);
      expect(e.first).toBe(e.squad.suit > e.enemy.suit ? 'P' : 'E');
    }
  });

  it('with the enemy first, the enemy deploys first and the squad action closes the round', () => {
    const g = stacked(3, 2, 11);
    rollInitiative(g);
    expect(g.first).toBe('E');
    // Round 1: enemy, then squad.
    beginEnemyTurn(g);
    expect(g.round).toBe(1);
    enemyAct(g);
    expect(inLane(g, 'E', 0)).toHaveLength(1);
    expect(g.turn).toBe('P');
    beginTurn(g);
    expect(g.round).toBe(1);
    // The squad can see that the enemy's next deployment is round 2's.
    expect(enemyPlan(g).text).toContain(g.units.find((u) => u.id === g.enemyStart[1])!.name);
    deployNext(g);
    expect(g.turn).toBe('E');
    expect(g.round).toBe(1);
    beginEnemyTurn(g);
    expect(g.round).toBe(2);
  });

  it('plays whole fights with the enemy first', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = stacked(seed, 1, 13);
      rollInitiative(g);
      expect(g.first).toBe('E');
      expect(autoPlay(g, 120)).not.toBe('timeout');
    }
  });
});

describe('a cleared board ends the fight', () => {
  function afterSetup(seed: number): Game {
    const g = createGame(tscVsScavvers, seed);
    for (let i = 0; i < 3; i++) {
      beginTurn(g);
      deployNext(g);
      enemyAct(g);
    }
    beginTurn(g);
    return g;
  }

  it('does not end during setup while the first enemies are still due', () => {
    const g = createGame(tscVsScavvers, 1);
    beginTurn(g);
    deployNext(g);
    expect(enemyHasForces(g)).toBe(true);
    checkResult(g, []);
    expect(g.result).toBeNull();
  });

  it('wins once nobody is left on the board, even with units waiting in reserve', () => {
    const g = afterSetup(2);
    expect(g.enemyDeck.length).toBeGreaterThan(0);
    for (const u of g.units) if (u.side === 'E' && u.lane !== null) u.dead = true;
    const ev: Ev[] = [];
    checkResult(g, ev);
    expect(g.result).toBe('win');
    expect(g.how).toBe('cleared');
  });

  it('keeps fighting while one enemy stands', () => {
    const g = afterSetup(2);
    const board = g.units.filter((u) => u.side === 'E' && u.lane !== null);
    for (const u of board.slice(1)) u.dead = true;
    checkResult(g, []);
    expect(g.result).toBeNull();
  });
});
