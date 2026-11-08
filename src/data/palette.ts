// Every color in the game lives here. Scenes never contain hex values.
export type FactionId = 'tsc' | 'pressmen' | 'concord';

export const palette = {
  bg: 0x0e0c0a,
  panel: 0x1a1714,
  panelDeep: 0x14110e,
  panelRaised: 0x26211c,
  line: 0x3a332b,
  lineDim: 0x2a251f,
  bolt: 0x4a4237,
  text: 0xd8cfc0,
  textMuted: 0x8a8174,
  danger: 0xc93a2e,
  bloodDry: 0x4a1410,
  hazardA: 0x4a3818,
  hazardB: 0x14110e,
  bone: 0xb8ab8f,
  boneDim: 0x4a4237,
  cableDark: 0x0e0c0a,
  enemyPlate: 0x231913,
  enemyBorder: 0x5a3a22,
  rarity: {
    white: 0xd9d4c7,
    green: 0x6fae5a,
    blue: 0x4a8fd6,
    purple: 0x9a62d1,
    orange: 0xe08a2e,
    red: 0xc93a2e,
    gold: 0xe5c04a
  }
} as const;

// Faction accents (working). The player's faction accent is the "signal" color.
export const factionAccent: Record<FactionId, number> = {
  tsc: 0x3fa7a0,
  pressmen: 0xb8553a,
  concord: 0x8f9bb3
};

export const factionNames: Record<FactionId, string> = {
  tsc: 'TSC',
  pressmen: 'Pressmen',
  concord: 'Concord'
};

export const factionOrder: FactionId[] = ['tsc', 'pressmen', 'concord'];

export function signalFor(faction: FactionId): number {
  return factionAccent[faction];
}

export function toCss(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/** Blend two colors. t = 0 gives a, t = 1 gives b. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
