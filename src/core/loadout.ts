import { tscDeck, type CardDef } from '../data/cards';
import { fallbackAction, gearActions, type GearAction } from '../data/gearActions';

/** One piece of a unit's gear and everything it lets the unit do. */
export interface LoadoutEntry {
  gear: string;
  /** weapon, armor, skill... taken from the cards that come with the gear */
  type: string;
  /** actions the unit can take with it without playing a card */
  actions: GearAction[];
  /** cards in the deck that need this gear, one entry per card name */
  cards: CardDef[];
}

/**
 * What a unit carries, in the order it was equipped. A unit with no gear action of its own is shown with the armory
 * stub pistol, since that is what it falls back on.
 */
export function loadoutOf(gear: string[]): LoadoutEntry[] {
  const out: LoadoutEntry[] = gear.map((name) => {
    const cards = tscDeck.filter((c) => c.source === name);
    return {
      gear: name,
      type: cards[0]?.sourceType ?? '',
      actions: gearActions.filter((a) => a.gear === name),
      cards
    };
  });
  if (!out.some((e) => e.actions.length > 0)) out.push({ gear: fallbackAction.gear, type: 'weapon', actions: [fallbackAction], cards: [] });
  return out;
}
