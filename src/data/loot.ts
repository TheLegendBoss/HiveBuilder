import lootCsv from '../../data/loot_pool_base_items.csv?raw';
import { parseCsv } from '../sim/csv';
import type { LootItem } from '../sim/expedition';

/**
 * Items that do something on the map. The CSV gives the text; the amounts are working numbers
 * (the design says Hive rations "restore rations for the counter" without a number).
 */
const mapUse: Record<number, LootItem['use']> = {
  24: { kind: 'rations', amount: 4 },
  26: { kind: 'heal', amount: 4 },
  29: { kind: 'heal', amount: 2 }
};

/** The 30 base items, white versions. Gear cannot be equipped yet, so most items just ride in the pack. */
export const lootPool: LootItem[] = parseCsv(lootCsv).map((r) => ({
  id: Number(r.id),
  name: r.base_item!,
  cls: r.class!,
  text: r.white_version!,
  use: mapUse[Number(r.id)] ?? null
}));
