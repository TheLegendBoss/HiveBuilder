import tiersCsv from '../../data/hazard_gamble_tiers.csv?raw';
import { parseCsv } from '../sim/csv';
import type { GambleDef, Ladder } from '../sim/expedition';

/**
 * The four Gamble cards from the design doc that the sandbox can pay out today.
 * Left out: Shrine offering (stakes stress) and Toll-booth bet (stakes a gear card).
 * "Supplies" stakes are rations, and the Quartermaster's "supply cards" pay rations.
 */
export const gambleDefs: GambleDef[] = [
  { id: 1, name: 'Back-alley dice', stake: 'eagles', reward: 'eagles', blurb: 'Crooked dice in a stairwell. Stake Eagles, win Eagles.' },
  { id: 2, name: "Scavver's wager", stake: 'rations', reward: 'loot', blurb: 'A scavver bets you cannot out-pull him. Stake rations, win loot draws.' },
  { id: 5, name: 'Pit side bet', stake: 'eagles', reward: 'xp', blurb: 'Bets on a pit fight. Stake Eagles, win experience.' },
  { id: 6, name: "Quartermaster's crate", stake: 'rations', reward: 'rations', blurb: 'A sealed crate, no questions. Stake rations, win more.' }
];

interface Row {
  stake: number;
  rungs: [number, number, number];
}

const eagleTable: Row[] = parseCsv(tiersCsv).map((r) => ({
  stake: Number(r.gamble_stake),
  rungs: [Number(r.rung_1), Number(r.rung_2), Number(r.rung_3)]
}));

/** Supplies stakes run from 1 at tiers 1 and 2 up to 3 at tiers 7 and 8. */
const supplyStake = [1, 1, 2, 2, 2, 2, 3, 3];
const count = {
  loot: { early: [1, 2, 4], late: [2, 3, 6] },
  rations: { early: [1, 2, 4], late: [2, 3, 6] },
  xp: { early: [2, 4, 8], late: [3, 6, 12] }
} as const;

function ladderAt(def: GambleDef, tier: number): Ladder {
  const eagle = eagleTable[tier - 1]!;
  const stake = def.stake === 'eagles' ? eagle.stake : supplyStake[tier - 1]!;
  if (def.reward === 'eagles') return { stake, rungs: eagle.rungs };
  const set = count[def.reward][tier <= 4 ? 'early' : 'late'];
  return { stake, rungs: [set[0]!, set[1]!, set[2]!] };
}

/** ladders[gamble id][tier - 1] for tiers 1 to 8. */
export const gambleLadders: Record<number, Ladder[]> = Object.fromEntries(
  gambleDefs.map((d) => [d.id, Array.from({ length: 8 }, (_, i) => ladderAt(d, i + 1))])
);
