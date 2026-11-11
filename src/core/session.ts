import type { FactionId } from '../data/palette';
import type { Settings } from '../data/settings';
import { launchTsc, newSandboxCampaign, reattachConfig } from '../data/campaign';
import { defaultSetup, type SandboxSetup } from '../data/sandbox';
import { tscExpedition } from '../data/rooms';
import { frontier, type Campaign, type Debrief, type Loadout } from '../sim/campaign';
import { createExpedition, type Expedition } from '../sim/expedition';
import { loadSettings, saveSettings } from './settingsStore';
import { SAVE_VERSION, readSlot, writeSlot, type SaveGame, type SlotId } from './saves';

/** Plain state shared by scenes. No phaser here. */
export const session = {
  faction: 'tsc' as FactionId,
  settings: loadSettings(),
  /** the sandbox expedition in progress, if any */
  expedition: null as Expedition | null,
  /** the sandbox dials this campaign started with */
  setup: { ...defaultSetup } as SandboxSetup,
  /** the sandbox campaign: Eagles, crew and stash kept between expeditions */
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
  session.setup = { ...session.setup, faction };
}

/** Begin a new sandbox campaign under these dials. */
export function startCampaign(setup: SandboxSetup): Campaign {
  session.setup = { ...setup };
  session.faction = setup.faction;
  session.expedition = null;
  session.debrief = null;
  session.campaign = newSandboxCampaign(setup, seedFromUrl() ?? Math.floor(Math.random() * 1e9));
  autosave();
  return session.campaign;
}

// ---------- saves

export function snapshot(): SaveGame | null {
  if (!session.campaign) return null;
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    setup: session.setup,
    campaign: session.campaign,
    expedition: session.expedition
  };
}

/** Write the autosave. Called when the HQ opens and after every move on the map. */
export function autosave(): void {
  const s = snapshot();
  if (s) writeSlot('auto', s);
}

export function saveToSlot(slot: SlotId): boolean {
  const s = snapshot();
  return s ? writeSlot(slot, s) : false;
}

/** Put a saved game into the session. Returns false if the slot is empty or unreadable. */
export function loadFromSlot(slot: SlotId): boolean {
  const s = readSlot(slot);
  if (!s) return false;
  session.setup = s.setup;
  session.faction = s.setup.faction;
  session.campaign = reattachConfig(s.campaign);
  session.expedition = s.expedition;
  session.debrief = null;
  return true;
}

/** Begin a fresh sandbox expedition. ?seed=N in the address replays the same floor. */
export function startExpedition(seed?: number): Expedition {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  const s = seed ?? (Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 1e9));
  session.expedition = createExpedition(tscExpedition(s, { startTier: session.setup.startTier, ramp: session.setup.ramp, sections: session.setup.sections }));
  return session.expedition;
}

const seedFromUrl = (): number | null => {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : null;
};

/** Drop the campaign for good (it was lost, or a new one is starting). */
export function endCampaign(): void {
  session.campaign = null;
  session.expedition = null;
  session.debrief = null;
}

/** The sandbox campaign, started on first use. */
export function campaign(): Campaign {
  return session.campaign ?? startCampaign(session.setup);
}

/** Send the crew out from the HQ with a purse and a pack. */
export function launchExpedition(loadout: Loadout): Expedition {
  const seed = seedFromUrl() ?? Math.floor(Math.random() * 1e9);
  const { startTier, ramp, sections } = session.setup;
  const c = campaign();
  session.expedition = launchTsc(c, loadout, seed, { startTier, ramp, sections, startSection: Math.min(loadout.startSection ?? frontier(c, sections), sections - 1) });
  return session.expedition;
}
