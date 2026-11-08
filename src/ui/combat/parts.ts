import Phaser from 'phaser';
import type { CardDef } from '../../data/cards';
import { mix, palette } from '../../data/palette';
import type { Unit } from '../../sim/types';
import { drawCardGlyph } from '../icons';
import { monoText, stencilText } from '../text';

/** HP bar with the blood treatment: dried blood background, remaining HP in text color, a drip when hurt. */
export function drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, hp: number, max: number): void {
  g.fillStyle(palette.bloodDry, 1);
  g.fillRect(x, y, w, h);
  const fill = max > 0 ? Math.round((w * Math.max(0, hp)) / max) : 0;
  g.fillStyle(palette.text, 1);
  g.fillRect(x, y, fill, h);
  if (hp < max && fill < w) {
    g.fillStyle(palette.danger, 1);
    const edge = Math.max(x, Math.min(x + w - 2, x + fill - 1));
    g.fillRect(edge, y + h, 2, 9);
    g.fillRect(Math.max(x, edge - 6), y + h, 2, 5);
  }
  g.lineStyle(1.5, palette.line, 1);
  g.strokeRect(x, y, w, h);
}

export interface ChipSpec {
  label: string;
  color?: number;
  filled?: boolean;
}

/** A row of small boxed labels. Stops before `maxW` and returns the unused ones. */
export function drawChips(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  maxW: number,
  chips: ChipSpec[],
  size = 14
): ChipSpec[] {
  let cx = x;
  const g = scene.add.graphics();
  parent.add(g);
  const left: ChipSpec[] = [];
  chips.forEach((c, i) => {
    const t = monoText(scene, 0, 0, c.label, size, c.filled ? palette.bg : (c.color ?? palette.textMuted), { originY: 0.5 });
    const w = t.width + 12;
    if (cx + w > x + maxW) {
      t.destroy();
      left.push(...chips.slice(i));
      return;
    }
    const h = t.height + 6;
    if (c.filled) {
      g.fillStyle(c.color ?? palette.textMuted, 1);
      g.fillRect(cx, y - h / 2, w, h);
    } else {
      g.lineStyle(1.5, c.color ?? palette.line, 1);
      g.strokeRect(cx, y - h / 2, w, h);
    }
    t.setPosition(cx + 6, y);
    parent.add(t);
    cx += w + 6;
  });
  return left;
}

export type PlateMark = 'PICK' | 'TARGET' | 'OUT OF RANGE' | 'NEXT' | null;

export interface PlateOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  unit: Unit;
  enemy: boolean;
  signal: number;
  mark: PlateMark;
  /** this plate is the one picked / being looked at */
  active: boolean;
  /** keyboard focus among the offered choices */
  focus: boolean;
  dim: boolean;
  compact: boolean;
  onClick: () => void;
}

/** A unit plate. Returns a container centered on the plate with the hit area on the container. */
export function makePlate(scene: Phaser.Scene, o: PlateOpts): Phaser.GameObjects.Container {
  const u = o.unit;
  const c = scene.add.container(o.x + o.w / 2, o.y + o.h / 2);
  const hx = -o.w / 2;
  const hy = -o.h / 2;
  const g = scene.add.graphics();
  const lit = o.mark === 'TARGET' || o.mark === 'PICK' || o.active;
  g.fillStyle(o.enemy ? palette.enemyPlate : palette.panelDeep, 1);
  g.fillRect(hx, hy, o.w, o.h);
  if (o.focus) {
    g.lineStyle(3, o.signal, 0.35);
    g.strokeRect(hx - 6, hy - 6, o.w + 12, o.h + 12);
  }
  g.lineStyle(lit ? 4.5 : o.enemy ? 3 : 1.5, lit ? o.signal : o.enemy ? palette.enemyBorder : palette.line, 1);
  g.strokeRect(hx + 1, hy + 1, o.w - 2, o.h - 2);
  if (u.exposed && !u.downed) {
    // Scorch-style wear is for burning only; Exposed is a plain notch in the corner.
    g.fillStyle(palette.danger, 1);
    g.fillTriangle(hx + o.w - 22, hy + 2, hx + o.w - 2, hy + 2, hx + o.w - 2, hy + 22);
  }
  c.add(g);

  let tagW = 0;
  if (o.mark) {
    const col = o.mark === 'OUT OF RANGE' ? palette.textMuted : o.mark === 'NEXT' ? palette.danger : o.signal;
    const tg = monoText(scene, hx + o.w - 8, hy + 10, o.mark, 14, col, { originX: 1, spacing: 0.06 });
    const tw = tg.width + 10;
    tagW = tw + 6;
    const bg = scene.add.graphics();
    bg.lineStyle(1.5, col, 1);
    bg.strokeRect(hx + o.w - 8 - tw + 5, hy + 6, tw, tg.height + 6);
    c.add([bg, tg]);
  }
  const name = stencilText(scene, hx + 10, hy + 6, u.name, o.compact ? 18 : 22, palette.text, { spacing: 0.04 });
  const maxName = o.w - 20 - tagW;
  if (name.width > maxName) name.setScale(maxName / name.width);
  c.add(name);

  const barY = hy + 42;
  const textW = o.compact ? 0 : 64;
  const bar = scene.add.graphics();
  drawHpBar(bar, hx + 10, barY, o.w - 20 - textW, 14, u.hp, u.maxHp);
  c.add(bar);
  if (!o.compact) c.add(monoText(scene, hx + o.w - 10, barY + 7, `${u.hp}/${u.maxHp}`, 16, palette.text, { originX: 1, originY: 0.5 }));

  const chips: ChipSpec[] = [];
  const soak = u.armor + u.builtin;
  if (u.downed) chips.push({ label: 'DOWNED', color: palette.danger, filled: true });
  if (soak > 0) chips.push({ label: `SOAK ${soak}`, color: palette.bone });
  if (u.ammoMax > 0) chips.push({ label: `AMMO ${u.ammo}`, color: palette.bone });
  if (u.stunned) chips.push({ label: 'STUN', color: palette.danger });
  if (u.exposed) chips.push({ label: 'EXPOSED', color: palette.danger });
  if (u.suppressed > 0) chips.push({ label: `SUPP ${u.suppressed}`, color: palette.danger });
  if (u.counter) chips.push({ label: 'COUNTER', color: o.signal });
  if (u.sight) chips.push({ label: 'SIGHT', color: o.signal });
  const rest = drawChips(scene, c, hx + 10, hy + o.h - 20, o.w - 20, chips);
  if (rest.length) {
    c.add(monoText(scene, hx + o.w - 10, hy + o.h - 20, `+${rest.length}`, 14, palette.textMuted, { originX: 1, originY: 0.5 }));
  }

  c.setAlpha(o.dim ? 0.45 : u.downed ? 0.7 : 1);
  c.setSize(o.w, o.h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', o.onClick);
  return c;
}

/** The enemy intent badge: diamond marker plus a short label. Text always, never color alone. */
export function makeIntentBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  label: string,
  next: boolean
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const h = 22;
  if (next) {
    g.fillStyle(palette.danger, 1);
    g.fillRect(0, 0, w, h);
  } else {
    g.lineStyle(1.5, palette.enemyBorder, 1);
    g.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
  }
  const col = next ? palette.bg : palette.textMuted;
  g.fillStyle(col, 1);
  g.fillTriangle(10, 3, 18, 11, 10, 19);
  g.fillTriangle(10, 3, 2, 11, 10, 19);
  c.add(g);
  const t = monoText(scene, 26, 11, label, 15, col, { originY: 0.5, spacing: 0.04 });
  if (t.width > w - 32) t.setScale((w - 32) / t.width);
  c.add(t);
  return c;
}

export const CARD_W = 201;
export const CARD_H = 294;

export interface CardOpts {
  def: CardDef;
  key: string;
  signal: number;
  selected: boolean;
  /** a hand card that has a legal play right now */
  playable: boolean;
  tag: 'BURN' | 'DISCARD' | 'PLAYING' | null;
  focus: boolean;
}

/** A hand card's visuals. Container centered on the card; the caller adds the hit area so hover motion never moves it. */
export function makeCard(scene: Phaser.Scene, o: CardOpts): Phaser.GameObjects.Container {
  const { def } = o;
  const c = scene.add.container(0, 0);
  const hx = -CARD_W / 2;
  const hy = -CARD_H / 2;
  const g = scene.add.graphics();
  const frame = o.playable ? palette.rarity.white : palette.line;
  g.fillStyle(palette.panelDeep, 1);
  g.fillRect(hx, hy, CARD_W, CARD_H);
  if (o.selected) {
    g.lineStyle(3, o.signal, 0.12);
    g.strokeRect(hx - 9, hy - 9, CARD_W + 18, CARD_H + 18);
    g.lineStyle(3, o.signal, 0.28);
    g.strokeRect(hx - 4.5, hy - 4.5, CARD_W + 9, CARD_H + 9);
  } else if (o.focus) {
    g.lineStyle(3, o.signal, 0.35);
    g.strokeRect(hx - 5, hy - 5, CARD_W + 10, CARD_H + 10);
  }
  g.lineStyle(o.selected ? 4.5 : 3, o.selected ? o.signal : o.tag === 'BURN' ? palette.danger : frame, 1);
  g.strokeRect(hx + 1.5, hy + 1.5, CARD_W - 3, CARD_H - 3);
  // Fuel value circle (what burning this card pays).
  g.lineStyle(2, palette.bone, 1);
  g.strokeCircle(hx + 28, hy + 36, 17);
  // Art slot with a glyph.
  g.lineStyle(1.5, palette.line, 1);
  g.strokeRect(hx + 12, hy + 74, 54, 54);
  drawCardGlyph(g, def.sourceType, hx + 39, hy + 101, 34, o.playable ? palette.bone : palette.textMuted);
  c.add(g);

  c.add(monoText(scene, hx + 28, hy + 36, String(def.fuelValue), 20, palette.text, { originX: 0.5, originY: 0.5, weight: 'bold' }));
  const nm = stencilText(scene, hx + 54, hy + 18, def.name, 22, o.playable ? palette.text : palette.textMuted, {
    wrap: CARD_W - 64,
    lineSpacing: -4
  });
  c.add(nm);

  const typeY = hy + 76;
  c.add(monoText(scene, hx + 74, typeY, def.sourceType.toUpperCase(), 14, palette.textMuted, { spacing: 0.08 }));
  const costs: string[] = [];
  if (def.playFuel > 0) costs.push(`FUEL ${def.playFuel}`);
  if (def.ammoCost > 0) costs.push(`AMMO ${def.ammoCost}`);
  c.add(monoText(scene, hx + 74, typeY + 22, costs.length ? costs.join(' ') : 'FREE', 14, costs.length ? palette.text : palette.textMuted));

  // Effect text: biggest size that fits, never below the 14 px floor. Past that it is trimmed with an ellipsis.
  const maxH = CARD_H - 136 - 40;
  const body = (txt: string, size: number): Phaser.GameObjects.Text =>
    monoText(scene, hx + 12, hy + 136, txt, size, o.playable ? palette.text : palette.textMuted, { wrap: CARD_W - 24, lineSpacing: 3, full: true });
  let placed = false;
  for (const size of [18, 16, 14]) {
    const t = body(def.text, size);
    if (t.height <= maxH) {
      c.add(t);
      placed = true;
      break;
    }
    t.destroy();
  }
  if (!placed) {
    const words = def.text.split(' ');
    let n = words.length;
    let t = body(words.slice(0, n).join(' ') + '…', 14);
    while (t.height > maxH && n > 1) {
      t.destroy();
      n -= 1;
      t = body(words.slice(0, n).join(' ') + '…', 14);
    }
    c.add(t);
  }

  const foot = monoText(scene, hx + 12, hy + CARD_H - 22, def.source, 14, palette.textMuted, { originY: 0.5 });
  if (foot.width > 130) foot.setScale(130 / foot.width);
  c.add(foot);
  const kg = scene.add.graphics();
  kg.lineStyle(1.5, o.selected ? o.signal : palette.line, 1);
  kg.strokeRect(hx + CARD_W - 40, hy + CARD_H - 36, 28, 28);
  c.add(kg);
  c.add(monoText(scene, hx + CARD_W - 26, hy + CARD_H - 22, o.key, 16, palette.textMuted, { originX: 0.5, originY: 0.5 }));

  if (o.tag) {
    const col = o.tag === 'BURN' ? palette.danger : o.signal;
    const tg = monoText(scene, 0, hy, o.tag, 15, palette.bg, { originX: 0.5, originY: 0.5, spacing: 0.08 });
    const bg = scene.add.graphics();
    bg.fillStyle(col, 1);
    bg.fillRect(-tg.width / 2 - 8, hy - 11, tg.width + 16, 22);
    c.add([bg, tg]);
  }

  return c;
}

/** A face-down pile: a few stacked outlines, a count and a label. Local (0, 0) is the top-left corner. */
export function makePile(scene: Phaser.Scene, x: number, y: number, label: string, count: number, color: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const layers = Math.min(4, Math.max(1, Math.ceil(count / 4)));
  for (let i = layers - 1; i >= 0; i--) {
    g.fillStyle(mix(palette.panelDeep, palette.panelRaised, 0.5), 1);
    g.fillRect(i * 5, -i * 5, 112, 150);
    g.lineStyle(1.5, count > 0 ? color : palette.line, 1);
    g.strokeRect(i * 5 + 0.75, -i * 5 + 0.75, 110.5, 148.5);
  }
  c.add(g);
  c.add(stencilText(scene, 56, 66, String(count), 54, count > 0 ? palette.text : palette.textMuted, { originX: 0.5, originY: 0.5, fixed: true }));
  c.add(monoText(scene, 56, 176, label, 16, palette.textMuted, { originX: 0.5, spacing: 0.14 }));
  return c;
}
