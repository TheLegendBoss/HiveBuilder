import Phaser from 'phaser';
import { setFaction, session } from '../core/session';
import { factionBlurbs, setupText } from '../data/menu';
import { factionAccent, factionNames, factionOrder, mix, palette, type FactionId } from '../data/palette';
import { Button } from '../ui/Button';
import { drawLamp } from '../ui/Lamp';
import { makePanel } from '../ui/Panel';
import { makeStamp } from '../ui/Stamp';
import { monoText, stencilText } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const CARD = { x: 180, y: 250, w: 480, h: 360, gap: 60 };

export class SandboxSetup extends ScreenScene {
  constructor() {
    super(SceneKeys.SandboxSetup);
  }

  protected override onCreate(): void {
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  protected build(root: Phaser.GameObjects.Container): void {
    const signal = this.signal;
    root.add(stencilText(this, 84, 36, setupText.title, 90, palette.text, { spacing: 0.06, fixed: true }));
    root.add(monoText(this, 90, 160, setupText.factionHeader.toUpperCase(), 18, palette.textMuted, { spacing: 0.16 }));

    factionOrder.forEach((id, i) => {
      root.add(this.factionCard(id, CARD.x + i * (CARD.w + CARD.gap), CARD.y, i));
    });

    // Depth dial (placeholder)
    const dial = makePanel(this, { x: CARD.x, y: 650, w: 3 * CARD.w + 2 * CARD.gap, h: 210, bolts: true, scan: true });
    dial.add(stencilText(this, 36, 24, setupText.dialsHeader, 27, palette.textMuted, { spacing: 0.12 }));
    setupText.dials.forEach((line, i) => dial.add(monoText(this, 36, 78 + i * 38, line, 22, palette.text)));
    const stamp = makeStamp(this, 'Coming', 21, palette.textMuted);
    stamp.container.setPosition(3 * CARD.w + 2 * CARD.gap - 36 - stamp.width / 2, 48);
    dial.add(stamp.container);
    root.add(dial);

    root.add(
      new Button(this, {
        x: CARD.x, y: 912, w: 330, h: 84, label: setupText.back, size: 36, state: 'live', signal, key: 'Esc',
        onClick: () => this.scene.start(SceneKeys.MainMenu)
      })
    );
    root.add(
      new Button(this, {
        x: CARD.x + 3 * CARD.w + 2 * CARD.gap - 600, y: 912, w: 600, h: 84, label: setupText.start, size: 36,
        state: session.faction === 'tsc' ? 'live' : 'offline', accent: session.faction === 'tsc', signal, key: 'Enter',
        stamp: setupText.startStamp, onClick: () => this.startRun()
      })
    );
    root.add(
      new Button(this, {
        x: CARD.x + 3 * CARD.w + 2 * CARD.gap - 600 - 30 - 420, y: 912, w: 420, h: 84, label: setupText.quickFight, size: 36,
        state: session.faction === 'tsc' ? 'live' : 'offline', signal, key: 'F', stamp: setupText.startStamp,
        onClick: () => this.quickFight()
      })
    );
  }

  private factionCard(id: FactionId, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const selected = session.faction === id;
    const accent = factionAccent[id];
    const c = this.add.container(x + CARD.w / 2, y + CARD.h / 2);
    const g = this.add.graphics();
    const hx = -CARD.w / 2;
    const hy = -CARD.h / 2;
    g.fillStyle(selected ? mix(accent, palette.bg, 0.92) : palette.panelDeep, 1);
    g.fillRect(hx, hy, CARD.w, CARD.h);
    g.lineStyle(selected ? 4.5 : 1.5, selected ? accent : palette.line, 1);
    g.strokeRect(hx + 1, hy + 1, CARD.w - 2, CARD.h - 2);
    g.fillStyle(accent, selected ? 1 : 0.45);
    g.fillRect(hx, hy, CARD.w, 15);
    drawLamp(g, hx + 42, hy + 66, 9, selected ? accent : null);
    c.add(g);
    c.add(stencilText(this, hx + 72, hy + 66, factionNames[id], 66, selected ? palette.text : palette.textMuted, { spacing: 0.06, originY: 0.5 }));
    c.add(monoText(this, hx + 36, hy + 140, factionBlurbs[id], 22, palette.text, { wrap: CARD.w - 72, lineSpacing: 6 }));
    c.add(monoText(this, hx + 36, hy + CARD.h - 60, selected ? 'SELECTED' : `PRESS ${index + 1}`, 18, selected ? accent : palette.textMuted, { spacing: 0.14 }));
    c.setSize(CARD.w, CARD.h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.choose(id));
    return c;
  }

  private startRun(): void {
    session.expedition = null;
    this.scene.start(SceneKeys.Hub);
  }

  private quickFight(): void {
    session.expedition = null;
    this.scene.start(SceneKeys.Combat);
  }

  private choose(id: FactionId): void {
    if (session.faction === id) return;
    setFaction(id);
    this.time.delayedCall(0, () => this.rebuild());
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const i = factionOrder.indexOf(session.faction);
    switch (e.key) {
      case '1':
      case '2':
      case '3':
        this.choose(factionOrder[Number(e.key) - 1]!);
        break;
      case 'ArrowLeft':
        this.choose(factionOrder[Math.max(0, i - 1)]!);
        break;
      case 'ArrowRight':
        this.choose(factionOrder[Math.min(factionOrder.length - 1, i + 1)]!);
        break;
      case 'Enter':
        if (session.faction === 'tsc') this.startRun();
        break;
      case 'f':
      case 'F':
        if (session.faction === 'tsc') this.quickFight();
        break;
      case 'Escape':
        this.scene.start(SceneKeys.MainMenu);
        break;
    }
  }
}
