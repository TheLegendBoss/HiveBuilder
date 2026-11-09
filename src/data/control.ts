import type { ControlDef, SectionFn } from '../sim/expedition';

/**
 * The five control rooms of the middle hive test floor (docs/design.md, "Sandbox control rooms").
 * Rewards are loot draws; the Secure room's recruit is not built, so it pays two plain draws instead (working).
 */
export const controlRooms: ControlDef[] = [
  { fn: 'power', room: 'Generator core', challenge: 'fight', forceId: 'dynamo', reward: { loot: 1, pick: 'any', note: 'a loot draw (one rarity higher, once rarity exists)' } },
  { fn: 'industrial', room: 'Foundry office', challenge: 'fight', forceId: 'foreman', reward: { loot: 1, pick: 'gear', note: 'a weapon or armor draw' } },
  { fn: 'supply', room: 'Storehouse', challenge: 'key', reward: { loot: 1, pick: 'supply', note: 'a supplies draw' } },
  { fn: 'secure', room: 'Cell block', challenge: 'fight', forceId: 'warden', reward: { loot: 2, pick: 'any', note: 'two loot draws (a recruit, once recruiting exists)' } },
  { fn: 'medical', room: 'Clinic ward', challenge: 'fight', forceId: 'queen', reward: { loot: 1, pick: 'medical', note: 'a medical gear draw' } }
];

/** Display names and one-line jobs for the HQ and the map. */
export const fnInfo: Record<SectionFn, { name: string; job: string }> = {
  power: { name: 'Power', job: 'Hold the Generator core for 6 rounds as the reactor overloads, or destroy the Runaway Dynamo.' },
  industrial: { name: 'Industrial', job: 'Beat the Foundry Foreman and his Pipe gang in the Foundry office.' },
  supply: { name: 'Supply', job: 'Open the Storehouse with the key. A guarded room or a scavenge in the section turns one up.' },
  secure: { name: 'Secure', job: 'Beat the Warden in the Cell block. He stuns a unit every round.' },
  medical: { name: 'Medical', job: 'Beat the Brood Queen in the Clinic ward. Killing her kills the swarm.' }
};

/** Power a claimed foothold pays every expedition: 1 at tier 1 up to 4 at tier 8. */
export const incomeAtTier = (tier: number): number => [1, 1, 2, 2, 3, 3, 4, 4][Math.min(8, Math.max(1, tier)) - 1]!;

/** Power it costs to claim a taken section: one for every three rooms, at least two. (Working.) */
export const claimCost = (rooms: number): number => Math.max(2, Math.ceil(rooms / 3));
