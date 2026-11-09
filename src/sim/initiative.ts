import { drawResult } from './cards';
import { nextRandom } from './rng';
import type { Ev, Game, InitiativeDraw } from './types';

/**
 * Each side draws a results card off the top of the deck. The higher value acts first for the
 * whole fight; a tie goes to the higher suit (suits only break ties). The deck keeps no suits,
 * so each side gets a random, different one for the draw.
 */
export function rollInitiative(g: Game): Ev[] {
  const suitA = Math.floor(nextRandom(g) * 4);
  const suitB = (suitA + 1 + Math.floor(nextRandom(g) * 3)) % 4;
  const squad: InitiativeDraw = { value: drawResult(g), suit: suitA };
  const enemy: InitiativeDraw = { value: drawResult(g), suit: suitB };
  const first = squad.value !== enemy.value ? (squad.value > enemy.value ? 'P' : 'E') : squad.suit > enemy.suit ? 'P' : 'E';
  g.first = first;
  g.turn = first;
  return [
    { t: 'initiative', squad, enemy, first },
    { t: 'log', text: `Initiative: squad ${squad.value}, enemy ${enemy.value}. ${first === 'P' ? 'The squad' : 'The enemy'} acts first.` }
  ];
}
