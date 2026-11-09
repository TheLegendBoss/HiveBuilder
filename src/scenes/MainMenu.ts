import Phaser from 'phaser';
import { session } from '../core/session';
import { menuItems, menuText, type MenuItemDef } from '../data/menu';
import { palette } from '../data/palette';
import { Button } from '../ui/Button';
import { drawCable } from '../ui/Cable';
import { makeHiveCutaway } from '../ui/HiveCutaway';
import { SKULL_W, drawSkull } from '../ui/icons';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const CONSOLE = { x: 1200, y: 165, w: 630, h: 810 };
const ITEM = { x: 1230, y: 276, w: 570, h: 90, step: 102 };

export class MainMenu extends ScreenScene {
  private buttons: Button[] = [];
  private focus = 0;
  private vox: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  protected override onCreate(): void {
    this.focus = Math.max(0, menuItems.findIndex((i) => i.primary));
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  protected build(root: Phaser.GameObjects.Container, first: boolean): void {
    const signal = this.signal;
    this.buttons = [];

    // Title lockup
    root.add(stencilText(this, 84, 36, menuText.title, 138, palette.text, { spacing: 0.06, fixed: true }));
    root.add(bodyText(this, 90, 190, menuText.subtitle.toUpperCase(), 18, palette.textMuted, { spacing: 0.16 }));

    // Hive cutaway and the cable from the Sandbox item to its lit floor
    const hive = makeHiveCutaway(this, 60, 235, 960, signal);
    root.add(hive.container);

    const primaryIndex = menuItems.findIndex((i) => i.primary);
    const cableFrom = { x: CONSOLE.x, y: ITEM.y + primaryIndex * ITEM.step + ITEM.h / 2 };
    const cable = this.add.graphics();
    drawCable(cable, cableFrom, hive.litAnchor, { color: signal, c1: { x: -150, y: 33 }, c2: { x: 150, y: -21 } });
    root.add(cable);

    // Console
    const group = this.add.container(0, 0);
    root.add(group);
    group.add(makePanel(this, { ...CONSOLE, bolts: true, hazard: true, scan: true }));
    group.add(stencilText(this, CONSOLE.x + 30, CONSOLE.y + 36, menuText.consoleHeader, 30, palette.textMuted, { spacing: 0.14 }));
    const lamps = this.add.graphics();
    const lampR = 8.25;
    for (let i = 0; i < 3; i++) {
      drawLamp(lamps, CONSOLE.x + CONSOLE.w - 30 - lampR - i * 28.5, CONSOLE.y + 52, lampR, i === 2 ? signal : null);
    }
    group.add(lamps);

    const vox = bodyText(this, CONSOLE.x + 30, CONSOLE.y + CONSOLE.h - 27, menuText.vox, 16.5, palette.textMuted, {
      originY: 1,
      wrap: CONSOLE.w - 60,
      lineSpacing: 6
    });
    this.vox = vox;
    group.add(vox);

    menuItems.forEach((item, i) => {
      const b = new Button(this, {
        x: ITEM.x,
        y: ITEM.y + i * ITEM.step,
        w: ITEM.w,
        h: ITEM.h,
        label: item.label,
        size: 39,
        state: item.state,
        accent: !!item.primary,
        signal,
        key: item.key,
        stamp: menuText.offlineStamp,
        onClick: () => this.activateItem(item)
      });
      b.on('hovered', (over: boolean) => {
        if (over) {
          if (item.state === 'live') this.setFocus(i);
          this.setVox(item.offlineReason ?? menuText.vox);
        } else {
          this.setVox(menuText.vox);
        }
      });
      this.buttons.push(b);
      group.add(b);
    });
    this.setFocus(this.focus);

    // Expeditions lost and the memorial plaque
    this.buildLossBlock(root);

    if (first) {
      group.setX(120);
      group.setAlpha(0);
      cable.setAlpha(0);
      this.tweens.add({ targets: group, x: 0, alpha: 1, duration: this.anim(180), ease: 'Quad.easeIn' });
      this.tweens.add({ targets: cable, alpha: 1, delay: this.anim(180), duration: this.anim(120) });
      this.buttons.forEach((b, i) => b.stampHandle?.land(this.anim(180) + i * this.anim(70), session.settings.animSpeed));
    }
  }

  private buildLossBlock(root: Phaser.GameObjects.Container): void {
    const x = 84;
    const y = 896;
    const label = bodyText(this, x, y, menuText.expeditionsLost.toUpperCase(), 16.5, palette.textMuted, { spacing: 0.14 });
    const count = stencilText(this, x, y + 30, '0000', 66, palette.text, { spacing: 0.06, fixed: true });
    root.add([label, count]);
    const skullScale = 1.0;
    const g = this.add.graphics();
    const sx = x + count.width + 24;
    for (let i = 0; i < 5; i++) {
      drawSkull(g, sx + i * (SKULL_W * skullScale + 9), y + 44, skullScale, {
        filled: false,
        color: palette.boneDim,
        hole: palette.panel,
        lineWidth: 3.9
      });
    }
    root.add(g);
    const blockRight = sx + 5 * (SKULL_W * skullScale + 9);
    const plaqueH = 20 + 10 + 20 + 18 * 1.4 * (session.settings.textScale / 100) + 21 * 1.4 * (session.settings.textScale / 100);
    const plaque = makePanel(this, { x: blockRight + 36, y: y + 6, w: 405, h: Math.max(96, plaqueH), bolts: true });
    const head = stencilText(this, 27, 20, menuText.memorialHeader, 21, palette.textMuted, { spacing: 0.14 });
    const body = bodyText(this, 27, 20 + head.height + 10, menuText.memorialEmpty, 18, palette.text);
    plaque.add([head, body]);
    root.add(plaque);
  }

  private setVox(text: string): void {
    this.vox?.setText(text);
  }

  private setFocus(i: number): void {
    this.focus = i;
    this.buttons.forEach((b, idx) => b.setFocused(idx === i));
  }

  private nextLive(from: number, dir: 1 | -1): number {
    const n = menuItems.length;
    for (let step = 1; step <= n; step++) {
      const idx = (from + dir * step + n * 2) % n;
      if (menuItems[idx]!.state === 'live') return idx;
    }
    return from;
  }

  private activateItem(item: MenuItemDef): void {
    if (this.modal?.isOpen) return;
    switch (item.id) {
      case 'sandbox':
        this.scene.start(SceneKeys.SandboxSetup);
        break;
      case 'settings':
        this.scene.start(SceneKeys.Settings, { from: SceneKeys.MainMenu });
        break;
      case 'exit':
        this.confirmQuit();
        break;
      default:
        this.setVox(item.offlineReason ?? menuText.vox);
    }
  }

  private confirmQuit(): void {
    this.modal = new Modal(this, this.root, {
      title: menuText.quitTitle,
      body: menuText.quitBody,
      confirmLabel: menuText.quitConfirm,
      cancelLabel: menuText.quitCancel,
      signal: this.signal,
      onConfirm: () => {
        this.modal = null;
        window.close();
        const cover = this.add.rectangle(-4000, -4000, 10000, 10000, palette.bg, 0.9).setOrigin(0, 0);
        cover.setInteractive();
        this.root.add(cover);
        this.root.add(stencilText(this, 960, 540, menuText.quitDone, 54, palette.text, { originX: 0.5, originY: 0.5 }));
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const digit = '123456'.indexOf(e.key);
    if (digit >= 0) {
      this.setFocus(menuItems[digit]!.state === 'live' ? digit : this.focus);
      this.activateItem(menuItems[digit]!);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        this.setFocus(this.nextLive(this.focus, 1));
        break;
      case 'ArrowUp':
        this.setFocus(this.nextLive(this.focus, -1));
        break;
      case 'Enter':
      case ' ':
        this.activateItem(menuItems[this.focus]!);
        break;
      case 'Escape':
        this.confirmQuit();
        break;
    }
  }
}
