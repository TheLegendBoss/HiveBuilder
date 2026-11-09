import type Phaser from 'phaser';
import { fillPoly, strokePoly } from './draw';
import { cubicPoints, type Pt } from './geometry';

/** Skull outline in a 40 by 44 box. Defined once, reused everywhere. */
export function skullOutline(): Pt[] {
  const pts: Pt[] = [{ x: 20, y: 3 }];
  pts.push(...cubicPoints({ x: 20, y: 3 }, { x: 10, y: 3 }, { x: 4, y: 10 }, { x: 4, y: 19 }, 10).slice(1));
  pts.push(...cubicPoints({ x: 4, y: 19 }, { x: 4, y: 25 }, { x: 7, y: 28 }, { x: 10, y: 30 }, 8).slice(1));
  pts.push({ x: 10, y: 36 }, { x: 14, y: 36 }, { x: 14, y: 40 }, { x: 26, y: 40 }, { x: 26, y: 36 }, { x: 30, y: 36 }, { x: 30, y: 30 });
  pts.push(...cubicPoints({ x: 30, y: 30 }, { x: 33, y: 28 }, { x: 36, y: 25 }, { x: 36, y: 19 }, 8).slice(1));
  pts.push(...cubicPoints({ x: 36, y: 19 }, { x: 36, y: 10 }, { x: 30, y: 3 }, { x: 20, y: 3 }, 10).slice(1));
  return pts;
}

export const SKULL_W = 40;
export const SKULL_H = 44;

export interface SkullOpts {
  filled: boolean;
  color: number;
  /** color of the eye sockets and nose when filled */
  hole: number;
  lineWidth?: number;
}

/** Draw a skull with its top-left corner at x, y. `scale` is reference pixels per skull unit. */
export function drawSkull(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, o: SkullOpts): void {
  const pts = skullOutline().map((p) => ({ x: x + p.x * scale, y: y + p.y * scale }));
  if (o.filled) {
    g.fillStyle(o.color, 1);
    fillPoly(g, pts);
    g.fillStyle(o.hole, 1);
    g.fillEllipse(x + 13 * scale, y + 20 * scale, 9 * scale, 10 * scale);
    g.fillEllipse(x + 27 * scale, y + 20 * scale, 9 * scale, 10 * scale);
    g.fillTriangle(x + 20 * scale, y + 25 * scale, x + 17 * scale, y + 31 * scale, x + 23 * scale, y + 31 * scale);
  } else {
    g.lineStyle(o.lineWidth ?? 2.6 * scale, o.color, 1);
    strokePoly(g, pts, true);
  }
}

/** Simple line glyphs for the card art slot, drawn inside a box centered on (cx, cy). */
export function drawCardGlyph(g: Phaser.GameObjects.Graphics, kind: string, cx: number, cy: number, s: number, color: number): void {
  g.lineStyle(3, color, 1);
  g.fillStyle(color, 1);
  const r = s / 2;
  switch (kind) {
    case 'weapon': // crosshair
      g.strokeCircle(cx, cy, r * 0.62);
      g.lineBetween(cx - r, cy, cx - r * 0.3, cy);
      g.lineBetween(cx + r * 0.3, cy, cx + r, cy);
      g.lineBetween(cx, cy - r, cx, cy - r * 0.3);
      g.lineBetween(cx, cy + r * 0.3, cx, cy + r);
      break;
    case 'armor':
    case 'defense': // shield
      strokePoly(g,
        [
          { x: cx - r * 0.75, y: cy - r * 0.8 },
          { x: cx + r * 0.75, y: cy - r * 0.8 },
          { x: cx + r * 0.75, y: cy + r * 0.05 },
          { x: cx, y: cy + r * 0.9 },
          { x: cx - r * 0.75, y: cy + r * 0.05 }
        ],
        true
      );
      break;
    case 'skill': // chevrons
      for (const dy of [-r * 0.5, 0, r * 0.5]) {
        strokePoly(g,
          [{ x: cx - r * 0.7, y: cy + dy - r * 0.3 }, { x: cx, y: cy + dy + r * 0.2 }, { x: cx + r * 0.7, y: cy + dy - r * 0.3 }],
          false
        );
      }
      break;
    case 'tool': // plus in a box
      g.strokeRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
      g.lineBetween(cx - r * 0.4, cy, cx + r * 0.4, cy);
      g.lineBetween(cx, cy - r * 0.4, cx, cy + r * 0.4);
      break;
    case 'supply': // crate
      g.strokeRect(cx - r * 0.85, cy - r * 0.6, r * 1.7, r * 1.3);
      g.lineBetween(cx - r * 0.85, cy - r * 0.1, cx + r * 0.85, cy - r * 0.1);
      g.lineBetween(cx, cy - r * 0.6, cx, cy + r * 0.7);
      break;
    case 'attachment': // scope dot and bar
      g.lineBetween(cx - r, cy, cx + r, cy);
      g.strokeCircle(cx, cy, r * 0.45);
      g.fillCircle(cx, cy, r * 0.12);
      break;
    default: // accessory: chip
      g.strokeRect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1);
      for (const d of [-0.3, 0.3]) {
        g.lineBetween(cx + d * r, cy - r * 0.55, cx + d * r, cy - r * 0.95);
        g.lineBetween(cx + d * r, cy + r * 0.55, cx + d * r, cy + r * 0.95);
      }
  }
}

/** Suit names in tie-break order, lowest first (0 clubs, 1 diamonds, 2 hearts, 3 spades). */
export const SUIT_NAMES = ['Clubs', 'Diamonds', 'Hearts', 'Spades'] as const;

/** A card suit, filled, centered on (cx, cy) and about `s` pixels across. */
export function drawSuit(g: Phaser.GameObjects.Graphics, suit: number, cx: number, cy: number, s: number, color: number): void {
  g.fillStyle(color, 1);
  const r = s / 2;
  switch (suit) {
    case 1: // diamonds
      g.fillTriangle(cx, cy - r, cx + r * 0.72, cy, cx - r * 0.72, cy);
      g.fillTriangle(cx, cy + r, cx + r * 0.72, cy, cx - r * 0.72, cy);
      break;
    case 2: // hearts
      g.fillCircle(cx - r * 0.45, cy - r * 0.28, r * 0.52);
      g.fillCircle(cx + r * 0.45, cy - r * 0.28, r * 0.52);
      g.fillTriangle(cx - r * 0.97, cy - r * 0.05, cx + r * 0.97, cy - r * 0.05, cx, cy + r);
      break;
    case 3: // spades
      g.fillCircle(cx - r * 0.45, cy + r * 0.08, r * 0.52);
      g.fillCircle(cx + r * 0.45, cy + r * 0.08, r * 0.52);
      g.fillTriangle(cx - r * 0.97, cy - r * 0.1, cx + r * 0.97, cy - r * 0.1, cx, cy - r);
      g.fillTriangle(cx, cy + r * 0.1, cx - r * 0.3, cy + r, cx + r * 0.3, cy + r);
      break;
    default: // clubs
      g.fillCircle(cx, cy - r * 0.45, r * 0.42);
      g.fillCircle(cx - r * 0.48, cy + r * 0.2, r * 0.42);
      g.fillCircle(cx + r * 0.48, cy + r * 0.2, r * 0.42);
      g.fillTriangle(cx, cy + r * 0.1, cx - r * 0.3, cy + r, cx + r * 0.3, cy + r);
  }
}
