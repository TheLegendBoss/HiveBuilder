import type Phaser from 'phaser';
import { palette } from '../data/palette';
import { strokePoly } from './draw';
import { cubicPoints, dashPolyline, type Pt } from './geometry';

export interface CableOpts {
  color: number;
  /** control point offsets from the start and end points */
  c1?: Pt;
  c2?: Pt;
  width?: number;
}

/** A dashed cable over a dark underline, with a dot at each end. */
export function drawCable(g: Phaser.GameObjects.Graphics, from: Pt, to: Pt, o: CableOpts): void {
  const c1 = o.c1 ?? { x: -150, y: 33 };
  const c2 = o.c2 ?? { x: 150, y: -21 };
  const width = o.width ?? 3.75;
  const pts = cubicPoints(
    from,
    { x: from.x + c1.x, y: from.y + c1.y },
    { x: to.x + c2.x, y: to.y + c2.y },
    to,
    64
  );
  g.lineStyle(width * 1.6, palette.cableDark, 1);
  strokePoly(g, pts, false);
  g.lineStyle(width, o.color, 1);
  for (const [a, b] of dashPolyline(pts, width * 2.8, width * 2)) g.lineBetween(a.x, a.y, b.x, b.y);
  g.fillStyle(o.color, 1);
  g.fillCircle(from.x, from.y, width * 2);
  g.fillCircle(to.x, to.y, width * 2);
}
