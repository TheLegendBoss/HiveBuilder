import { rollDeployment, rollInitiative } from './initiative';
import { checkResult, closeRound, deployUnit, drawUp, isLive, unitById } from './state';
import type { Ev, Game } from './types';

/**
 * How a fight runs.
 *
 * Deployment first: the deployment draw says who deploys second (the winner, who sees the other lineup). The enemy
 * puts its whole starting force on the board in one go; the squad deploys any of its units one at a time, into any
 * lane, then says Ready. Nobody deploys after that.
 *
 * Then rounds. Each round both sides draw for initiative; the winner takes the first turn. A turn is a pool of actions:
 * one per body that can act when the turn opens (a unit on the board, up and not stunned). The enemy acts once per
 * body, its units in lane order. When both turns are done the round closes: burning ticks and timers count down.
 */

/** Squad bodies that can act this turn. */
export const playerBodies = (g: Game): number => g.units.filter((u) => u.side === 'P' && u.lane !== null && isLive(u) && !u.stunned).length;

/** Enemy bodies on the board. */
export const enemyBodies = (g: Game): number => g.units.filter((u) => u.side === 'E' && u.lane !== null && !u.dead).length;

/** The whole enemy force lands: start units in their lanes, then the extras beside them. */
export function deployEnemy(g: Game, ev: Ev[]): void {
  if (g.enemyDeployed) return;
  g.enemyDeployed = true;
  g.enemyStart.forEach((id, i) => {
    const u = unitById(g, id);
    const lane = g.scenario.startLanes?.[i] ?? i;
    deployUnit(g, u, lane, ev);
    ev.push({ t: 'log', text: `${u.name} takes lane ${lane + 1}` });
  });
  for (const a of g.enemyAlso) {
    const u = unitById(g, a.id);
    deployUnit(g, u, a.lane, ev);
    ev.push({ t: 'log', text: `${u.name} takes lane ${a.lane + 1}` });
  }
}

/** Opens a fight with the deployment draw. The side that drew low deploys first. */
export function openFight(g: Game): Ev[] {
  if (g.stats['opened']) return [];
  g.stats['opened'] = 1;
  const ev = rollDeployment(g);
  if (g.deployFirst === 'E') deployEnemy(g, ev);
  return ev;
}

/** The squad is ready: the enemy deploys if it has not, and round 1 begins. */
export function finishDeployment(g: Game, ev: Ev[]): void {
  deployEnemy(g, ev);
  g.phase = 'fight';
  startRound(g, ev);
}

/** A new round: the initiative draw, then the winner's turn. */
export function startRound(g: Game, ev: Ev[]): void {
  if (g.result) return;
  // Safety net: a fight that cycles empty rounds forever is a lost fight, not a hang.
  if (g.round >= 400) {
    g.result = 'loss';
    ev.push({ t: 'result', result: 'loss' });
    return;
  }
  g.round += 1;
  ev.push({ t: 'round', round: g.round });
  ev.push(...rollInitiative(g));
  beginSide(g, g.first, ev);
}

function beginSide(g: Game, side: 'P' | 'E', ev: Ev[]): void {
  if (g.result) return;
  if (side === 'P') {
    g.turn = 'P';
    drawUp(g, ev);
    g.pool = playerBodies(g);
    ev.push({ t: 'turn', side: 'P', actions: g.pool });
    if (g.pool <= 0) {
      ev.push({ t: 'log', text: 'Nobody can act. The turn passes.' });
      endPlayerTurn(g, ev);
    }
  } else {
    g.turn = 'E';
    g.epool = enemyBodies(g);
    ev.push({ t: 'turn', side: 'E', actions: g.epool });
    if (g.epool <= 0) endEnemyTurn(g, ev);
  }
}

function closeAndContinue(g: Game, ev: Ev[]): void {
  closeRound(g, ev);
  checkResult(g, ev);
  if (!g.result) startRound(g, ev);
}

/** The squad's turn is over (the pool ran out or it passed). A stun costs a unit its turn and wears off with it. */
export function endPlayerTurn(g: Game, ev: Ev[]): void {
  g.pool = 0;
  for (const u of g.units) {
    if (u.side === 'P' && u.stunned && u.lane !== null) {
      u.stunned = false;
      ev.push({ t: 'status', unit: u.id, status: 'stunned', on: false });
    }
  }
  if (g.first === 'E') closeAndContinue(g, ev);
  else beginSide(g, 'E', ev);
}

/** The enemy's turn is over. */
export function endEnemyTurn(g: Game, ev: Ev[]): void {
  g.epool = 0;
  if (g.first === 'P') closeAndContinue(g, ev);
  else beginSide(g, 'P', ev);
}
