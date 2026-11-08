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
