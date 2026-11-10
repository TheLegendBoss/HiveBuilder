import { describe, expect, it } from 'vitest';
import { lootPool } from '../data/loot';
import { chanceAtLeast, rollPack, rollRarities } from './packs';

describe('pack ramp', () => {
  it('matches the working odds table', () => {
    // tools/pack_odds.py: Basic 15-card pack, chance of blue or better
    expect(chanceAtLeast('Basic', 15, 2)).toBeGreaterThan(0.2);
    expect(chanceAtLeast('Basic', 15, 2)).toBeLessThan(0.5);
    expect(chanceAtLeast('Basic', 5, 2)).toBeLessThan(chanceAtLeast('Basic', 15, 2));
    expect(chanceAtLeast('Eagle', 15, 2)).toBeGreaterThan(chanceAtLeast('Basic', 15, 2));
  });

  it('is repeatable from a seed and mostly white in a Basic 5-card pack', () => {
    const a = rollRarities({ rng: 5 }, 'Basic', 5);
    const b = rollRarities({ rng: 5 }, 'Basic', 5);
    expect(a).toEqual(b);
    const counts: Record<string, number> = {};
    const g = { rng: 11 };
    for (let i = 0; i < 400; i++) for (const r of rollRarities(g, 'Basic', 5)) counts[r] = (counts[r] ?? 0) + 1;
    expect(counts.white!).toBeGreaterThan(counts.green!);
    expect(counts.green!).toBeGreaterThan(counts.blue ?? 0);
    expect(counts.white! / 2000).toBeGreaterThan(0.8);
  });

  it('draws real items with a rarity each', () => {
    const pack = rollPack({ rng: 3 }, lootPool, 'Basic', 5);
    expect(pack).toHaveLength(5);
    for (const it of pack) {
      expect(lootPool.some((p) => p.id === it.id)).toBe(true);
      expect(it.rarity).toBeTruthy();
    }
  });
});
