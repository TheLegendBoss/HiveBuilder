import { describe, expect, it } from 'vitest';
import { tscVsScavvers } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { rollInitiative } from './initiative';
import { checkResult, createGame, enemyHasForces } from './state';
import { openFight } from './turn';
import { endTurn, runEnemy, startFight } from './testkit';
import type { Ev, Game } from './types';

/** Stack the top of the results deck: the squad draws `squad`, then the enemy draws `enemy`. */
function stacked(seed: number, squad: number, enemy: number): Game {
  const g = createGame(tscVsScavvers, seed);
  g.results.push(enemy, squad);
  return g;
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

  it('with the enemy first, its whole turn plays before the squad acts, and the squad closes the round', () => {
    const g = createGame(tscVsScavvers, 3);
    openFight(g);
    for (const name of ['Line A', 'Vanguard', 'Line B']) {
      const u = g.units.find((x) => x.name === name && x.side === 'P')!;
      perform(g, listActions(g).find((a) => a.kind === 'deploy' && a.unit === u.id && a.lane === g.units.filter((x) => x.side === 'P' && x.lane !== null).length)!);
    }
    g.results.push(13, 1); // the enemy draws 13, the squad 1: the enemy goes first in round 1
    perform(g, listActions(g).find((a) => a.kind === 'ready')!);
    expect(g.first).toBe('E');
    expect(g.round).toBe(1);
    expect(g.turn).toBe('E');
    runEnemy(g);
    expect(g.turn).toBe('P');
    expect(g.round).toBe(1);
    expect(g.pool).toBe(3);
    endTurn(g); // the squad ends round 1; round 2 opens with a fresh draw
    expect(g.round).toBe(2);
  });

  it('redraws initiative every round, so one side can take two turns in a row', () => {
    const g = createGame(tscVsScavvers, 5);
    startFight(g); // round 1: the squad first
    expect(g.first).toBe('P');
    endTurn(g); // the enemy goes second in round 1, then round 2: stacked so the squad wins again
    expect(g.round).toBe(2);
    expect(g.first).toBe('P');
  });

  it('plays whole fights through, whoever wins each draw', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = createGame(tscVsScavvers, seed);
      expect(autoPlay(g, 120)).not.toBe('timeout');
    }
  });
});

describe('a cleared board ends the fight', () => {
  function afterSetup(seed: number): Game {
    const g = createGame(tscVsScavvers, seed);
    startFight(g);
    return g;
  }

  it('does not end during setup while the first enemies are still due', () => {
    const g = createGame(tscVsScavvers, 1);
    openFight(g);
    expect(g.phase).toBe('deploy');
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
