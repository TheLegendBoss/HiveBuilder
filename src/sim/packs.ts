import type { RarityId } from '../data/palette';
import type { LootItem } from './expedition';
import { nextRandom } from './rng';

/**
 * The working pack ramp (a port of tools/pack_odds.py, placeholder numbers). Each slot rolls to step up a rung; the chance
 * on slot k is BASE + GROWTH * k, capped, and every higher rung is harder by DECAY per rung. There are no floors, and a
 * 5-card pack is the first 5 slots of the 15-slot ramp.
 */
export type PackTier = 'Basic' | 'Standard' | 'Veteran' | 'Elite' | 'Vault' | 'Eagle';

const BASE = 0.036;
const CAP = 0.85;
const GROWTH: Record<PackTier, number> = { Basic: 0.024, Standard: 0.042, Veteran: 0.06, Elite: 0.084, Vault: 0.12, Eagle: 0.168 };
const DECAY: Record<PackTier, number> = { Basic: 0.6, Standard: 0.6, Veteran: 0.6, Elite: 0.6, Vault: 0.65, Eagle: 0.685 };

/** Rungs from the bottom. The last rung is red or gold, which look the same to the ramp. */
export const RUNGS: RarityId[] = ['white', 'green', 'blue', 'purple', 'orange', 'red'];

export const slotChance = (tier: PackTier, k: number): number => Math.min(BASE + GROWTH[tier] * k, CAP);

/** Roll the rarity of each of the first `slots` slots. Red and gold share the top rung; it is a coin flip which one shows. */
export function rollRarities(rng: { rng: number }, tier: PackTier, slots: number): RarityId[] {
  const out: RarityId[] = [];
  for (let k = 0; k < slots; k++) {
    const p = slotChance(tier, k);
    let rung = 0;
    while (rung < RUNGS.length - 1 && nextRandom(rng) < p * DECAY[tier] ** rung) rung++;
    out.push(rung === RUNGS.length - 1 && nextRandom(rng) < 0.5 ? 'gold' : RUNGS[rung]!);
  }
  return out;
}

/** Draw a pack from a pool (with replacement), each card at its rolled rarity. */
export function rollPack(rng: { rng: number }, pool: LootItem[], tier: PackTier, slots: number): LootItem[] {
  const rarities = rollRarities(rng, tier, slots);
  return rarities.map((rarity) => ({ ...pool[Math.floor(nextRandom(rng) * pool.length)]!, rarity }));
}

/** The chance a pack of this size holds at least one card of this rung or better (for tests and tuning). */
export function chanceAtLeast(tier: PackTier, slots: number, rung: number): number {
  let none = 1;
  for (let k = 0; k < slots; k++) {
    let pr = 1;
    for (let r = 0; r < rung; r++) pr *= slotChance(tier, k) * DECAY[tier] ** r;
    none *= 1 - pr;
  }
  return 1 - none;
}
