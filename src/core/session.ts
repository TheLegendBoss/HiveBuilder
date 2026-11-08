import type { FactionId } from '../data/palette';
import type { Settings } from '../data/settings';
import { launchTsc, newTscCampaign } from '../data/campaign';
import { tscExpedition } from '../data/rooms';
import type { Campaign, Debrief, Loadout } from '../sim/campaign';
import { createExpedition, type Expedition } from '../sim/expedition';
import { loadSettings, saveSettings } from './settingsStore';

/** Plain state shared by scenes. No phaser here. */
export const session = {
  faction: 'tsc' as FactionId,
  settings: loadSettings(),
  /** the sandbox expedition in progress, if any */
  expedition: null as Expedition | null,
  /** the sandbox campaign: Eagles, crew and stash kept between expeditions (lives in memory until saves arrive in M5) */
  campaign: null as Campaign | null,
  /** what the last expedition did, shown once when the HQ opens */
  debrief: null as Debrief | null
};

export function updateSettings(patch: Partial<Settings>): Settings {
  session.settings = { ...session.settings, ...patch };
  saveSettings(session.settings);
  return session.settings;
}

export function setFaction(faction: FactionId): void {
  session.faction = faction;
}

/** Begin a fresh sandbox expedition. ?seed=N in the address replays the same floor. */
export function startExpedition(seed?: number): Expedition {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  const s = seed ?? (Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 1e9));
  session.expedition = createExpedition(tscExpedition(s));
  return session.expedition;
}

const seedFromUrl = (): number | null => {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : null;
};

/** The sandbox campaign, started on first use. */
export function campaign(): Campaign {
  session.campaign ??= newTscCampaign(seedFromUrl() ?? Math.floor(Math.random() * 1e9));
  return session.campaign;
}

/** Send the crew out from the HQ with a purse and a pack. */
export function launchExpedition(loadout: Loadout): Expedition {
  const seed = seedFromUrl() ?? Math.floor(Math.random() * 1e9);
  session.expedition = launchTsc(campaign(), loadout, seed);
  return session.expedition;
}
