import { tscDeck, type CardDef } from '../data/cards';
import { fallbackAction, gearActions, gearInfo, type GearAction } from '../data/gear';

/** One piece of a unit's gear and everything it lets the unit do. */
export interface LoadoutEntry {
  gear: string;
  /** weapon, armor, skill... taken from the cards that come with the gear */
  type: string;
  /** actions the unit can take with it without playing a card */
  actions: GearAction[];
  /** cards in the deck that need this gear, one entry per card name */
  cards: CardDef[];
  /** lines of the gear's text that do nothing in a fight yet */
  unsupported: string[];
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
      type: cards[0]?.sourceType ?? gearInfo(name)?.slot ?? '',
      actions: gearActions.filter((a) => a.gear === name),
      cards,
      unsupported: gearInfo(name)?.unsupported ?? []
    };
  });
  if (!out.some((e) => e.actions.length > 0)) out.push({ gear: fallbackAction.gear, type: 'weapon', actions: [fallbackAction], cards: [], unsupported: [] });
  return out;
}

/** One line of rules text for a basic gear action, built from its numbers. */
export function describeAction(a: GearAction): string {
  const cost = `Costs ${a.fuel} fuel${a.ammo ? ` and ${a.ammo} ammo` : ''}.`;
  if (a.soak) return `Restore ${a.soak} soak to the user. ${cost}`;
  if (a.heal) return `Restore ${a.heal} HP to one unit in the lane. ${cost}`;
  const dmg = a.dmgMax && a.dmgMax > a.dmg ? `${a.dmg} to ${a.dmgMax}` : `${a.dmg}`;
  const who = a.area ? 'every enemy in the lane' : a.targets > 1 ? `up to ${a.targets} units` : 'one unit';
  const parts = [`${dmg} damage to ${who}`];
  if (a.pierce) parts.push(`ignoring ${a.pierce} soak`);
  if (a.riders?.length) parts.push(`and ${a.riders.join(' and ')}${a.riderSolo ? ' if it is the only target' : ''}`);
  return `${parts.join(', ')}. ${cost}`;
}

/** Everything the loadout screen shows about one item: its slot, passives, actions and what does nothing yet. */
export function gearDetail(name: string, cls: string): string[] {
  const info = gearInfo(name);
  if (!info) return [`${cls || 'Supplies'}. Rides in the pack; it does nothing in a fight.`];
  const out: string[] = [];
  const slot = info.slot === 'weapon' ? `weapon slot, ${info.hands} hand${info.hands > 1 ? 's' : ''}` : info.slot === 'armor' ? 'armor slot' : info.slot === 'tool' ? 'tool slot' : 'no slot yet';
  out.push(`${info.cls} · ${slot}`);
  if (info.maxSoak) out.push(`Max soak +${info.maxSoak}`);
  if (info.ammo) out.push(`Ammo +${info.ammo} (shared by the unit's guns)`);
  for (const a of info.actions) out.push(`${a.name}: ${describeAction(a)}`);
  for (const l of info.unsupported) out.push(`Not in combat yet: ${l}`);
  return out;
}
