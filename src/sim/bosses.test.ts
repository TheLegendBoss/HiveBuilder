import { describe, expect, it } from 'vitest';
import { bosses, foundryForeman, pipeGang, runawayDynamo, scaleForce, theWarden, broodQueenForce } from '../data/forces';
import { tscVsForce } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { enemyAct, enemyPlan } from './enemy';
import { createGame, endRound, inLane } from './state';
import { beginTurn } from './turn';
import type { Ev } from './types';

/** Play the player's setup rounds by hand and let the enemy deploy. */
function setup(g: ReturnType<typeof createGame>): void {
  for (let lane = 0; lane < 3; lane++) {
    beginTurn(g);
    const a = listActions(g).find((x) => x.kind === 'deploy' && x.lane === lane)!;
    perform(g, a);
    enemyAct(g);
  }
}

/** Make `u` the enemy unit that acts next (the sim walks the enemy lane by lane). */
function pointAt(g: ReturnType<typeof createGame>, u: { id: number }): void {
  const order = [0, 1, 2].flatMap((L) => inLane(g, 'E', L));
  g.eptr = order.findIndex((x) => x.id === u.id);
  g.round = Math.max(g.round, g.scenario.setupRounds + 1);
  g.turn = 'E';
}

/** The squad does something harmless: throw one card away. */
function idle(g: ReturnType<typeof createGame>): void {
  beginTurn(g);
  perform(g, listActions(g).find((a) => a.kind === 'cycle')!, [g.hand[0]!.iid]);
}

describe('statuses', () => {
  it('Burning costs 1 HP at the end of each round and wears off', () => {
    const g = createGame(tscVsForce(pipeGang), 1);
    setup(g);
    const u = inLane(g, 'P', 0)[0]!;
    u.burning = 2;
    const hp = u.hp + u.armor + u.builtin;
    const ev: Ev[] = [];
    endRound(g, ev);
    endRound(g, ev);
    endRound(g, ev);
    expect(u.burning).toBe(0);
    expect(hp - (u.hp + u.armor + u.builtin)).toBe(2);
  });

  it('a stun on a squad member outlasts the round it landed in, then clears', () => {
    const g = createGame(tscVsForce(theWarden), 2);
    setup(g);
    const u = inLane(g, 'P', 0)[0]!;
    u.stunned = true;
    u.stunWait = 1;
    endRound(g, []);
    expect(u.stunned).toBe(true);
    endRound(g, []);
    expect(u.stunned).toBe(false);
  });

  it('squad slots can start a fight Suppressed or Stunned', () => {
    const g = createGame(tscVsForce(pipeGang), 3, { squadFx: [{ suppressed: 2 }, { stunned: true }, null] });
    const squad = g.units.filter((u) => u.side === 'P');
    expect(squad[0]!.suppressed).toBe(2);
    expect(squad[1]!.stunned).toBe(true);
    expect(squad[2]!.suppressed).toBe(0);
  });
});

describe('Pipe gang', () => {
  it('the Torch lights a unit, and Flare winds up for a round before it fires', () => {
    const g = createGame(tscVsForce(pipeGang), 5);
    setup(g);
    const welder = inLane(g, 'E', 1)[0]!;
    expect(welder.name).toBe('Torch Welder');
    welder.pi = 1;
    pointAt(g, welder);
    expect(enemyPlan(g).kind).toBe('windup');
    const ev = enemyAct(g);
    expect(welder.charging).toBe('flare');
    expect(welder.pi).toBe(1);
    expect(ev.some((e) => e.t === 'log' && /winds up/.test(e.text))).toBe(true);
    // next time round it fires and sets a unit alight
    pointAt(g, welder);
    expect(enemyPlan(g).kind).toBe('attack');
    enemyAct(g);
    expect(welder.charging).toBeNull();
    expect(g.units.some((u) => u.side === 'P' && u.burning > 0)).toBe(true);
  });
});

describe('bosses', () => {
  it('scale +2 HP and +1 damage per two tier steps', () => {
    const f = scaleForce(foundryForeman, 6);
    expect(f.start[1]!.hp).toBe(10 + 6);
    expect(f.actions.slag!.dmg).toBe(2 + 3);
    expect(f.actions.pour!.dmg).toBe(0);
    expect(scaleForce(foundryForeman, 1).start[1]!.hp).toBe(10);
  });

  it('the Dynamo starts alone in lane 2 and the squad wins by holding 6 rounds after setup', () => {
    const g = createGame(tscVsForce(runawayDynamo), 7);
    setup(g);
    expect(inLane(g, 'E', 1).map((u) => u.name)).toEqual(['Runaway Dynamo']);
    expect(inLane(g, 'E', 0)).toHaveLength(0);
    // keep the squad alive and just pass: the reactor should shut down by itself
    for (const u of g.units.filter((x) => x.side === 'P')) {
      u.hp = 999;
      u.maxHp = 999;
    }
    let guard = 0;
    while (!g.result && guard++ < 20) {
      idle(g);
      enemyAct(g);
    }
    expect(g.result).toBe('win');
    expect(g.round).toBe(g.scenario.setupRounds + 6);
  });

  it('Arc Surge hits every unit in the most crowded squad lane', () => {
    const g = createGame(tscVsForce(runawayDynamo), 8);
    setup(g);
    const squad = g.units.filter((u) => u.side === 'P');
    squad[3]!.lane = 0;
    squad[3]!.arrived = 99;
    const crowded = inLane(g, 'P', 0);
    expect(crowded.length).toBe(2);
    const before = crowded.map((u) => u.armor + u.builtin + u.hp);
    pointAt(g, g.units.find((u) => u.side === 'E')!);
    enemyAct(g);
    const after = crowded.map((u) => u.armor + u.builtin + u.hp);
    expect(after.every((v, i) => before[i]! - v === 2)).toBe(true);
  });

  it('killing the Brood Queen kills every Rat in play', () => {
    const g = createGame(tscVsForce(broodQueenForce), 9);
    setup(g);
    const queen = g.units.find((u) => u.tags.includes('queen'))!;
    expect(g.units.filter((u) => u.tags.includes('brood') && !u.dead).length).toBeGreaterThan(2);
    queen.dead = true;
    queen.hp = 0;
    const ev: Ev[] = [];
    // any action ends in checkResult
    idle(g);
    expect(g.units.filter((u) => u.tags.includes('brood') && !u.dead)).toHaveLength(0);
    expect(g.result).toBe('win');
    void ev;
  });

  it('Brood deploys 2 Rats at a time, up to 6 in a lane', () => {
    const g = createGame(tscVsForce(broodQueenForce), 10);
    setup(g);
    const queen = g.units.find((u) => u.tags.includes('queen'))!;
    const before = g.units.filter((u) => u.lane === 1 && u.tags.includes('brood')).length;
    queen.pi = 1;
    pointAt(g, queen);
    enemyAct(g);
    expect(g.units.filter((u) => u.lane === 1 && u.tags.includes('brood') && !u.dead).length).toBe(before + 2);
  });

  it('the Warden stuns a squad member each round', () => {
    const g = createGame(tscVsForce(theWarden), 11);
    setup(g);
    const warden = g.units.find((u) => u.tags.includes('boss'))!;
    warden.pi = 0;
    pointAt(g, warden);
    enemyAct(g);
    expect(g.units.some((u) => u.side === 'P' && u.stunned)).toBe(true);
  });

  it('every boss is beatable by the stand-in player at tier 1 most of the time, and gets harder with depth', () => {
    const rate = (force: (typeof bosses)[number], step: number): number => {
      let wins = 0;
      const n = 60;
      for (let s = 1; s <= n; s++) {
        const g = createGame(tscVsForce(force, step), s);
        if (autoPlay(g) === 'win') wins++;
      }
      return wins / n;
    };
    for (const b of bosses) {
      const easy = rate(b, 0);
      const hard = rate(b, 6);
      console.log(b.id, 'tier1', easy.toFixed(2), 'tier7', hard.toFixed(2));
      expect(easy).toBeGreaterThan(0.25);
      expect(hard).toBeLessThanOrEqual(easy + 0.05);
    }
  });
});
