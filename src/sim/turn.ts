import { drawUp } from './state';
import type { Ev, Game } from './types';

/** Start of the player's action: a new round begins and the hand refills. */
export function beginTurn(g: Game): Ev[] {
  const ev: Ev[] = [];
  if (g.result) return ev;
  g.round += 1;
  g.turn = 'P';
  drawUp(g, ev);
  return ev;
}
