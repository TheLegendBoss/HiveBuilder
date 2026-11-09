import Phaser from 'phaser';
import { mix, palette } from '../data/palette';
import { makeStamp, type StampHandle } from './Stamp';
import { bodyText, stencilText } from './text';

export interface ButtonOpts {
  /** top-left corner in the parent's space */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** label size at the reference */
  size: number;
  align?: 'left' | 'center';
  state: 'live' | 'offline';
  /** lit in the signal color */
  accent?: boolean;
  signal: number;
  /** keyboard shortcut shown in a small box */
  key?: string;
  /** stamp text shown on offline buttons */
  stamp?: string;
  onClick: () => void;
}

/**
 * A button. Children are positioned around the container's center so the
 * container itself carries the hit area.
 */
export class Button extends Phaser.GameObjects.Container {
  readonly opts: ButtonOpts;
  readonly stampHandle: StampHandle | null = null;
  private bg: Phaser.GameObjects.Graphics;
  private hover = false;
  private focused = false;
  private pressed = false;

  constructor(scene: Phaser.Scene, opts: ButtonOpts) {
    super(scene, opts.x + opts.w / 2, opts.y + opts.h / 2);
    this.opts = opts;
    this.bg = scene.add.graphics();
    this.add(this.bg);

    const left = -opts.w / 2;
    const textColor = opts.state === 'offline' ? palette.textMuted : palette.text;
    const label = stencilText(scene, opts.align === 'center' ? 0 : left + 27, 0, opts.label, opts.size, textColor, {
      spacing: 0.08,
      originX: opts.align === 'center' ? 0.5 : 0,
      originY: 0.5
    });
    this.add(label);

    let cursor = opts.w / 2 - 27;
    if (opts.key) {
      const k = bodyText(scene, 0, 0, opts.key, 16.5, palette.textMuted, { originX: 0.5, originY: 0.5 });
      const kw = Math.max(36, k.width + 18);
      const kh = k.height + 6;
      const kg = scene.add.graphics();
      kg.lineStyle(1.5, palette.line, 1);
      kg.strokeRect(cursor - kw, -kh / 2, kw, kh);
      k.setPosition(cursor - kw / 2, 0);
      this.add([kg, k]);
      cursor -= kw + 18;
    }
    if (opts.state === 'offline' && opts.stamp) {
      const s = makeStamp(scene, opts.stamp, 19.5);
      s.container.setPosition(cursor - s.width / 2, 0);
      this.add(s.container);
      this.stampHandle = s;
    }

    this.setSize(opts.w, opts.h);
    if (opts.state === 'live') {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerover', () => this.setHover(true));
      this.on('pointerout', () => {
        this.pressed = false;
        this.setHover(false);
      });
      this.on('pointerdown', () => {
        this.pressed = true;
        this.redraw();
      });
      this.on('pointerup', () => {
        if (!this.pressed) return;
        this.pressed = false;
        this.redraw();
        opts.onClick();
      });
    } else {
      this.setInteractive();
      this.on('pointerover', () => this.emit('hovered', true));
      this.on('pointerout', () => this.emit('hovered', false));
    }
    this.redraw();
    scene.add.existing(this);
  }

  private setHover(v: boolean): void {
    this.hover = v;
    this.redraw();
    this.emit('hovered', v);
  }

  setFocused(v: boolean): void {
    this.focused = v;
    this.redraw();
  }

  get isLive(): boolean {
    return this.opts.state === 'live';
  }

  activate(): void {
    if (this.isLive) this.opts.onClick();
  }

  private redraw(): void {
    const { w, h, accent, signal, state } = this.opts;
    const g = this.bg;
    g.clear();
    const x = -w / 2;
    const y = -h / 2;
    let fill: number = palette.panelDeep;
    if (state === 'live') {
      if (accent) fill = mix(signal, palette.bg, this.hover || this.focused ? 0.82 : 0.9);
      else if (this.hover || this.focused) fill = palette.panelRaised;
    }
    if (this.pressed) fill = mix(fill, palette.bg, 0.4);
    if (accent && state === 'live') {
      g.lineStyle(3, signal, 0.12);
      g.strokeRect(x - 9, y - 9, w + 18, h + 18);
      g.lineStyle(3, signal, 0.25);
      g.strokeRect(x - 4.5, y - 4.5, w + 9, h + 9);
    }
    g.fillStyle(fill, 1);
    g.fillRect(x, y, w, h);
    const lit = state === 'live' && (accent || this.focused);
    g.lineStyle(lit ? 3 : 1.5, lit ? signal : palette.line, 1);
    g.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    if (this.focused && state === 'live') {
      g.fillStyle(signal, 1);
      g.fillTriangle(x - 30, y + h / 2 - 12, x - 30, y + h / 2 + 12, x - 9, y + h / 2);
    }
  }
}
