import Phaser from 'phaser';
import { autoAdvances, reactionOf } from '../core/packRip';
import { rarityOf } from '../core/stash';
import { palette, rarityInfo } from '../data/palette';
import type { AutoNext, PackStyle } from '../data/settings';
import type { LootItem } from '../sim/expedition';
import { Button } from './Button';
import { ITEM_H, ITEM_W, makeItemCard } from './itemCard';
import { scaledDuration } from './layout';
import { makePanel } from './Panel';
import { makeStamp } from './Stamp';
import { bodyText, stencilText } from './text';

export interface PackRipOpts {
  title: string;
  cards: LootItem[];
  /** per card, in order: already owned */
  owned: boolean[];
  style: PackStyle;
  autoNext: AutoNext;
  animSpeed: number;
  signal: number;
  onDone: () => void;
}

const PANEL = { x: 120, y: 70, w: 1680, h: 940 };
const GRID_SCALE = 0.62;

/**
 * Opens a bought pack. Rip it: one card at a time from a face-up stack, a click shows the next, rarer pulls get a reaction.
 * Show all: the whole pack at once. Space, Enter or a click moves on; Esc skips to the end.
 */
export class PackRip {
  private container: Phaser.GameObjects.Container;
  private stage: Phaser.GameObjects.Container;
  private hud: Phaser.GameObjects.Container;
  private index = -1;
  private closed = false;
  private finished = false;
  private autoTimer: Phaser.Time.TimerEvent | null = null;
  private onKey: (e: KeyboardEvent) => void;

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private o: PackRipOpts) {
    const c = scene.add.container(0, 0);
    this.container = c;
    const dim = scene.add.rectangle(-4000, -4000, 10000, 10000, palette.bg, 0.9).setOrigin(0, 0);
    dim.setInteractive();
    c.add(dim);
    c.add(makePanel(scene, { ...PANEL, bolts: true, hazard: true, scan: true, border: o.signal, borderWidth: 3 }));
    c.add(stencilText(scene, PANEL.x + 40, PANEL.y + 22, o.title, 46, palette.text, { spacing: 0.05 }));
    this.stage = scene.add.container(0, 0);
    this.hud = scene.add.container(0, 0);
    c.add([this.stage, this.hud]);
    parent.add(c);

    this.onKey = (e: KeyboardEvent) => {
      if (this.closed) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      } else if (e.key === 'Escape') {
        this.skipToEnd();
      }
    };
    scene.input.keyboard?.on('keydown', this.onKey);

    if (o.style === 'all' || o.cards.length === 0) this.showAll();
    else this.advance();
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.autoTimer?.remove();
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.container.destroy();
  }

  private ms(n: number): number {
    return scaledDuration(n, this.o.animSpeed);
  }

  private done(): void {
    if (this.closed) return;
    const cb = this.o.onDone;
    this.close();
    cb();
  }

  // ---------- Rip it

  private advance(): void {
    if (this.closed) return;
    this.autoTimer?.remove();
    this.autoTimer = null;
    if (this.finished) return this.done();
    if (this.index + 1 >= this.o.cards.length) return this.showAll();
    this.index++;
    this.reveal(this.index);
  }

  private reveal(i: number): void {
    const card = this.o.cards[i]!;
    const owned = this.o.owned[i] ?? false;
    const r = rarityOf(card);
    const col = palette.rarity[r];
    const react = reactionOf(r);
    this.stage.removeAll(true);
    this.hud.removeAll(true);
    const last = i === this.o.cards.length - 1;
    const cx = PANEL.x + PANEL.w / 2;
    const cy = PANEL.y + 80 + 40 + ITEM_H / 2 + 30;

    // the stack behind: one edge per card still to come
    const left = this.o.cards.length - 1 - i;
    const sg = this.scene.add.graphics();
    for (let k = Math.min(left, 5); k >= 1; k--) {
      sg.fillStyle(palette.panelRaised, 1);
      sg.fillRect(cx - ITEM_W / 2 + k * 5, cy - ITEM_H / 2 + k * 5, ITEM_W, ITEM_H);
      sg.lineStyle(1.5, palette.line, 1);
      sg.strokeRect(cx - ITEM_W / 2 + k * 5, cy - ITEM_H / 2 + k * 5, ITEM_W, ITEM_H);
    }
    this.stage.add(sg);

    const flash = this.scene.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, col, 0).setOrigin(0, 0);
    this.stage.add(flash);
    const holder = this.scene.add.container(cx, cy);
    const face = makeItemCard(this.scene, card, { owned });
    holder.add(face);
    holder.setInteractive(new Phaser.Geom.Rectangle(-ITEM_W / 2, -ITEM_H / 2, ITEM_W, ITEM_H), Phaser.Geom.Rectangle.Contains);
    holder.on('pointerup', () => this.advance());
    this.stage.add(holder);
    holder.setScale(0.86);
    holder.setAlpha(0.2);
    this.scene.tweens.add({ targets: holder, scale: 1, alpha: 1, duration: this.ms(140), ease: 'Quad.easeOut' });
    if (react.flash > 0) {
      this.scene.tweens.add({ targets: flash, alpha: { from: react.flash, to: 0 }, duration: this.ms(520), ease: 'Quad.easeOut' });
    }
    if (react.shake > 0) {
      const sh = react.shake;
      this.scene.tweens.add({
        targets: holder, x: { from: cx - sh, to: cx + sh }, duration: this.ms(40), yoyo: true, repeat: 3,
        onComplete: () => holder.setX(cx)
      });
    }
    if (react.stamp) {
      const stamp = makeStamp(this.scene, rarityInfo[r].name, 46, col);
      stamp.container.setPosition(cx, cy + 112);
      this.stage.add(stamp.container);
      stamp.land(this.ms(160), this.o.animSpeed);
    }

    // counter and a row of what has been pulled so far
    this.hud.add(bodyText(this.scene, PANEL.x + PANEL.w - 40, PANEL.y + 38, `CARD ${i + 1} OF ${this.o.cards.length}`, 20, palette.textMuted, { originX: 1, spacing: 0.14 }));
    const chips = this.scene.add.graphics();
    this.o.cards.slice(0, i + 1).forEach((cd, k) => {
      chips.fillStyle(palette.rarity[rarityOf(cd)], 1);
      chips.fillRect(PANEL.x + 40 + k * 34, PANEL.y + 96, 26, 10);
    });
    this.hud.add(chips);

    const by = PANEL.y + PANEL.h - 120;
    this.hud.add(
      new Button(this.scene, {
        x: PANEL.x + PANEL.w / 2 - 400, y: by, w: 380, h: 78, label: last ? 'See the pack' : 'Next card', size: 30, align: 'center', state: 'live', accent: true,
        signal: this.o.signal, key: 'Space', onClick: () => this.advance()
      })
    );
    this.hud.add(
      new Button(this.scene, {
        x: PANEL.x + PANEL.w / 2 + 20, y: by, w: 380, h: 78, label: 'Skip to end', size: 30, align: 'center', state: 'live', signal: this.o.signal, key: 'Esc',
        onClick: () => this.skipToEnd()
      })
    );

    this.autoTimer?.remove();
    this.autoTimer = null;
    if (!last && autoAdvances(r, owned, this.o.autoNext)) {
      this.autoTimer = this.scene.time.delayedCall(this.ms(620), () => this.advance());
    }
  }

  private skipToEnd(): void {
    if (this.closed) return;
    if (this.finished) return this.done();
    this.autoTimer?.remove();
    this.autoTimer = null;
    this.showAll();
  }

  // ---------- Show all

  private showAll(): void {
    this.finished = true;
    this.autoTimer?.remove();
    this.autoTimer = null;
    this.stage.removeAll(true);
    this.hud.removeAll(true);
    const cards = this.o.cards;
    const n = cards.length;
    const perRow = Math.min(5, Math.max(1, n));
    const cw = ITEM_W * GRID_SCALE;
    const ch = ITEM_H * GRID_SCALE;
    const gap = 24;
    const rows = Math.ceil(n / perRow);
    const gridW = perRow * cw + (perRow - 1) * gap;
    const gx = PANEL.x + (PANEL.w - gridW) / 2;
    const gy = PANEL.y + 150 + (rows === 1 ? 70 : 0);
    cards.forEach((card, i) => {
      const x = gx + (i % perRow) * (cw + gap) + cw / 2;
      const y = gy + Math.floor(i / perRow) * (ch + gap) + ch / 2;
      const holder = this.scene.add.container(x, y);
      holder.add(makeItemCard(this.scene, card, { owned: this.o.owned[i] ?? false }));
      holder.setScale(GRID_SCALE * 0.8);
      holder.setAlpha(0);
      this.stage.add(holder);
      this.scene.tweens.add({ targets: holder, scale: GRID_SCALE, alpha: 1, delay: this.ms(i * 70), duration: this.ms(140), ease: 'Quad.easeOut' });
      const r = rarityOf(card);
      if (reactionOf(r).stamp) {
        const stamp = makeStamp(this.scene, rarityInfo[r].name, 26, palette.rarity[r]);
        stamp.container.setPosition(x, y + ch * 0.3);
        this.stage.add(stamp.container);
        stamp.land(this.ms(i * 70 + 160), this.o.animSpeed);
      }
    });
    this.hud.add(bodyText(this.scene, PANEL.x + PANEL.w - 40, PANEL.y + 38, `${n} CARD${n === 1 ? '' : 'S'}`, 20, palette.textMuted, { originX: 1, spacing: 0.14 }));
    this.hud.add(
      new Button(this.scene, {
        x: PANEL.x + PANEL.w / 2 - 150, y: PANEL.y + PANEL.h - 120, w: 300, h: 78, label: 'Done', size: 33, align: 'center', state: 'live', accent: true,
        signal: this.o.signal, key: 'Enter', onClick: () => this.done()
      })
    );
  }
}

