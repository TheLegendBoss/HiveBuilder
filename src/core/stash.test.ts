import { describe, expect, it } from 'vitest';
import { lootPool } from '../data/loot';
import { groupOf, stashView, tabCounts } from './stash';

const item = (name: string) => lootPool.find((i) => i.name === name)!;

describe('stash tabs', () => {
  it('sorts items into groups', () => {
    expect(groupOf(item('Scrap cleaver'))).toBe('weapons');
    expect(groupOf(item('Riot shield'))).toBe('weapons');
    expect(groupOf(item('Composite vest'))).toBe('armor');
    expect(groupOf(item('Field medkit'))).toBe('tools');
    expect(groupOf(item('Adrenal injector'))).toBe('tools');
    expect(groupOf(item('Red-dot sight'))).toBe('tools');
    expect(groupOf(item('Hive rations'))).toBe('supplies');
    expect(groupOf(item('Frag grenade'))).toBe('supplies');
  });

  it('filters a tab, best rarity first, and keeps real indexes', () => {
    const stash = [item('Scrap cleaver'), item('Composite vest'), { ...item('Pump shotgun'), rarity: 'blue' as const }, item('Arc blade')];
    const v = stashView(stash, 'weapons');
    expect(v.map((e) => e.item.name)).toEqual(['Pump shotgun', 'Arc blade', 'Scrap cleaver']);
    expect(v.map((e) => e.index)).toEqual([2, 3, 0]);
    expect(stashView(stash, 'all')).toHaveLength(4);
    expect(tabCounts(stash)).toEqual({ all: 4, weapons: 3, armor: 1, tools: 0, supplies: 0 });
  });
});
