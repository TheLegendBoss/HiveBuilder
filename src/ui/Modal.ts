import Phaser from 'phaser';
import { palette } from '../data/palette';
import { REF_H, REF_W } from './layout';
import { makePanel } from './Panel';
import { Button } from './Button';
import { monoText, stencilText } from './text';

export interface ModalOpts {
  title: string;
  body: string;
  confirmLabel: string;
  /** leave out for a single-button notice */
  cancelLabel?: string;
  signal: number;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * A modal that dims everything, swallows clicks, and traps the keyboard.
 * Esc cancels, Enter uses the focused button, Left and Right move focus.
 * Focus starts on Cancel so a stray Enter never confirms.
 */
export class Modal {
  private container: Phaser.GameObjects.Container;
  private buttons: Button[] = [];
  private focus = 1;
  private onKey: (e: KeyboardEvent) => void;
  private closed = false;

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private o: ModalOpts) {
    const c = scene.add.container(0, 0);
    this.container = c;
    const dim = scene.add.rectangle(-4000, -4000, 10000, 10000, palette.bg, 0.82).setOrigin(0, 0);
    dim.setInteractive();
    c.add(dim);

    const w = 840;
    const bodyText = monoText(scene, 0, 0, o.body, 24, palette.textMuted, { wrap: w - 96, lineSpacing: 6 });
    const titleProbe = stencilText(scene, 0, 0, o.title, 54, palette.text, { spacing: 0.06 });
    const bodyDy = Math.max(138, 54 + titleProbe.height + 30);
    titleProbe.destroy();
    const h = Math.max(360, bodyDy + bodyText.height + 42 + 78 + 42);
    bodyText.destroy();
    const x = (REF_W - w) / 2;
    const y = (REF_H - h) / 2;
    const panel = makePanel(scene, { x, y, w, h, bolts: true, hazard: true, scan: true, border: o.signal, borderWidth: 3 });
    c.add(panel);
    c.add(stencilText(scene, x + 48, y + 54, o.title, 54, palette.text, { spacing: 0.06 }));
    c.add(monoText(scene, x + 48, y + bodyDy, o.body, 24, palette.textMuted, { wrap: w - 96, lineSpacing: 6 }));

    const bw = 300;
    const bh = 78;
    const by = y + h - bh - 42;
    const single = o.cancelLabel === undefined;
    const confirm = new Button(scene, {
      x: single ? x + w - 48 - bw : x + w - 48 - bw * 2 - 72,
      y: by,
      w: bw,
      h: bh,
      label: o.confirmLabel,
      size: 33,
      align: 'center',
      state: 'live',
      signal: o.signal,
      accent: single,
      onClick: () => this.finish(true)
    });
    const cancel = single ? null : new Button(scene, {
      x: x + w - 48 - bw,
      y: by,
      w: bw,
      h: bh,
      label: o.cancelLabel ?? '',
      size: 33,
      align: 'center',
      state: 'live',
      accent: true,
      signal: o.signal,
      onClick: () => this.finish(false)
    });
    this.buttons = cancel ? [confirm, cancel] : [confirm];
    c.add(this.buttons);
    parent.add(c);
    this.setFocus(single ? 0 : 1);

    this.onKey = (e: KeyboardEvent) => {
      if (this.closed) return;
      switch (e.key) {
        case 'Escape':
          if (this.buttons.length > 1) this.finish(false);
          break;
        case 'Enter':
        case ' ':
          this.buttons[this.focus]?.activate();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Tab':
          if (this.buttons.length > 1) this.setFocus(this.focus === 0 ? 1 : 0);
          e.preventDefault();
          break;
      }
    };
    scene.input.keyboard?.on('keydown', this.onKey);
  }

  private setFocus(i: number): void {
    this.focus = i;
    this.buttons.forEach((b, idx) => b.setFocused(idx === i));
  }

  private finish(confirmed: boolean): void {
    if (this.closed) return;
    this.close();
    if (confirmed) this.o.onConfirm();
    else this.o.onCancel?.();
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.container.destroy();
  }
}
