export const SETTINGS_KEY = 'hivedeck.settings';
export const SETTINGS_VERSION = 1;

export const textScaleOptions = [100, 125, 150] as const;
export type TextScale = (typeof textScaleOptions)[number];

/** Animation speed: 1 normal, 2 fast, 0 off. Used by every tween. */
export const animSpeedOptions = [1, 2, 0] as const;
export type AnimSpeed = (typeof animSpeedOptions)[number];

/** How a bought pack opens: one card at a time from a stack, or every card at once. */
export const packStyleOptions = ['rip', 'all'] as const;
export type PackStyle = (typeof packStyleOptions)[number];

/** Rip it only: which cards move along on their own. Blue and up always wait for a click. */
export const autoNextOptions = ['off', 'owned', 'all'] as const;
export type AutoNext = (typeof autoNextOptions)[number];

export interface Settings {
  version: number;
  volume: number; // 0 to 100
  fullscreen: boolean;
  textScale: TextScale;
  colorblind: boolean;
  animSpeed: AnimSpeed;
  packStyle: PackStyle;
  autoNext: AutoNext;
}

export const defaultSettings: Settings = {
  version: SETTINGS_VERSION,
  volume: 70,
  fullscreen: false,
  textScale: 100,
  colorblind: false,
  animSpeed: 1,
  packStyle: 'rip',
  autoNext: 'owned'
};
