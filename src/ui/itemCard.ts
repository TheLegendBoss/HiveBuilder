import type Phaser from 'phaser';
import { gearInfo } from '../data/gear';
import { palette, rarityInfo } from '../data/palette';
import type { LootItem } from '../sim/expedition';
import { rarityOf } from '../core/stash';
import { drawStar } from './combat/parts';
import { drawCardGlyph } from './icons';
import { bodyText, stencilText } from './text';

export const ITEM_W = 300;
export const ITEM_H = 420;

/** Which art-strip glyph goes with an item. */
export function glyphOf(item: LootItem): string {
  const info = gearInfo(item.name);
  const cls = item.cls.toLowerCase();
  if (info?.slot === 'weapon') return cls.includes('defense') ? 'defense' : 'weapon';
  if (info?.slot === 'armor') return 'armor';
  if (cls.startsWith('attachment')) return 'attachment';
  if (info?.slot === 'tool') return 'tool';
  return cls.startsWith('supply') || cls.startsWith('disposable') ? 'supply' : 'accessory';
}

/** A loot item card, centered on (0, 0). The frame, stars and footer take the rarity color. */
export function makeItemCard(scene: Phaser.Scene, item: LootItem, extra?: { owned?: boolean }): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const r = rarityOf(item);
  const col = palette.rarity[r];
  const info = rarityInfo[r];
  const hx = -ITEM_W / 2;
  const hy = -ITEM_H / 2;
  const g = scene.add.graphics();
  g.fillStyle(palette.panelDeep, 1);
  g.fillRect(hx, hy, ITEM_W, ITEM_H);
  g.lineStyle(5, col, 1);
  g.strokeRect(hx + 2.5, hy + 2.5, ITEM_W - 5, ITEM_H - 5);
  // art strip
  g.fillStyle(palette.bg, 1);
  g.fillRect(hx + 16, hy + 84, ITEM_W - 32, 72);
  g.lineStyle(1.5, palette.line, 1);
  g.strokeRect(hx + 16, hy + 84, ITEM_W - 32, 72);
  drawCardGlyph(g, glyphOf(item), 0, hy + 120, 44, palette.bone);
  c.add(g);

  const nm = stencilText(scene, hx + 20, hy + 18, item.name, 36, palette.text);
  if (nm.width > ITEM_W - 40) nm.setScale((ITEM_W - 40) / nm.width);
  c.add(nm);
  const type = bodyText(scene, hx + 20, hy + 58, item.cls.toUpperCase(), 16, palette.textMuted, { spacing: 0.1 });
  if (type.width > ITEM_W - 40) type.setScale((ITEM_W - 40) / type.width);
  c.add(type);

  const rule = scene.add.graphics();
  rule.fillStyle(col, 1);
  rule.fillRect(hx + 20, hy + 172, ITEM_W - 40, 2);
  c.add(rule);
  c.add(bodyText(scene, hx + 20, hy + 184, item.text || 'No effect text.', 17, palette.text, { wrap: ITEM_W - 40, lineSpacing: 4 }));

  const sg = scene.add.graphics();
  const s = 14;
  const w = info.stars * s + (info.stars - 1) * 4;
  for (let i = 0; i < info.stars; i++) drawStar(sg, -w / 2 + s / 2 + i * (s + 4), hy + ITEM_H - 40, s, col);
  c.add(sg);
  c.add(bodyText(scene, 0, hy + ITEM_H - 20, info.name.toUpperCase(), 14, col, { originX: 0.5, originY: 0.5, spacing: 0.2, weight: '700' }));
  if (extra?.owned !== undefined) {
    const tag = bodyText(scene, hx + ITEM_W - 20, hy + ITEM_H - 20, extra.owned ? 'OWNED' : 'NEW', 14, extra.owned ? palette.textMuted : palette.bg, { originX: 1, originY: 0.5, spacing: 0.12, weight: '700' });
    if (!extra.owned) {
      const bg = scene.add.graphics();
      bg.fillStyle(palette.bone, 1);
      bg.fillRect(tag.x - tag.width - 6, tag.y - tag.height / 2 - 2, tag.width + 12, tag.height + 4);
      c.add(bg);
    }
    c.add(tag);
  }
  return c;
}
