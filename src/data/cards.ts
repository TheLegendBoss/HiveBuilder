import tscDeckCsv from '../../data/tsc_starting_deck.csv?raw';
import { parseCsv } from '../sim/csv';

export interface CardDef {
  name: string;
  count: number;
  source: string;
  sourceType: string;
  text: string;
  playFuel: number;
  ammoCost: number;
  fuelValue: number;
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
    fuelValue: Number(r.fuel_value || 1)
  }));
}

export const tscDeck: CardDef[] = parseDeck(tscDeckCsv);
export const cardDefs: Record<string, CardDef> = Object.fromEntries(tscDeck.map((c) => [c.name, c]));
