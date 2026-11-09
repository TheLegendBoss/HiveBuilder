import Phaser from 'phaser';
import type { CardDef } from '../../data/cards';
import { mix, palette, rarityInfo } from '../../data/palette';
import { loadoutOf } from '../../core/loadout';
import type { Unit } from '../../sim/types';
import { drawCardGlyph } from '../icons';
import { bodyText, stencilText } from '../text';

/** HP bar with the blood treatment: dark track, remaining HP in the HP red, a drip when hurt. `fill` and `track` let progress bars reuse it. */
export function drawHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  max: number,
  fill: number = palette.meter.hp,
  track: number = palette.meter.hpTrack
): void {
  g.fillStyle(track, 1);
  g.fillRect(x, y, w, h);
  const filled = max > 0 ? Math.round((w * Math.max(0, hp)) / max) : 0;
  g.fillStyle(fill, 1);
  g.fillRect(x, y, filled, h);
  if (hp < max && filled < w) {
    g.fillStyle(palette.danger, 1);
    const edge = Math.max(x, Math.min(x + w - 2, x + filled - 1));
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
    const t = bodyText(scene, 0, 0, c.label, size, c.filled ? palette.bg : (c.color ?? palette.textMuted), { originY: 0.5 });
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
    const tg = bodyText(scene, hx + o.w - 8, hy + 10, o.mark, 14, col, { originX: 1, spacing: 0.06 });
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
  if (!o.compact) c.add(bodyText(scene, hx + o.w - 10, barY + 7, `${u.hp}/${u.maxHp}`, 16, palette.text, { originX: 1, originY: 0.5 }));

  const chips: ChipSpec[] = [];
  const soak = u.armor + u.builtin;
  if (u.downed) chips.push({ label: 'DOWNED', color: palette.danger, filled: true });
  if (soak > 0) chips.push({ label: `SOAK ${soak}`, color: palette.meter.soak });
  if (u.ammoMax > 0) chips.push({ label: `AMMO ${u.ammo}`, color: palette.bone });
  if (u.stunned) chips.push({ label: 'STUN', color: palette.danger });
  if (u.exposed) chips.push({ label: 'EXPOSED', color: palette.danger });
  if (u.suppressed > 0) chips.push({ label: `SUPP ${u.suppressed}`, color: palette.danger });
  if (u.burning > 0) chips.push({ label: `BURN ${u.burning}`, color: palette.danger });
  if (u.counter) chips.push({ label: 'COUNTER', color: o.signal });
  if (u.sight) chips.push({ label: 'SIGHT', color: o.signal });
  const rest = drawChips(scene, c, hx + 10, hy + o.h - 20, o.w - 20, chips);
  if (rest.length) {
    c.add(bodyText(scene, hx + o.w - 10, hy + o.h - 20, `+${rest.length}`, 14, palette.textMuted, { originX: 1, originY: 0.5 }));
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
  const t = bodyText(scene, 26, 11, label, 15, col, { originY: 0.5, spacing: 0.04 });
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
  tag: 'BURN' | 'BURN?' | 'DISCARD' | 'PLAYING' | null;
  focus: boolean;
}

/** A six-sided marker, pointy top. Used for the burn value and for ability fuel costs. */
export function drawHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, color: number): void {
  const hw = w / 2;
  const hh = h / 2;
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(cx, cy - hh);
  g.lineTo(cx + hw, cy - hh / 2);
  g.lineTo(cx + hw, cy + hh / 2);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx - hw, cy + hh / 2);
  g.lineTo(cx - hw, cy - hh / 2);
  g.closePath();
  g.fillPath();
}

const STAR_POINTS: [number, number][] = [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]];

/** A five-point star `s` pixels across, centered on (cx, cy). One per rarity step. */
export function drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number): void {
  g.fillStyle(color, 1);
  g.beginPath();
  STAR_POINTS.forEach(([px, py], i) => {
    const x = cx + ((px - 50) / 100) * s;
    const y = cy + ((py - 50) / 100) * s;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.closePath();
  g.fillPath();
}

export interface InlineFlow {
  /** total height used, in pixels */
  height: number;
  lines: number;
}

/**
 * Lay out "Name. description" the way cards print an ability: the name in bold, then the description running on in the
 * same line and wrapping under it. Phaser text has one style per object, so the name and each description line are
 * separate objects. `maxLines` trims the description with an ellipsis when it would run past.
 */
export function flowInline(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  name: string,
  desc: string,
  size: number,
  nameColor: number,
  textColor: number,
  opts: { italicName?: boolean; maxLines?: number; dry?: boolean } = {}
): InlineFlow {
  const nameStyle = opts.italicName ? 'italic 700' : '700';
  const nameObj = bodyText(scene, x, y, name + '.', size, nameColor, { weight: nameStyle, full: true });
  const probe = bodyText(scene, 0, 0, '', size, textColor, { full: true });
  const measure = (t: string): number => {
    probe.setText(t);
    return probe.width;
  };
  const spaceW = measure('a a') - measure('aa');
  const lineH = nameObj.height + 1;
  const lines: string[] = [];
  let avail = width - nameObj.width - spaceW;
  let cur = '';
  for (const word of desc.split(' ')) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && measure(test) > avail) {
      lines.push(cur);
      cur = word;
      avail = width;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (opts.maxLines && lines.length > opts.maxLines) {
    lines.length = opts.maxLines;
    lines[opts.maxLines - 1] = lines[opts.maxLines - 1]!.replace(/[ .,;:]+$/, '') + '…';
  }
  const total = Math.max(1, lines.length) * lineH;
  probe.destroy();
  if (opts.dry) {
    nameObj.destroy();
    return { height: total, lines: lines.length };
  }
  parent.add(nameObj);
  lines.forEach((ln, i) => {
    const off = i === 0 ? nameObj.width + spaceW : 0;
    parent.add(bodyText(scene, x + off, y + i * lineH, ln, size, textColor, { full: true }));
  });
  return { height: total, lines: lines.length };
}

function sentence(t: string): string {
  const s = t.trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? '' : '.') : s;
}

/** A hand card's visuals. Container centered on the card; the caller adds the hit area so hover motion never moves it. */
export function makeCard(scene: Phaser.Scene, o: CardOpts): Phaser.GameObjects.Container {
  const { def } = o;
  const c = scene.add.container(0, 0);
  const hx = -CARD_W / 2;
  const hy = -CARD_H / 2;
  const rarity = palette.rarity[def.rarity];
  const info = rarityInfo[def.rarity];
  const frame = o.playable ? rarity : palette.line;
  const ink = o.playable ? palette.text : palette.textMuted;
  const inkSoft = o.playable ? palette.textMuted : palette.boneDim;
  const g = scene.add.graphics();
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

  // Burn value: a red hexagon, top right, no label.
  const burnX = hx + CARD_W - 26;
  const burnY = hy + 26;
  drawHex(g, burnX, burnY, 26, 29, o.playable ? palette.danger : palette.meter.hpTrack);

  // Art strip with the kind glyph.
  const artX = hx + 12;
  const artY = hy + 62;
  const artW = CARD_W - 24;
  const artH = 34;
  g.fillStyle(palette.bg, 1);
  g.fillRect(artX, artY, artW, artH);
  g.lineStyle(1.5, palette.line, 1);
  g.strokeRect(artX, artY, artW, artH);
  drawCardGlyph(g, def.sourceType, artX + artW / 2, artY + artH / 2, 22, o.playable ? palette.bone : palette.textMuted);
  c.add(g);

  c.add(bodyText(scene, burnX, burnY + 1, String(def.fuelValue), 18, palette.text, { originX: 0.5, originY: 0.5, weight: '700' }));
  const nm = stencilText(scene, hx + 14, hy + 11, def.name, 22, ink);
  const maxName = CARD_W - 14 - 50;
  if (nm.width > maxName) nm.setScale(maxName / nm.width);
  c.add(nm);
  const typeLine = bodyText(scene, hx + 14, hy + 40, `${def.sourceType} · ${def.source}`.toUpperCase(), 14, inkSoft, { spacing: 0.08 });
  if (typeLine.width > CARD_W - 28) typeLine.setScale((CARD_W - 28) / typeLine.width);
  c.add(typeLine);

  // Body: PASSIVE (the check), then ACTIVATED (the play), each under a header and a rule in the frame color.
  const left = hx + 12;
  const colW = CARD_W - 24;
  const ruleCol = o.playable ? rarity : palette.line;
  const section = (y: number, label: string, right?: string): number => {
    c.add(bodyText(scene, left, y, label, 12, inkSoft, { spacing: 0.2 }));
    if (right) c.add(bodyText(scene, left + colW, y, right, 12, inkSoft, { originX: 1, spacing: 0.12 }));
    const rule = scene.add.graphics();
    rule.fillStyle(ruleCol, 1);
    rule.fillRect(left, y + 16, colW, 2);
    c.add(rule);
    return y + 22;
  };
  const closeRule = (y: number): number => {
    const rule = scene.add.graphics();
    rule.fillStyle(ruleCol, 1);
    rule.fillRect(left, y, colW, 2);
    c.add(rule);
    return y + 6;
  };

  let y = hy + 104;
  if (def.checkBonus > 0) {
    y = section(y, 'PASSIVE');
    const f = flowInline(scene, c, left, y, colW, 'Check', `+${def.checkBonus} ${def.checkAttribute}`, 14, ink, ink, { italicName: true });
    y = closeRule(y + f.height + 3) + 4;
  }

  // The footer stack (stars, rarity name) takes the bottom; the effect gets the room between.
  const footTop = hy + CARD_H - 40;
  y = section(y, 'ACTIVATED', def.ammoCost > 0 ? `AMMO ${def.ammoCost}` : undefined);
  const hexW = 22;
  const textX = left + hexW + 8;
  const textW = colW - hexW - 8;
  const room = footTop - y - 2;
  let size = 16;
  let flow = flowInline(scene, c, textX, y, textW, def.name, sentence(def.text), size, ink, ink, { dry: true });
  if (flow.height > room) {
    size = 14;
    flow = flowInline(scene, c, textX, y, textW, def.name, sentence(def.text), size, ink, ink, { dry: true });
  }
  const maxLines = flow.height > room ? Math.max(1, Math.floor(room / (flow.height / flow.lines))) : undefined;
  const hg = scene.add.graphics();
  drawHex(hg, left + hexW / 2, y + 11, hexW, 24, o.playable ? palette.danger : palette.meter.hpTrack);
  c.add(hg);
  c.add(bodyText(scene, left + hexW / 2, y + 12, String(def.playFuel), 15, palette.text, { originX: 0.5, originY: 0.5, weight: '700' }));
  flowInline(scene, c, textX, y + 2, textW, def.name, sentence(def.text), size, ink, ink, { maxLines });

  // Footer: stars, then the rarity name, centered.
  const sg = scene.add.graphics();
  const starS = 12;
  const starsW = info.stars * starS + (info.stars - 1) * 3;
  for (let i = 0; i < info.stars; i++) {
    drawStar(sg, -starsW / 2 + starS / 2 + i * (starS + 3), hy + CARD_H - 30, starS, frame);
  }
  c.add(sg);
  c.add(bodyText(scene, 0, hy + CARD_H - 14, info.name.toUpperCase(), 12, o.playable ? rarity : palette.textMuted, { originX: 0.5, originY: 0.5, spacing: 0.2, weight: '700' }));

  const kg = scene.add.graphics();
  kg.lineStyle(1.5, o.selected ? o.signal : palette.line, 1);
  kg.strokeRect(hx + CARD_W - 36, hy + CARD_H - 30, 24, 24);
  c.add(kg);
  c.add(bodyText(scene, hx + CARD_W - 24, hy + CARD_H - 18, o.key, 15, palette.textMuted, { originX: 0.5, originY: 0.5 }));

  if (o.tag) {
    const col = o.tag === 'BURN' ? palette.danger : o.signal;
    const tg = bodyText(scene, 0, hy, o.tag, 15, palette.bg, { originX: 0.5, originY: 0.5, spacing: 0.08 });
    const bg = scene.add.graphics();
    bg.fillStyle(col, 1);
    bg.fillRect(-tg.width / 2 - 8, hy - 11, tg.width + 16, 22);
    c.add([bg, tg]);
  }

  return c;
}

export interface UnitCardOpts {
  unit: Unit;
  signal: number;
  /** waiting in reserve and able to be deployed right now */
  ready: boolean;
  /** picked to deploy (or to act) */
  selected: boolean;
  /** printed in the footer: DEPLOY, LANE 2, DOWNED... */
  state: string;
}

/** Cut a text object down with an ellipsis until it fits `max` pixels. */
export function fitText(t: Phaser.GameObjects.Text, max: number): void {
  let str = t.text;
  while (t.width > max && str.length > 1) {
    str = str.slice(0, -1);
    t.setText(str.replace(/[ ·,.]+$/, '') + '…');
  }
}

/**
 * A squad member as a card the size of a hand card: name, HP, soak, ammo and the loadout (each piece of gear with what it
 * lets the unit do). Container centered on the card; the caller adds the hit area.
 */
export function makeUnitCard(scene: Phaser.Scene, o: UnitCardOpts): Phaser.GameObjects.Container {
  const u = o.unit;
  const c = scene.add.container(0, 0);
  const hx = -CARD_W / 2;
  const hy = -CARD_H / 2;
  const live = o.ready || o.selected;
  const frame = u.downed ? palette.danger : live ? o.signal : palette.line;
  const ink = live || u.lane !== null ? palette.text : palette.textMuted;
  const soft = live ? palette.textMuted : palette.boneDim;
  const g = scene.add.graphics();
  g.fillStyle(palette.panelDeep, 1);
  g.fillRect(hx, hy, CARD_W, CARD_H);
  if (o.selected) {
    g.lineStyle(3, o.signal, 0.12);
    g.strokeRect(hx - 9, hy - 9, CARD_W + 18, CARD_H + 18);
    g.lineStyle(3, o.signal, 0.28);
    g.strokeRect(hx - 4.5, hy - 4.5, CARD_W + 9, CARD_H + 9);
  }
  g.lineStyle(o.selected ? 4.5 : 3, frame, 1);
  g.strokeRect(hx + 1.5, hy + 1.5, CARD_W - 3, CARD_H - 3);
  c.add(g);

  const left = hx + 12;
  const colW = CARD_W - 24;
  const nm = stencilText(scene, left, hy + 9, u.name, 26, ink);
  if (nm.width > colW) nm.setScale(colW / nm.width);
  c.add(nm);

  // HP.
  const bar = scene.add.graphics();
  drawHpBar(bar, left, hy + 46, colW - 52, 16, u.hp, u.maxHp);
  c.add(bar);
  c.add(bodyText(scene, left + colW, hy + 54, `${u.hp}/${u.maxHp}`, 17, ink, { originX: 1, originY: 0.5, weight: '700' }));

  // Soak and ammo.
  const soak = u.armor + u.builtin;
  const stats = `SOAK ${soak}${u.ammoMax > 0 ? `   AMMO ${u.ammo}/${u.ammoMax}` : ''}`;
  c.add(bodyText(scene, left, hy + 70, stats, 15, live ? palette.bone : soft, { spacing: 0.06, weight: '700' }));

  // Loadout.
  const lo = loadoutOf(u.gear);
  const ruleCol = live ? o.signal : palette.line;
  c.add(bodyText(scene, left, hy + 94, 'LOADOUT', 12, soft, { spacing: 0.2 }));
  const rule = scene.add.graphics();
  rule.fillStyle(ruleCol, 1);
  rule.fillRect(left, hy + 110, colW, 2);
  c.add(rule);
  const rows = lo.length;
  const top = hy + 116;
  const room = hy + CARD_H - 34 - top;
  const rowH = Math.min(38, Math.floor(room / Math.max(1, rows)));
  lo.forEach((e, i) => {
    const y = top + i * rowH;
    const name = bodyText(scene, left, y, e.gear.toUpperCase(), 14, ink, { spacing: 0.04, weight: '700' });
    fitText(name, colW);
    c.add(name);
    const parts = [...e.actions.map((a) => a.name), ...e.cards.map((d) => d.name)];
    const sub = bodyText(scene, left, y + 17, parts.length ? parts.join(' · ') : e.type || 'passive', 12, soft);
    fitText(sub, colW);
    c.add(sub);
  });

  // Footer: what a click does.
  const col = u.downed ? palette.danger : live ? o.signal : palette.textMuted;
  c.add(bodyText(scene, 0, hy + CARD_H - 17, o.state, 14, col, { originX: 0.5, originY: 0.5, spacing: 0.2, weight: '700' }));
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
  c.add(bodyText(scene, 56, 176, label, 16, palette.textMuted, { originX: 0.5, spacing: 0.14 }));
  return c;
}
