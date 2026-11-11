import type { FactionId } from './palette';

/** The sandbox dials: where the depth ramp starts and how fast it climbs, plus what you begin with. */
export interface SandboxSetup {
  faction: FactionId;
  /** tier of the first section of every expedition, 1 to 8 */
  startTier: number;
  /** sections per tier step, 1 to 4 */
  ramp: number;
  /** sections in one expedition, 1 to 14 */
  sections: number;
  /** Eagles in the bank when the campaign starts */
  startEagles: number;
  /** loot items already in the stash */
  startItems: number;
}

export const setupLimits = {
  startTier: { min: 1, max: 8, step: 1 },
  ramp: { min: 1, max: 4, step: 1 },
  sections: { min: 1, max: 14, step: 1 },
  startEagles: { min: 0, max: 200, step: 10 },
  startItems: { min: 0, max: 12, step: 1 }
} as const;

export type SetupDial = keyof typeof setupLimits;

export const defaultSetup: SandboxSetup = { faction: 'tsc', startTier: 1, ramp: 2, sections: 14, startEagles: 30, startItems: 0 };

/** Pull every dial into range. Anything that is not a number falls back to the default. */
export function clampSetup(raw: Partial<SandboxSetup> | null | undefined): SandboxSetup {
  const out: SandboxSetup = { ...defaultSetup };
  if (!raw) return out;
  if (raw.faction === 'tsc' || raw.faction === 'pressmen' || raw.faction === 'concord') out.faction = raw.faction;
  (Object.keys(setupLimits) as SetupDial[]).forEach((k) => {
    const v = raw[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      const l = setupLimits[k];
      out[k] = Math.min(l.max, Math.max(l.min, Math.round(v)));
    }
  });
  return out;
}

export function stepDial(setup: SandboxSetup, dial: SetupDial, dir: 1 | -1): SandboxSetup {
  const l = setupLimits[dial];
  return clampSetup({ ...setup, [dial]: setup[dial] + dir * l.step });
}

/** The tier the last section of an expedition reaches under these dials. */
export const topTier = (s: SandboxSetup): number => Math.min(8, s.startTier + Math.floor((s.sections - 1) / s.ramp));
