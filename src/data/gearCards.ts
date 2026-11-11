import type { Attr } from '../sim/types';
import type { CardDef } from './cards';
import { allGearInfo, type GearAction, type GearInfo } from './gear';

/**
 * Loot gear adds cards to the deck (design: about 2 to 3 for a weapon, 1 to 2 for armor or a tool). Each action the item
 * offers becomes a card: the first comes twice, the rest once, up to three kinds. A card is the better version of the
 * basic action: 1 more damage and 1 less fuel, because the card itself is what you spend.
 */
export interface GearCardSpec {
  def: CardDef;
  action: GearAction;
}

export const attributeOf = (cls: string): Attr => {
  const c = cls.toLowerCase();
  if (c.startsWith('tool') || c.startsWith('accessory') || c.startsWith('explosive')) return 'tech';
  if (c.startsWith('defense') || c.startsWith('armor')) return 'nerve';
  if (c.startsWith('precision') || c.startsWith('sidearm')) return 'wits';
  return 'force';
};

const sourceTypeOf = (info: GearInfo): string =>
  info.cls.toLowerCase().startsWith('defense') ? 'defense' : info.slot === 'other' ? 'supply' : info.slot;

export function cardText(a: GearAction): string {
  if (a.soak) return `Restore ${a.soak} soak`;
  if (a.heal) return `Restore ${a.heal} HP to one unit in the lane`;
  const range = a.dmgMax !== undefined && a.dmgMax > a.dmg ? `${a.dmg} to ${a.dmgMax}` : `${a.dmg}`;
  const who = a.area ? 'every enemy in the lane' : a.targets > 1 ? `up to ${a.targets} enemies` : 'one enemy';
  const riders = a.riders?.length ? ` and ${a.riders.join(' and ')}${a.riderSolo ? ' if it is the only target' : ''}` : '';
  return `${range} damage to ${who}${riders}`;
}

/** The card version of an action: stronger damage, a lower fuel cost. */
export function cardAction(a: GearAction): GearAction {
  const up = a.dmg > 0 ? 1 : 0;
  return { ...a, dmg: a.dmg + up, dmgMax: a.dmgMax !== undefined ? a.dmgMax + up : undefined, fuel: Math.max(0, a.fuel - 1) };
}

/**
 * `skipSources` are gear names that already have cards (the starter deck); `takenNames` are card names in use, so two
 * items that share an action name get told apart.
 */
export function buildGearCards(skipSources: Set<string>, takenNames: Set<string>): GearCardSpec[] {
  const out: GearCardSpec[] = [];
  const used = new Set(takenNames);
  for (const info of allGearInfo()) {
    if (skipSources.has(info.name) || info.slot === 'other') continue;
    info.actions.slice(0, 3).forEach((a, i) => {
      const action = cardAction(a);
      const name = used.has(a.name) ? `${a.name} (${info.name})` : a.name;
      used.add(name);
      out.push({
        action,
        def: {
          name,
          count: i === 0 ? 2 : 1,
          source: info.name,
          sourceType: sourceTypeOf(info),
          text: cardText(action),
          playFuel: action.fuel,
          ammoCost: action.ammo,
          fuelValue: 1,
          checkAttribute: attributeOf(info.cls)[0]!.toUpperCase() + attributeOf(info.cls).slice(1),
          checkBonus: 1,
          rarity: 'white'
        }
      });
    });
  }
  return out;
}
