import type { FactionId } from '../data/palette';
import type { Settings } from '../data/settings';
import { tscExpedition } from '../data/rooms';
import { createExpedition, type Expedition } from '../sim/expedition';
import { loadSettings, saveSettings } from './settingsStore';

/** Plain state shared by scenes. No phaser here. */
export const session = {
  faction: 'tsc' as FactionId,
  settings: loadSettings(),
  /** the sandbox expedition in progress, if any */
  expedition: null as Expedition | null
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
