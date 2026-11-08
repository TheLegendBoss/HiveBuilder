import type Phaser from 'phaser';
import { palette } from '../data/palette';

/** A small round lamp. Pass a color to light it, or null for dark. */
export function drawLamp(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number | null): void {
  if (color === null) {
    g.fillStyle(palette.line, 1);
    g.fillCircle(x, y, r);
    return;
  }
  g.fillStyle(color, 0.1);
  g.fillCircle(x, y, r * 2.4);
  g.fillStyle(color, 0.22);
  g.fillCircle(x, y, r * 1.6);
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
}
