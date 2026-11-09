import { drawUp } from './state';
import type { Ev, Game } from './types';

/** Start of the squad's action: the hand refills, and a new round begins when the squad goes first. */
export function beginTurn(g: Game): Ev[] {
  const ev: Ev[] = [];
  if (g.result) return ev;
  if (g.first === 'P') g.round += 1;
  g.turn = 'P';
  drawUp(g, ev);
  return ev;
}

/** Start of the enemy's action: a new round begins when the enemy goes first. */
export function beginEnemyTurn(g: Game): Ev[] {
  const ev: Ev[] = [];
  if (g.result) return ev;
  if (g.first === 'E') g.round += 1;
  g.turn = 'E';
  drawUp(g, ev);
  return ev;
}
