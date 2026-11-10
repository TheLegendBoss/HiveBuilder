import { describe, expect, it } from 'vitest';
import { lootPool } from '../data/loot';
import { autoAdvances, ownedFlags, reactionOf } from './packRip';

const card = (name: string) => lootPool.find((i) => i.name === name)!;

describe('pack ripper rules', () => {
  it('marks a repeat inside the pack as owned', () => {
    const cards = [card('Scrap cleaver'), card('Scrap cleaver'), card('Arc blade')];
    expect(ownedFlags(cards, [])).toEqual([false, true, false]);
    expect(ownedFlags(cards, ['Arc blade'])).toEqual([false, true, true]);
  });

  it('auto-next only moves Basic and Improved along', () => {
    expect(autoAdvances('white', true, 'off')).toBe(false);
    expect(autoAdvances('white', false, 'owned')).toBe(false);
    expect(autoAdvances('white', true, 'owned')).toBe(true);
    expect(autoAdvances('green', true, 'owned')).toBe(true);
    expect(autoAdvances('white', false, 'all')).toBe(true);
    expect(autoAdvances('blue', true, 'all')).toBe(false);
    expect(autoAdvances('gold', true, 'all')).toBe(false);
  });

  it('gets louder up the ladder', () => {
    const order = ['white', 'green', 'blue', 'purple', 'orange', 'red', 'gold'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(reactionOf(order[i]!).flash).toBeGreaterThan(reactionOf(order[i - 1]!).flash);
    }
    expect(reactionOf('white').stamp).toBe(false);
    expect(reactionOf('gold').shake).toBeGreaterThan(reactionOf('blue').shake);
  });
});
