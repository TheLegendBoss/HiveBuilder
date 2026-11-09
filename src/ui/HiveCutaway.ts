import Phaser from 'phaser';
import { hiveFloors, hiveGeometry } from '../data/hive';
import { mix, palette } from '../data/palette';
import type { Pt } from './geometry';
import { bodyText } from './text';

export interface HiveCutaway {
  container: Phaser.GameObjects.Container;
  /** right edge, middle of the lit floor, in the parent's space */
  litAnchor: Pt;
}

/**
 * The hive as a stepped silhouette, six floors, widest at the bottom.
 * The lit floor is drawn in the signal color. `width` is the box the hive centers in.
 */
export function makeHiveCutaway(scene: Phaser.Scene, x: number, y: number, width: number, signal: number): HiveCutaway {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  c.add(g);
  const cx = width / 2;
  const geo = hiveGeometry;
  let litAnchor: Pt = { x: x + cx, y };

  // Labels first so we can keep windows clear of them.
  const labels: Array<{ t: Phaser.GameObjects.Text; floorIndex: number }> = [];
  hiveFloors.forEach((f, i) => {
    const fy = geo.topPad + i * geo.floorStep;
    const t = bodyText(scene, cx, fy + geo.floorHeight / 2, f.name.toUpperCase(), f.lit ? 19.5 : 16.5, f.lit ? palette.text : palette.textMuted, {
      originX: 0.5,
      originY: 0.5,
      weight: f.lit ? 'bold' : undefined,
      spacing: 0.04
    });
    labels.push({ t, floorIndex: i });
  });

  g.lineStyle(3, palette.line, 1);
  // spire pipes
  g.lineBetween(cx - 45, geo.topPad, cx - 45, geo.topPad - 18);
  g.lineBetween(cx + 45, geo.topPad, cx + 45, geo.topPad - 12);

  hiveFloors.forEach((f, i) => {
    const fy = geo.topPad + i * geo.floorStep;
    const fx = cx - f.width / 2;
    const fill = f.lit ? mix(signal, palette.bg, 0.88) : palette.panel;
    g.fillStyle(fill, 1);
    g.fillRect(fx, fy, f.width, geo.floorHeight);
    g.lineStyle(f.lit ? 3 : 2.25, f.lit ? signal : palette.line, 1);
    g.strokeRect(fx, fy, f.width, geo.floorHeight);

    const lb = labels[i]!.t;
    const pad = 12;
    const lx0 = lb.x - lb.width / 2 - pad;
    const lx1 = lb.x + lb.width / 2 + pad;
    const ly0 = lb.y - lb.height / 2 - pad / 2;
    const ly1 = lb.y + lb.height / 2 + pad / 2;
    // windows on a global grid
    const startX = Math.ceil((fx + 3) / geo.windowPitchX) * geo.windowPitchX;
    g.fillStyle(f.lit ? signal : palette.line, f.lit ? 0.7 : 1);
    for (let wx = startX; wx + geo.windowW < fx + f.width - 3; wx += geo.windowPitchX) {
      for (let wy = fy + 4.5; wy + geo.windowH < fy + geo.floorHeight - 3; wy += geo.windowPitchY) {
        const overlap = wx < lx1 && wx + geo.windowW > lx0 && wy < ly1 && wy + geo.windowH > ly0;
        if (!overlap) g.fillRect(wx, wy, geo.windowW, geo.windowH);
      }
    }
    if (f.lit) litAnchor = { x: x + fx + f.width, y: y + fy + geo.floorHeight / 2 };
  });

  labels.forEach(({ t }) => c.add(t));
  return { container: c, litAnchor };
}
