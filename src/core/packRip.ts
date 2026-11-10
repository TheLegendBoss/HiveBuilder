import type { RarityId } from '../data/palette';
import type { AutoNext } from '../data/settings';
import type { LootItem } from '../sim/expedition';

/** Every item name the player has: in the stash, on a crew member, or carried in a pack. */
export function ownedNames(stash: LootItem[], crew: Array<{ equipped: LootItem[] }>, pack: LootItem[] = []): string[] {
  return [...stash, ...crew.flatMap((m) => m.equipped), ...pack].map((i) => i.name);
}

/** For each card in pack order: did the player already own a copy (in the stash, on a crew member, or earlier in this pack)? */
export function ownedFlags(cards: LootItem[], owned: Iterable<string>): boolean[] {
  const have = new Set(owned);
  return cards.map((c) => {
    const had = have.has(c.name);
    have.add(c.name);
    return had;
  });
}

/** Auto-next moves Basic and Improved cards along by themselves. Blue and up always wait for a click. */
export function autoAdvances(rarity: RarityId, owned: boolean, mode: AutoNext): boolean {
  if (mode === 'off') return false;
  if (rarity !== 'white' && rarity !== 'green') return false;
  return mode === 'all' || owned;
}

export interface Reaction {
  /** screen shake in reference pixels */
  shake: number;
  /** peak alpha of the rarity-colored flash */
  flash: number;
  /** a rarity stamp slams onto the card */
  stamp: boolean;
}

/** How hard a pull hits. Basic is silent; each rung louder; the top three shake the screen. */
export function reactionOf(r: RarityId): Reaction {
  switch (r) {
    case 'white': return { shake: 0, flash: 0, stamp: false };
    case 'green': return { shake: 0, flash: 0.08, stamp: true };
    case 'blue': return { shake: 2, flash: 0.18, stamp: true };
    case 'purple': return { shake: 4, flash: 0.28, stamp: true };
    case 'orange': return { shake: 7, flash: 0.4, stamp: true };
    case 'red': return { shake: 10, flash: 0.5, stamp: true };
    case 'gold': return { shake: 14, flash: 0.65, stamp: true };
  }
}
