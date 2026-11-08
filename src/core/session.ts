import type { FactionId } from '../data/palette';
import type { Settings } from '../data/settings';
import { loadSettings, saveSettings } from './settingsStore';

/** Plain state shared by scenes. No phaser here. */
export const session = {
  faction: 'tsc' as FactionId,
  settings: loadSettings()
};

export function updateSettings(patch: Partial<Settings>): Settings {
  session.settings = { ...session.settings, ...patch };
  saveSettings(session.settings);
  return session.settings;
}

export function setFaction(faction: FactionId): void {
  session.faction = faction;
}
