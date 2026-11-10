import { gearInfo } from '../data/gear';
import type { RarityId } from '../data/palette';
import type { LootItem } from '../sim/expedition';

/** The stash is shown in tabs by what an item is for. */
export type StashGroup = 'weapons' | 'armor' | 'tools' | 'supplies';
export type StashTab = StashGroup | 'all';

export const stashTabs: Array<{ id: StashTab; label: string }> = [
  { id: 'all', label: 'ALL' },
  { id: 'weapons', label: 'WEAPONS' },
  { id: 'armor', label: 'ARMOR' },
  { id: 'tools', label: 'TOOLS' },
  { id: 'supplies', label: 'SUPPLIES' }
];

const groupOrder: Record<StashGroup, number> = { weapons: 0, armor: 1, tools: 2, supplies: 3 };

/** Weapons and shields, armor, tools with accessories and attachments, and supplies with disposables. */
export function groupOf(item: LootItem): StashGroup {
  const slot = gearInfo(item.name)?.slot;
  if (slot === 'weapon') return 'weapons';
  if (slot === 'armor') return 'armor';
  if (slot === 'tool') return 'tools';
  const c = item.cls.toLowerCase();
  return c.startsWith('attachment') ? 'tools' : 'supplies';
}

const rarityRank: Record<RarityId, number> = { white: 0, green: 1, blue: 2, purple: 3, orange: 4, red: 5, gold: 6 };
export const rarityOf = (item: LootItem): RarityId => item.rarity ?? 'white';

export interface StashEntry {
  item: LootItem;
  /** place in the real stash list (what the pack and the sell button use) */
  index: number;
}

/** The items in a tab, best rarity first, then by name. Indexes still point into the real stash. */
export function stashView(stash: LootItem[], tab: StashTab): StashEntry[] {
  return stash
    .map((item, index) => ({ item, index }))
    .filter((e) => tab === 'all' || groupOf(e.item) === tab)
    .sort(
      (a, b) =>
        groupOrder[groupOf(a.item)] - groupOrder[groupOf(b.item)] ||
        rarityRank[rarityOf(b.item)] - rarityRank[rarityOf(a.item)] ||
        a.item.name.localeCompare(b.item.name) ||
        a.index - b.index
    );
}

export function tabCounts(stash: LootItem[]): Record<StashTab, number> {
  const out: Record<StashTab, number> = { all: stash.length, weapons: 0, armor: 0, tools: 0, supplies: 0 };
  for (const it of stash) out[groupOf(it)]++;
  return out;
}

export const pageCount = (n: number, per: number): number => Math.max(1, Math.ceil(n / per));
