import { drawResult } from './cards';
import { nextRandom } from './rng';
import type { Ev, Game, InitiativeDraw } from './types';

function draw(g: Game): { squad: InitiativeDraw; enemy: InitiativeDraw; squadWins: boolean } {
  const suitA = Math.floor(nextRandom(g) * 4);
  const suitB = (suitA + 1 + Math.floor(nextRandom(g) * 3)) % 4;
  const squad: InitiativeDraw = { value: drawResult(g), suit: suitA };
  const enemy: InitiativeDraw = { value: drawResult(g), suit: suitB };
  const squadWins = squad.value !== enemy.value ? squad.value > enemy.value : squad.suit > enemy.suit;
  return { squad, enemy, squadWins };
}

/** The deployment draw: the higher card deploys second and so sees the other lineup; the lower deploys first. */
export function rollDeployment(g: Game): Ev[] {
  const { squad, enemy, squadWins } = draw(g);
  g.deployFirst = squadWins ? 'E' : 'P';
  return [
    { t: 'deployDraw', squad, enemy, second: squadWins ? 'P' : 'E' },
    { t: 'log', text: `Deployment: squad ${squad.value}, enemy ${enemy.value}. ${squadWins ? 'The squad deploys second and sees the enemy lineup.' : 'The squad deploys first, blind.'}` }
  ];
}

/**
 * Each side draws a results card off the top of the deck. The higher value acts first for the
 * round; a tie goes to the higher suit (suits only break ties). The deck keeps no suits,
 * so each side gets a random, different one for the draw.
 */
export function rollInitiative(g: Game): Ev[] {
  const { squad, enemy, squadWins } = draw(g);
  const first = squadWins ? 'P' : 'E';
  g.first = first;
  g.turn = first;
  return [
    { t: 'initiative', squad, enemy, first },
    { t: 'log', text: `Initiative: squad ${squad.value}, enemy ${enemy.value}. ${first === 'P' ? 'The squad' : 'The enemy'} acts first.` }
  ];
}
