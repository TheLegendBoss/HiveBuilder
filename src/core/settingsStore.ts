import {
  SETTINGS_KEY,
  SETTINGS_VERSION,
  animSpeedOptions,
  defaultSettings,
  textScaleOptions,
  type AnimSpeed,
  type Settings,
  type TextScale
} from '../data/settings';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Turn whatever was stored into a valid Settings object. Never throws. */
export function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...defaultSettings };
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.volume === 'number' && Number.isFinite(r.volume)) {
    out.volume = Math.min(100, Math.max(0, Math.round(r.volume)));
  }
  if (typeof r.fullscreen === 'boolean') out.fullscreen = r.fullscreen;
  if (typeof r.textScale === 'number' && (textScaleOptions as readonly number[]).includes(r.textScale)) {
    out.textScale = r.textScale as TextScale;
  }
  if (typeof r.colorblind === 'boolean') out.colorblind = r.colorblind;
  if (typeof r.animSpeed === 'number' && (animSpeedOptions as readonly number[]).includes(r.animSpeed)) {
    out.animSpeed = r.animSpeed as AnimSpeed;
  }
  out.version = SETTINGS_VERSION;
  return out;
}

export function loadSettings(storage: ReadStorage | undefined = defaultStorage()): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    if (!text) return { ...defaultSettings };
    return sanitizeSettings(JSON.parse(text));
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings, storage: WriteStorage | undefined = defaultStorage()): boolean {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return storage !== undefined;
  } catch {
    return false;
  }
}
