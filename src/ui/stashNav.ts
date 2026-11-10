import type Phaser from 'phaser';
import { stashTabs, type StashTab } from '../core/stash';
import { mix, palette } from '../data/palette';
import { bodyText } from './text';

export interface StashNavOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  tab: StashTab;
  counts: Record<StashTab, number>;
  signal: number;
  size?: number;
  onPick: (tab: StashTab) => void;
}

/** The row of stash tabs: ALL, WEAPONS, ARMOR, TOOLS, SUPPLIES, each with its count. */
export function drawStashTabs(scene: Phaser.Scene, root: Phaser.GameObjects.Container, o: StashNavOptions): void {
  const gap = 6;
  const tw = (o.w - gap * (stashTabs.length - 1)) / stashTabs.length;
  stashTabs.forEach((t, i) => {
    const x0 = o.x + i * (tw + gap);
    const on = t.id === o.tab;
    const g = scene.add.graphics();
    g.fillStyle(on ? mix(o.signal, palette.bg, 0.82) : palette.panelDeep, 1);
    g.fillRect(x0, o.y, tw, o.h);
    g.lineStyle(on ? 2.5 : 1.5, on ? o.signal : palette.line, 1);
    g.strokeRect(x0 + 0.75, o.y + 0.75, tw - 1.5, o.h - 1.5);
    root.add(g);
    const n = o.counts[t.id];
    const label = bodyText(scene, x0 + tw / 2, o.y + o.h / 2, `${t.label} ${n}`, o.size ?? 14, on ? palette.text : n ? palette.textMuted : palette.line, {
      originX: 0.5, originY: 0.5, weight: '700', spacing: 0.06
    });
    if (label.width > tw - 10) label.setScale((tw - 10) / label.width);
    root.add(label);
    const hit = scene.add.zone(x0 + tw / 2, o.y + o.h / 2, tw, o.h).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => o.onPick(t.id));
    root.add(hit);
  });
}

/** "< 1/3 >" with two click zones. Right-aligned at (rightX, y). */
export function drawPager(
  scene: Phaser.Scene, root: Phaser.GameObjects.Container, rightX: number, y: number, page: number, pages: number, signal: number, onStep: (dir: number) => void
): void {
  const btn = (x: number, label: string, dir: number): void => {
    const live = dir < 0 ? page > 0 : page < pages - 1;
    const g = scene.add.graphics();
    g.fillStyle(palette.panelDeep, 1);
    g.fillRect(x, y, 40, 32);
    g.lineStyle(1.5, live ? signal : palette.line, 1);
    g.strokeRect(x + 0.75, y + 0.75, 38.5, 30.5);
    root.add(g);
    root.add(bodyText(scene, x + 20, y + 16, label, 20, live ? palette.text : palette.line, { originX: 0.5, originY: 0.5, weight: '700' }));
    if (live) {
      const hit = scene.add.zone(x + 20, y + 16, 40, 32).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => onStep(dir));
      root.add(hit);
    }
  };
  btn(rightX - 40, '>', 1);
  root.add(bodyText(scene, rightX - 52, y + 16, `${page + 1}/${pages}`, 16, palette.textMuted, { originX: 1, originY: 0.5, weight: '700' }));
  btn(rightX - 52 - 70, '<', -1);
}
