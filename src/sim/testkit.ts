import { listActions, perform } from './actions';
import { enemyAct } from './enemy';
import { openFight, playerBodies } from './turn';
import type { Game } from './types';

/** The three units every test squad opens with, and the lane each one takes. */
export const BASE_LANES: Record<string, number> = { 'Line A': 0, Vanguard: 1, 'Line B': 2 };

/** Stack the top of the results deck so the next initiative draw goes to `side`. */
export function stackFirst(g: Game, side: 'P' | 'E'): void {
  if (side === 'P') g.results.push(1, 13);
  else g.results.push(13, 1);
}

/** Skip deployment for a hand-built board: the fight is on, round as set, and it is the squad's turn with a full pool. */
export function enterFight(g: Game): void {
  g.phase = 'fight';
  g.enemyDeployed = true;
  g.first = 'P';
  g.turn = 'P';
  g.pool = playerBodies(g);
  g.epool = 0;
}

/** Let the enemy act until the squad has the turn again (or the fight ends). */
export function runEnemy(g: Game, limit = 200): void {
  for (let i = 0; i < limit && !g.result && g.phase === 'fight' && g.turn === 'E'; i++) enemyAct(g);
}

/**
 * Plays the deployment phase the way the old three setup rounds did: Line A, Vanguard and Line B take their lanes, and
 * `extras` names others to deploy too (into the given lane). Then Ready. Leaves it the squad's turn.
 */
export function startFight(g: Game, extras: Record<string, number> = {}): void {
  openFight(g);
  const lanes = { ...BASE_LANES, ...extras };
  for (const [name, lane] of Object.entries(lanes)) {
    const u = g.units.find((x) => x.side === 'P' && x.name === name && x.lane === null);
    if (!u) continue;
    const a = listActions(g).find((x) => x.kind === 'deploy' && x.unit === u.id && x.lane === lane);
    if (a) perform(g, a);
  }
  stackFirst(g, 'P');
  perform(g, listActions(g).find((x) => x.kind === 'ready')!);
  runEnemy(g);
}

/** The squad ends its turn; the enemy plays its turn if it comes next; the next round opens until it is the squad's turn. */
export function endTurn(g: Game, next: 'P' | 'E' = 'P'): void {
  if (g.result || g.turn !== 'P') return;
  stackFirst(g, next);
  perform(g, listActions(g).find((x) => x.kind === 'pass')!);
  runEnemy(g);
}

/** The squad passes (its first-turn rule: it went first this round) and the enemy's turn opens, ready for single `enemyAct` calls. */
export function handOver(g: Game): void {
  if (g.result || g.turn !== 'P') return;
  perform(g, listActions(g).find((x) => x.kind === 'pass')!);
}
