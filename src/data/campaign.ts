import aftermathCsv from '../../data/aftermath_deck_droid.csv?raw';
import { createCampaign, launch, type AftermathCard, type Campaign, type CampaignConfig, type Loadout } from '../sim/campaign';
import { parseCsv } from '../sim/csv';
import { createExpedition, type Expedition, type ExpeditionConfig } from '../sim/expedition';
import { shuffleInPlace } from '../sim/rng';
import type { SandboxSetup } from './sandbox';
import { lootPool } from './loot';
import { expeditionDefaults, tscExpedition } from './rooms';
import { tscSquad } from './scenarios';

/** The droid aftermath deck: 35 cards. Short-term results are free reboots, lasting ones are minor or major repairs. */
export const droidAftermath: AftermathCard[] = parseCsv(aftermathCsv).map((r) => ({
  name: r.result!,
  cards: Number(r.cards),
  kind: r.type as AftermathCard['kind'],
  repair: r.repair as AftermathCard['repair'],
  effect: r.effect!
}));

/** Working numbers for the HQ; see decisions.md. Promotion costs are the design's 20, 40, 80, 160. */
export const campaignDefaults = {
  startEagles: 30,
  stashCap: 24,
  promoCosts: [20, 40, 80, 160],
  maxTier: 5,
  hpPerTier: 1,
  minorRepair: 1,
  majorRepair: 3,
  floorBonusXp: 5,
  patchXp: 3,
  powerPerSection: 1,
  purseStep: 5
};

export const tscCampaignConfig: CampaignConfig = {
  faction: 'tsc',
  crew: tscSquad,
  lootPool,
  aftermath: droidAftermath,
  packSize: expeditionDefaults.packSize,
  packPrice: expeditionDefaults.packPrice,
  packDraws: expeditionDefaults.packDraws,
  sellValue: expeditionDefaults.sellValue,
  ...campaignDefaults
};

export const newTscCampaign = (seed: number): Campaign => createCampaign(tscCampaignConfig, seed);

/** A fresh sandbox campaign under the setup dials: Eagles in the bank and a few loot items already in the stash. */
export function newSandboxCampaign(setup: SandboxSetup, seed: number): Campaign {
  const c = createCampaign({ ...tscCampaignConfig, startEagles: setup.startEagles }, seed);
  const deck = lootPool.slice();
  shuffleInPlace(deck, c);
  c.stash.push(...deck.slice(0, Math.min(setup.startItems, c.cfg.stashCap)));
  return c;
}

/** Saves keep the campaign's data but not its config; put the live config back. */
export const reattachConfig = (c: Campaign): Campaign => {
  c.cfg = tscCampaignConfig;
  return c;
};

/** Send the campaign's ready crew out with this loadout. */
export function launchTsc(c: Campaign, l: Loadout, seed: number, dials: Partial<ExpeditionConfig> = {}): Expedition {
  const out = launch(c, l);
  return createExpedition(tscExpedition(seed, { ...out, ...dials }));
}
