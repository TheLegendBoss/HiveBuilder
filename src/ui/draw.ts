import Phaser from 'phaser';
import type { Pt } from './geometry';

function vec(pts: Pt[]): Phaser.Math.Vector2[] {
  return pts.map((p) => new Phaser.Math.Vector2(p.x, p.y));
}

export function fillPoly(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.fillPoints(vec(pts), true);
}

export function strokePoly(g: Phaser.GameObjects.Graphics, pts: Pt[], close: boolean): void {
  g.strokePoints(vec(pts), close);
}
