import type { Campaign } from '../sim/campaign';
import type { Expedition } from '../sim/expedition';
import { clampSetup, type SandboxSetup } from '../data/sandbox';

/** Saves are plain JSON in localStorage: one autosave, three manual slots and one quickstart preset. */
export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
export type SlotId = 'auto' | 1 | 2 | 3;
export const slotIds: SlotId[] = ['auto', 1, 2, 3];

const keyOf = (slot: SlotId): string => `hivedeck.save.${slot}`;
export const QUICKSTART_KEY = 'hivedeck.quickstart';

export interface SaveGame {
  version: number;
  savedAt: number;
  setup: SandboxSetup;
  campaign: Campaign;
  /** the expedition in progress, if the squad is out */
  expedition: Expedition | null;
}

export interface SlotInfo {
  slot: SlotId;
  empty: boolean;
  savedAt?: number;
  /** one line: where the campaign stands */
  summary?: string;
  /** true when the slot holds data this build cannot read */
  broken?: boolean;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): Store | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function isSave(x: unknown): x is SaveGame {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<SaveGame>;
  return s.version === SAVE_VERSION && typeof s.savedAt === 'number' && typeof s.campaign === 'object' && s.campaign !== null && typeof s.setup === 'object';
}

export function summarize(s: SaveGame): string {
  const c = s.campaign;
  const where = s.expedition && s.expedition.status === 'running' ? `on the floor, section ${s.expedition.section + 1}` : 'at the HQ';
  return `${where} · ${c.eagles} Eagles · ${c.expeditions} runs · tier ${s.setup.startTier} start`;
}

export function writeSlot(slot: SlotId, save: SaveGame, store: Store | undefined = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(keyOf(slot), JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Read a slot back, or null if it is empty or unreadable. The campaign comes back as plain data; the caller reattaches its config. */
export function readSlot(slot: SlotId, store: Store | undefined = defaultStore()): SaveGame | null {
  try {
    const text = store?.getItem(keyOf(slot));
    if (!text) return null;
    const parsed: unknown = JSON.parse(text);
    if (!isSave(parsed)) return null;
    parsed.setup = clampSetup(parsed.setup);
    return parsed;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: SlotId, store: Store | undefined = defaultStore()): void {
  try {
    store?.removeItem(keyOf(slot));
  } catch {
    /* nothing to do */
  }
}

export function slotInfo(slot: SlotId, store: Store | undefined = defaultStore()): SlotInfo {
  let raw: string | null | undefined;
  try {
    raw = store?.getItem(keyOf(slot));
  } catch {
    raw = null;
  }
  if (!raw) return { slot, empty: true };
  const save = readSlot(slot, store);
  if (!save) return { slot, empty: false, broken: true };
  return { slot, empty: false, savedAt: save.savedAt, summary: summarize(save) };
}

export const hasAutosave = (store: Store | undefined = defaultStore()): boolean => readSlot('auto', store) !== null;

export function saveQuickstart(setup: SandboxSetup, store: Store | undefined = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(QUICKSTART_KEY, JSON.stringify(setup));
    return true;
  } catch {
    return false;
  }
}

export function loadQuickstart(store: Store | undefined = defaultStore()): SandboxSetup | null {
  try {
    const text = store?.getItem(QUICKSTART_KEY);
    if (!text) return null;
    return clampSetup(JSON.parse(text) as Partial<SandboxSetup>);
  } catch {
    return null;
  }
}
