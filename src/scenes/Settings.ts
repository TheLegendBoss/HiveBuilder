import Phaser from 'phaser';
import { updateSettings, session } from '../core/session';
import { settingsText } from '../data/menu';
import { palette } from '../data/palette';
import { animSpeedOptions, textScaleOptions } from '../data/settings';
import { Button } from '../ui/Button';
import { makePanel } from '../ui/Panel';
import { ChoiceRow, SliderRow, ToggleRow, type Row } from '../ui/rows';
import { bodyText, stencilText } from '../ui/text';
import { SceneKeys, type SceneKey } from './keys';
import { ScreenScene } from './ScreenScene';

const PANEL = { x: 360, y: 210, w: 1200, h: 660 };
const ROW = { x: 396, y: 262, w: 1128, h: 96, step: 108 };

export class Settings extends ScreenScene {
  private from: SceneKey = SceneKeys.MainMenu;
  private rows: Row[] = [];
  private back: Button | null = null;
  private focus = 0;
  private vox: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SceneKeys.Settings);
  }

  init(data: { from?: SceneKey }): void {
    this.from = data?.from ?? SceneKeys.MainMenu;
    this.focus = 0;
  }

  protected override onCreate(): void {
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  protected build(root: Phaser.GameObjects.Container): void {
    const signal = this.signal;
    const s = session.settings;
    const t = settingsText.rows;
    root.add(stencilText(this, 84, 36, settingsText.title, 90, palette.text, { spacing: 0.06, fixed: true }));
    root.add(makePanel(this, { ...PANEL, bolts: true, hazard: true, scan: true }));

    const common = { x: ROW.x, w: ROW.w, h: ROW.h, signal, toRefX: (sx: number) => this.refX(sx) };
    this.rows = [
      new SliderRow(this, {
        ...common, ...t.volume, y: ROW.y, value: s.volume, min: 0, max: 100, step: 5,
        onChange: (v) => updateSettings({ volume: v })
      }),
      new ToggleRow(this, {
        ...common, ...t.fullscreen, y: ROW.y + ROW.step, value: this.scale.isFullscreen,
        onChange: (v) => {
          updateSettings({ fullscreen: v });
          if (v && !this.scale.isFullscreen) this.scale.startFullscreen();
          if (!v && this.scale.isFullscreen) this.scale.stopFullscreen();
        }
      }),
      new ChoiceRow<number>(this, {
        ...common, ...t.textScale, y: ROW.y + ROW.step * 2, value: s.textScale,
        options: textScaleOptions.map((v) => ({ value: v, label: `${v}%` })),
        onChange: (v) => {
          updateSettings({ textScale: v as 100 | 125 | 150 });
          // rebuild after this event finishes so the row that fired it is not destroyed mid-handler
          this.time.delayedCall(0, () => this.rebuild());
        }
      }),
      new ToggleRow(this, {
        ...common, ...t.colorblind, y: ROW.y + ROW.step * 3, value: s.colorblind,
        disabled: true, disabledStamp: 'Later', onChange: () => undefined
      }),
      new ChoiceRow<number>(this, {
        ...common, ...t.animSpeed, y: ROW.y + ROW.step * 4, value: s.animSpeed,
        options: animSpeedOptions.map((v) => ({ value: v, label: v === 1 ? 'Normal' : v === 2 ? 'Fast' : 'Off' })),
        onChange: (v) => updateSettings({ animSpeed: v as 0 | 1 | 2 })
      })
    ];
    this.rows.forEach((r, i) => {
      root.add(r);
      if (!r.isDisabled) r.on('hovered', () => this.setFocus(i));
    });

    this.vox = bodyText(this, ROW.x + 6, PANEL.y + PANEL.h - 36, '', 16.5, palette.textMuted, { originY: 1, wrap: ROW.w - 12 });
    root.add(this.vox);

    this.back = new Button(this, {
      x: PANEL.x,
      y: 920,
      w: 330,
      h: 84,
      label: settingsText.back,
      size: 36,
      state: 'live',
      signal,
      key: 'Esc',
      onClick: () => this.leave()
    });
    this.back.on('hovered', (over: boolean) => over && this.setFocus(this.rows.length));
    root.add(this.back);
    this.setFocus(this.focus);
  }

  private setFocus(i: number): void {
    this.focus = Phaser.Math.Clamp(i, 0, this.rows.length);
    this.rows.forEach((r, idx) => r.setFocused(idx === this.focus));
    this.back?.setFocused(this.focus === this.rows.length);
    this.vox?.setText(this.rows[this.focus]?.hint ?? '');
  }

  private step(dir: 1 | -1): void {
    let i = this.focus;
    do {
      i += dir;
    } while (i >= 0 && i < this.rows.length && this.rows[i]!.isDisabled);
    this.setFocus(Phaser.Math.Clamp(i, 0, this.rows.length));
  }

  private leave(): void {
    this.scene.start(this.from);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    switch (e.key) {
      case 'Escape':
        this.leave();
        break;
      case 'ArrowDown':
        this.step(1);
        break;
      case 'ArrowUp':
        this.step(-1);
        break;
      case 'ArrowLeft':
        this.rows[this.focus]?.adjust(-1);
        break;
      case 'ArrowRight':
        this.rows[this.focus]?.adjust(1);
        break;
      case 'Enter':
      case ' ':
        if (this.focus === this.rows.length) this.leave();
        else this.rows[this.focus]?.activate();
        break;
    }
  }
}
