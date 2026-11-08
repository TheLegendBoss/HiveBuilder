import Phaser from 'phaser';
import { mix, palette, toCss } from '../data/palette';
import { makeStamp } from './Stamp';
import { monoText, stencilText } from './text';

export interface RowBase {
  label: string;
  hint: string;
  x: number;
  y: number;
  w: number;
  h: number;
  signal: number;
  disabled?: boolean;
  /** shown in a stamp when disabled */
  disabledStamp?: string;
}

/** A settings-style row: label on the left, a control on the right. Children are centered. */
export abstract class Row extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.Graphics;
  protected focused = false;
  readonly base: RowBase;

  constructor(scene: Phaser.Scene, base: RowBase) {
    super(scene, base.x + base.w / 2, base.y + base.h / 2);
    this.base = base;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.add(
      stencilText(scene, -base.w / 2 + 30, 0, base.label, 33, base.disabled ? palette.textMuted : palette.text, {
        spacing: 0.08,
        originY: 0.5
      })
    );
    if (base.disabled && base.disabledStamp) {
      const s = makeStamp(scene, base.disabledStamp, 19.5, palette.textMuted);
      s.container.setPosition(base.w / 2 - 30 - s.width / 2, 0);
      this.add(s.container);
    }
    this.setSize(base.w, base.h);
    scene.add.existing(this);
  }

  get hint(): string {
    return this.base.hint;
  }

  get isDisabled(): boolean {
    return !!this.base.disabled;
  }

  setFocused(v: boolean): void {
    this.focused = v;
    this.drawBg();
  }

  protected drawBg(): void {
    const { w, h, signal } = this.base;
    const g = this.bg;
    g.clear();
    g.fillStyle(this.focused ? mix(signal, palette.bg, 0.9) : palette.panelDeep, 1);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(this.focused ? 3 : 1.5, this.focused ? signal : palette.line, 1);
    g.strokeRect(-w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5);
    if (this.focused) {
      g.fillStyle(signal, 1);
      g.fillTriangle(-w / 2 - 30, -12, -w / 2 - 30, 12, -w / 2 - 9, 0);
    }
  }

  abstract adjust(dir: -1 | 1): void;
  abstract activate(): void;
}

export interface ToggleRowOpts extends RowBase {
  value: boolean;
  onChange: (v: boolean) => void;
}

export class ToggleRow extends Row {
  private box: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  private value: boolean;

  constructor(scene: Phaser.Scene, private o: ToggleRowOpts) {
    super(scene, o);
    this.value = o.value;
    this.box = scene.add.graphics();
    this.valueText = monoText(scene, 0, 0, '', 24, palette.text, { originX: 1, originY: 0.5 });
    this.add([this.box, this.valueText]);
    this.draw();
    if (!o.disabled) {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerup', () => this.activate());
      this.on('pointerover', () => this.emit('hovered'));
    }
  }

  private draw(): void {
    this.drawBg();
    const { w, signal, disabled } = this.o;
    const bx = w / 2 - 30 - 42;
    this.box.clear();
    this.valueText.setText('');
    if (disabled) return;
    this.box.lineStyle(3, signal, 1);
    this.box.strokeRect(bx, -21, 42, 42);
    if (this.value) {
      this.box.fillStyle(signal, 1);
      this.box.fillRect(bx + 9, -12, 24, 24);
    }
    this.valueText.setText(this.value ? 'ON' : 'OFF');
    this.valueText.setPosition(bx - 21, 0);
  }

  override setFocused(v: boolean): void {
    super.setFocused(v);
  }

  setValue(v: boolean): void {
    this.value = v;
    this.draw();
  }

  adjust(dir: -1 | 1): void {
    if (this.o.disabled) return;
    const next = dir > 0;
    if (next !== this.value) this.activate();
  }

  activate(): void {
    if (this.o.disabled) return;
    this.value = !this.value;
    this.draw();
    this.o.onChange(this.value);
  }
}

export interface SliderRowOpts extends RowBase {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** converts a screen point to this row's reference-space x */
  toRefX: (screenX: number) => number;
}

export class SliderRow extends Row {
  private g: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  private value: number;
  private readonly trackW = 360;
  private dragging = false;

  constructor(scene: Phaser.Scene, private o: SliderRowOpts) {
    super(scene, o);
    this.value = o.value;
    this.g = scene.add.graphics();
    this.valueText = monoText(scene, 0, 0, '', 24, palette.text, { originX: 1, originY: 0.5 });
    this.add([this.g, this.valueText]);
    this.draw();
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.fromPointer(p);
    });
    this.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.isDown) this.fromPointer(p);
    });
    this.on('pointerup', () => (this.dragging = false));
    this.on('pointerout', () => (this.dragging = false));
    this.on('pointerover', () => this.emit('hovered'));
  }

  private trackLeft(): number {
    return this.o.w / 2 - 30 - this.trackW - 126;
  }

  private fromPointer(p: Phaser.Input.Pointer): void {
    const localX = this.o.toRefX(p.x) - this.x - this.trackLeft();
    const t = Phaser.Math.Clamp(localX / this.trackW, 0, 1);
    this.set(this.o.min + t * (this.o.max - this.o.min));
  }

  private set(v: number): void {
    const stepped = Math.round(v / this.o.step) * this.o.step;
    const clamped = Phaser.Math.Clamp(stepped, this.o.min, this.o.max);
    if (clamped === this.value) return;
    this.value = clamped;
    this.draw();
    this.o.onChange(clamped);
  }

  private draw(): void {
    this.drawBg();
    const tl = this.trackLeft();
    const t = (this.value - this.o.min) / (this.o.max - this.o.min);
    const g = this.g;
    g.clear();
    g.fillStyle(palette.bloodDry, 1);
    g.fillRect(tl, -6, this.trackW, 12);
    g.fillStyle(palette.text, 1);
    g.fillRect(tl, -6, this.trackW * t, 12);
    g.lineStyle(1.5, palette.line, 1);
    g.strokeRect(tl, -6, this.trackW, 12);
    g.fillStyle(this.o.signal, 1);
    g.fillRect(tl + this.trackW * t - 6, -21, 12, 42);
    this.valueText.setText(`${Math.round(this.value)}%`);
    this.valueText.setPosition(this.o.w / 2 - 30, 0);
  }

  adjust(dir: -1 | 1): void {
    this.set(this.value + dir * this.o.step);
  }

  activate(): void {
    // Enter does nothing on a slider; use Left and Right.
  }
}

export interface ChoiceRowOpts<T extends number | string> extends RowBase {
  /** converts a screen point to this row's reference-space x */
  toRefX: (screenX: number) => number;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

export class ChoiceRow<T extends number | string> extends Row {
  private g: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private index: number;
  private readonly cellW = 150;
  private readonly cellH = 54;

  constructor(scene: Phaser.Scene, private o: ChoiceRowOpts<T>) {
    super(scene, o);
    this.index = Math.max(0, o.options.findIndex((opt) => opt.value === o.value));
    this.g = scene.add.graphics();
    this.add(this.g);
    o.options.forEach(() => {
      const t = monoText(scene, 0, 0, '', 24, palette.text, { originX: 0.5, originY: 0.5 });
      this.texts.push(t);
      this.add(t);
    });
    this.draw();
    if (!o.disabled) {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerup', (p: Phaser.Input.Pointer) => this.chooseAtLocalX(this.o.toRefX(p.x) - this.x));
      this.on('pointerover', () => this.emit('hovered'));
    }
  }

  /** x is in this row's local space (centered). */
  chooseAtLocalX(localX: number): void {
    const cells = this.o.options.length;
    const left = this.o.w / 2 - 30 - cells * this.cellW;
    const i = Math.floor((localX - left) / this.cellW);
    if (i >= 0 && i < cells) this.select(i);
  }

  private select(i: number): void {
    if (this.o.disabled || i === this.index) return;
    this.index = i;
    this.draw();
    this.o.onChange(this.o.options[i]!.value);
  }

  private draw(): void {
    this.drawBg();
    const cells = this.o.options.length;
    const right = this.o.w / 2 - 30;
    const left = right - cells * this.cellW;
    const g = this.g;
    g.clear();
    this.o.options.forEach((opt, i) => {
      const x = left + i * this.cellW;
      const on = i === this.index;
      g.lineStyle(on ? 3 : 1.5, on && !this.o.disabled ? this.o.signal : palette.line, 1);
      g.strokeRect(x + 3, -this.cellH / 2, this.cellW - 6, this.cellH);
      if (on) {
        g.fillStyle(this.o.disabled ? palette.line : mix(this.o.signal, palette.bg, 0.8), 1);
        g.fillRect(x + 3, -this.cellH / 2, this.cellW - 6, this.cellH);
      }
      const t = this.texts[i]!;
      t.setText(opt.label);
      t.setPosition(x + this.cellW / 2, 0);
      t.setColor(toCss(on ? palette.text : palette.textMuted));
    });
  }

  adjust(dir: -1 | 1): void {
    const next = Phaser.Math.Clamp(this.index + dir, 0, this.o.options.length - 1);
    this.select(next);
  }

  activate(): void {
    this.select((this.index + 1) % this.o.options.length);
  }
}
