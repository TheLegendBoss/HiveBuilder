import { describe, expect, it } from 'vitest';
import { defaultSettings, SETTINGS_KEY } from '../data/settings';
import { loadSettings, sanitizeSettings, saveSettings } from './settingsStore';

function memory(initial?: string) {
  let value = initial;
  return {
    getItem: (k: string) => (k === SETTINGS_KEY ? (value ?? null) : null),
    setItem: (k: string, v: string) => {
      if (k === SETTINGS_KEY) value = v;
    },
    peek: () => value
  };
}

describe('settings store', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(memory())).toEqual(defaultSettings);
  });
  it('returns defaults when storage is missing or throws', () => {
    expect(loadSettings(undefined)).toEqual(defaultSettings);
    const bad = { getItem: () => { throw new Error('blocked'); } };
    expect(loadSettings(bad)).toEqual(defaultSettings);
  });
  it('returns defaults for corrupt JSON', () => {
    expect(loadSettings(memory('{nope'))).toEqual(defaultSettings);
  });
  it('round-trips valid settings', () => {
    const m = memory();
    const s = { ...defaultSettings, volume: 20, textScale: 150 as const, fullscreen: true };
    expect(saveSettings(s, m)).toBe(true);
    expect(loadSettings(m)).toEqual(s);
  });
  it('clamps and rejects bad values', () => {
    const s = sanitizeSettings({ volume: 999, textScale: 130, animSpeed: 7, colorblind: 'yes' });
    expect(s.volume).toBe(100);
    expect(s.textScale).toBe(100);
    expect(s.animSpeed).toBe(1);
    expect(s.colorblind).toBe(false);
  });
  it('reports failure when saving cannot work', () => {
    const bad = { setItem: () => { throw new Error('full'); } };
    expect(saveSettings(defaultSettings, bad)).toBe(false);
    expect(saveSettings(defaultSettings, undefined)).toBe(false);
  });
});
