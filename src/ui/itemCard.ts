import type Phaser from 'phaser';
import { gearInfo } from '../data/gear';
import { palette, rarityInfo } from '../data/palette';
import type { LootItem } from '../sim/expedition';
import { rarityOf } from '../core/stash';
import { drawHex, drawStar, flowInline } from './combat/parts';
import { drawCardGlyph } from './icons';
import { bodyText, stencilText } from './text';

/** The reviewed card proportions (ui-guide 7: 201 by 294), at the size a pack reveal wants. */
export const ITEM_W = 288;
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

export type ItemKind = 'GEAR' | 'ATTACHMENT' | 'ACCESSORY' | 'SUPPLY' | 'DISPOSABLE';

export function kindOf(item: LootItem): ItemKind {
  const c = item.cls.toLowerCase();
  if (c.startsWith('attachment')) return 'ATTACHMENT';
  if (c.startsWith('accessory')) return 'ACCESSORY';
  if (c.startsWith('supply')) return 'SUPPLY';
  if (c.startsWith('disposable')) return 'DISPOSABLE';
  return 'GEAR';
}

/** `KIND · CLASS, SIZE` (ui-guide 7.2). Supplies and disposables have no class of their own, so the kind stands alone. */
export function typeLine(item: LootItem): string {
  const kind = kindOf(item);
  const c = item.cls.toUpperCase();
  if (kind === 'SUPPLY' || kind === 'DISPOSABLE' || kind === 'ATTACHMENT' || kind === 'ACCESSORY') return c === kind ? kind : `${kind} · ${c}`;
  return `${kind} · ${c}`;
}

export interface CardRows {
  passives: Array<{ name: string; text: string }>;
  actions: Array<{ cost: number; name: string; text: string }>;
}

const title = (s: string): string => s.replace(/\b\w/g, (m) => m.toUpperCase());

/** Read an item's rules text into the PASSIVE and ACTIVATED rows (ui-guide 7.1). Passives come first, then actions cheapest first. */
export function cardRows(text: string): CardRows {
  const rows: CardRows = { passives: [], actions: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const act = /^\((\d+)\):\s*([^-]+?)\s+-\s+(.+)$/.exec(line);
    const pas = /^Passive:\s*([^-]+?)\s+-\s+(.+)$/.exec(line);
    if (act) rows.actions.push({ cost: Number(act[1]), name: act[2]!, text: act[3]! });
    else if (pas) {
      const name = title(pas[1]!);
      const val = pas[2]!.trim();
      if (/^ammo$/i.test(name) && /^\d+\.?$/.test(val)) rows.passives.push({ name, text: `${val.replace('.', '')} Shots` });
      else if (/^max soak$/i.test(name) && /^\d+\.?$/.test(val)) rows.passives.push({ name, text: `${val.replace('.', '')} Points` });
      else rows.passives.push({ name, text: val });
    } else rows.actions.push({ cost: 0, name: 'Effect', text: line });
  }
  rows.actions.sort((a, b) => a.cost - b.cost);
  return rows;
}

/** Corner cuts per kind, so the silhouette reads before the text does (ui-guide 7.2). Accessory is a working choice. */
const CUT = 20;
function cutsOf(kind: ItemKind): { tl: number; tr: number; bl: number; br: number } {
  if (kind === 'GEAR') return { tl: CUT, tr: 0, bl: 0, br: 0 };
  if (kind === 'ACCESSORY') return { tl: 0, tr: CUT, bl: 0, br: 0 };
  return { tl: 0, tr: 0, bl: 0, br: 0 };
}

function framePath(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cut: { tl: number; tr: number; bl: number; br: number }): void {
  g.beginPath();
  g.moveTo(x + cut.tl, y);
  g.lineTo(x + w - cut.tr, y);
  g.lineTo(x + w, y + cut.tr);
  g.lineTo(x + w, y + h - cut.br);
  g.lineTo(x + w - cut.br, y + h);
  g.lineTo(x + cut.bl, y + h);
  g.lineTo(x, y + h - cut.bl);
  g.lineTo(x, y + cut.tl);
  g.closePath();
}

/** A loot item card, centered on (0, 0). The frame, rules, stars and footer take the rarity color. */
export function makeItemCard(scene: Phaser.Scene, item: LootItem, extra?: { owned?: boolean }): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const r = rarityOf(item);
  const col = palette.rarity[r];
  const info = rarityInfo[r];
  const kind = kindOf(item);
  const hx = -ITEM_W / 2;
  const hy = -ITEM_H / 2;
  const left = hx + 16;
  const colW = ITEM_W - 32;

  const g = scene.add.graphics();
  g.fillStyle(palette.panelDeep, 1);
  framePath(g, hx, hy, ITEM_W, ITEM_H, cutsOf(kind));
  g.fillPath();
  g.lineStyle(5, col, 1);
  framePath(g, hx + 2.5, hy + 2.5, ITEM_W - 5, ITEM_H - 5, cutsOf(kind));
  g.strokePath();

  // Art strip with the kind glyph.
  const artY = hy + 80;
  const artH = 52;
  g.fillStyle(palette.bg, 1);
  g.fillRect(left, artY, colW, artH);
  g.lineStyle(1.5, palette.line, 1);
  g.strokeRect(left, artY, colW, artH);
  drawCardGlyph(g, glyphOf(item), 0, artY + artH / 2, 32, palette.bone);

  // Frame cues for the kinds that are not a cut corner.
  if (kind === 'ATTACHMENT') {
    // a socket mark on the frame's left edge
    g.fillStyle(palette.panelDeep, 1);
    g.fillCircle(hx + 2.5, hy + ITEM_H / 2, 9);
    g.lineStyle(3, col, 1);
    g.strokeCircle(hx + 2.5, hy + ITEM_H / 2, 9);
  } else if (kind === 'SUPPLY') {
    // a strip of tape across each top corner
    g.fillStyle(palette.bone, 0.55);
    for (const sx of [hx + 10, hx + ITEM_W - 58]) {
      g.beginPath();
      g.moveTo(sx, hy - 2);
      g.lineTo(sx + 48, hy - 2);
      g.lineTo(sx + 42, hy + 12);
      g.lineTo(sx - 6, hy + 12);
      g.closePath();
      g.fillPath();
    }
  } else if (kind === 'DISPOSABLE') {
    // hazard stripe along the footer
    const sy = hy + ITEM_H - 10;
    g.fillStyle(palette.meter.stress, 1);
    for (let sx = hx + 6; sx < hx + ITEM_W - 12; sx += 22) {
      g.beginPath();
      g.moveTo(sx, sy + 6);
      g.lineTo(sx + 8, sy + 6);
      g.lineTo(sx + 14, sy - 2);
      g.lineTo(sx + 6, sy - 2);
      g.closePath();
      g.fillPath();
    }
  }
  c.add(g);

  const nm = stencilText(scene, left, hy + 16, item.name, 32, palette.text);
  if (nm.width > colW) nm.setScale(colW / nm.width);
  c.add(nm);
  const type = bodyText(scene, left, hy + 54, typeLine(item), 15, palette.textMuted, { spacing: 0.08 });
  if (type.width > colW) type.setScale(colW / type.width);
  c.add(type);

  // Body: PASSIVE, then ACTIVATED, each under a header and a rule in the frame color.
  const rows = cardRows(item.text || 'No effect text.');
  const footTop = hy + ITEM_H - 52;
  const hexW = 24;
  const textX = left + hexW + 8;
  const textW = colW - hexW - 8;
  const build = (size: number, dry: boolean): number => {
    let y = hy + 144;
    const section = (label: string): void => {
      if (!dry) {
        c.add(bodyText(scene, left, y, label, 12, palette.textMuted, { spacing: 0.2 }));
        const rule = scene.add.graphics();
        rule.fillStyle(col, 1);
        rule.fillRect(left, y + 16, colW, 2);
        c.add(rule);
      }
      y += 24;
    };
    if (rows.passives.length) {
      section('PASSIVE');
      for (const p of rows.passives) {
        const f = flowInline(scene, c, left, y, colW, p.name, p.text, size, palette.text, palette.text, { italicName: true, dry });
        y += f.height + 4;
      }
      if (!dry) {
        const rule = scene.add.graphics();
        rule.fillStyle(col, 1);
        rule.fillRect(left, y, colW, 2);
        c.add(rule);
      }
      y += 8;
    }
    if (rows.actions.length) {
      section('ACTIVATED');
      for (const a of rows.actions) {
        const f = flowInline(scene, c, textX, y + 2, textW, a.name, a.text, size, palette.text, palette.text, { dry });
        if (!dry) {
          const hg = scene.add.graphics();
          drawHex(hg, left + hexW / 2, y + 13, hexW, 27, palette.danger);
          c.add(hg);
          c.add(bodyText(scene, left + hexW / 2, y + 14, String(a.cost), 16, palette.text, { originX: 0.5, originY: 0.5, weight: '700' }));
        }
        y += Math.max(f.height + 2, 30) + 6;
      }
    }
    return y;
  };
  let size = 17;
  if (build(size, true) > footTop) size = 15;
  build(size, false);

  // Footer stack, centered: one star per rarity step, then the rarity name.
  const sg = scene.add.graphics();
  const s = 14;
  const w = info.stars * s + (info.stars - 1) * 4;
  for (let i = 0; i < info.stars; i++) drawStar(sg, -w / 2 + s / 2 + i * (s + 4), hy + ITEM_H - 38, s, col);
  c.add(sg);
  c.add(bodyText(scene, 0, hy + ITEM_H - 22, info.name.toUpperCase(), 13, col, { originX: 0.5, originY: 0.5, spacing: 0.2, weight: '700' }));
  if (extra?.owned !== undefined) {
    const tag = bodyText(scene, hx + ITEM_W - 18, hy + ITEM_H - 36, extra.owned ? 'OWNED' : 'NEW', 13, extra.owned ? palette.textMuted : palette.bg, { originX: 1, originY: 0.5, spacing: 0.12, weight: '700' });
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
