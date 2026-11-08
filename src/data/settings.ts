export const SETTINGS_KEY = 'hivedeck.settings';
export const SETTINGS_VERSION = 1;

export const textScaleOptions = [100, 125, 150] as const;
export type TextScale = (typeof textScaleOptions)[number];

/** Animation speed: 1 normal, 2 fast, 0 off. Used by every tween. */
export const animSpeedOptions = [1, 2, 0] as const;
export type AnimSpeed = (typeof animSpeedOptions)[number];

export interface Settings {
  version: number;
  volume: number; // 0 to 100
  fullscreen: boolean;
  textScale: TextScale;
  colorblind: boolean;
  animSpeed: AnimSpeed;
}

export const defaultSettings: Settings = {
  version: SETTINGS_VERSION,
  volume: 70,
  fullscreen: false,
  textScale: 100,
  colorblind: false,
  animSpeed: 1
};
