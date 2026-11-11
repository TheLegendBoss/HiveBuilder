import tscDeckCsv from '../../data/tsc_starting_deck.csv?raw';
import { parseCsv } from '../sim/csv';
import { buildGearCards } from './gearCards';
import type { RarityId } from './palette';

export interface CardDef {
  name: string;
  count: number;
  source: string;
  sourceType: string;
  text: string;
  playFuel: number;
  ammoCost: number;
  fuelValue: number;
  /** attribute the card helps on a test, and by how much (0 for none) */
  checkAttribute: string;
  checkBonus: number;
  rarity: RarityId;
}

export function parseDeck(csv: string): CardDef[] {
  return parseCsv(csv).map((r) => ({
    name: r.name!,
    count: Number(r.count),
    source: r.source!,
    sourceType: r.source_type!,
    text: r.play_effect!,
    playFuel: Number(r.play_cost_fuel || 0),
    ammoCost: Number(r.ammo_cost || 0),
    fuelValue: Number(r.fuel_value || 1),
    checkAttribute: r.check_attribute ?? '',
    checkBonus: Number(r.check_bonus || 0),
    // The starting deck is all Basic. Gear cards will carry their own rarity once loot is wired in.
    rarity: ((r.rarity as RarityId | undefined) ?? 'white')
  }));
}

export const tscDeck: CardDef[] = parseDeck(tscDeckCsv);

/** Cards that loot gear brings with it, built from each item's actions. The deck for a squad adds them when carried. */
export const gearCardSpecs = buildGearCards(new Set(tscDeck.map((c) => c.source)), new Set(tscDeck.map((c) => c.name)));

export const cardDefs: Record<string, CardDef> = Object.fromEntries([...tscDeck, ...gearCardSpecs.map((s) => s.def)].map((c) => [c.name, c]));
