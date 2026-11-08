import Phaser from 'phaser';
import { palette } from '../data/palette';
import { fillPoly } from './draw';
import { hazardBands } from './geometry';

export interface PanelOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: number;
  border?: number;
  borderWidth?: number;
  /** four corner bolts */
  bolts?: boolean;
  /** hazard stripe along the top edge */
  hazard?: boolean;
  /** faint scan lines */
  scan?: boolean;
}

export const HAZARD_HEIGHT = 12;

export function drawHazardStrip(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(palette.hazardA, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(palette.hazardB, 1);
  for (const poly of hazardBands(x, y, w, h, h * 0.75)) fillPoly(g, poly);
}

/** A flat panel. Local (0, 0) is its top-left corner. */
export function makePanel(scene: Phaser.Scene, o: PanelOpts): Phaser.GameObjects.Container {
  const c = scene.add.container(o.x, o.y);
  const g = scene.add.graphics();
  g.fillStyle(o.fill ?? palette.panel, 1);
  g.fillRect(0, 0, o.w, o.h);
  g.lineStyle(o.borderWidth ?? 1.5, o.border ?? palette.line, 1);
  g.strokeRect(0.75, 0.75, o.w - 1.5, o.h - 1.5);
  if (o.scan) {
    g.lineStyle(1.5, palette.text, 0.03);
    for (let y = 3; y < o.h; y += 4.5) g.lineBetween(2, y, o.w - 2, y);
  }
  if (o.hazard) drawHazardStrip(g, 0, 0, o.w, HAZARD_HEIGHT);
  if (o.bolts) {
    g.fillStyle(palette.bolt, 1);
    const inset = 10.5;
    for (const [bx, by] of [
      [inset, inset + (o.hazard ? HAZARD_HEIGHT : 0)],
      [o.w - inset, inset + (o.hazard ? HAZARD_HEIGHT : 0)],
      [inset, o.h - inset],
      [o.w - inset, o.h - inset]
    ] as const) {
      g.fillCircle(bx, by, 3.6);
    }
  }
  c.add(g);
  return c;
}
