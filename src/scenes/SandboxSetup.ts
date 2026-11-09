import Phaser from 'phaser';
import { setFaction, session, startCampaign } from '../core/session';
import { loadQuickstart, saveQuickstart } from '../core/saves';
import { factionBlurbs, setupText } from '../data/menu';
import { factionAccent, factionNames, factionOrder, mix, palette, type FactionId } from '../data/palette';
import { setupLimits, stepDial, topTier, type SetupDial } from '../data/sandbox';
import { Button } from '../ui/Button';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const CARD = { x: 180, y: 230, w: 480, h: 340, gap: 60 };

const DIAL = { x: CARD.x, y: 600, w: 3 * CARD.w + 2 * CARD.gap, h: 290 };

export class SandboxSetup extends ScreenScene {
  /** 0 is the faction row, 1 to 5 are the dials */
  private focus = 0;
  private note = '';

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
    root.add(bodyText(this, 90, 160, setupText.factionHeader.toUpperCase(), 18, palette.textMuted, { spacing: 0.16 }));

    factionOrder.forEach((id, i) => {
      root.add(this.factionCard(id, CARD.x + i * (CARD.w + CARD.gap), CARD.y, i));
    });

    this.buildDials(root, signal);

    const right = CARD.x + 3 * CARD.w + 2 * CARD.gap;
    const hasPreset = loadQuickstart() !== null;
    const tscOnly = session.faction === 'tsc';
    root.add(
      new Button(this, {
        x: CARD.x, y: 912, w: 300, h: 84, label: setupText.back, size: 32, state: 'live', signal, key: 'Esc',
        onClick: () => this.scene.start(SceneKeys.MainMenu)
      })
    );
    root.add(
      new Button(this, {
        x: CARD.x + 330, y: 912, w: 360, h: 84, label: setupText.quickstart, size: 32, state: hasPreset ? 'live' : 'offline', signal, key: 'Q',
        onClick: () => this.quickstart()
      })
    );
    root.add(
      new Button(this, {
        x: right - 420 - 30 - 380, y: 912, w: 380, h: 84, label: setupText.quickFight, size: 32, state: tscOnly ? 'live' : 'offline', signal, key: 'F',
        stamp: setupText.startStamp, onClick: () => this.quickFight()
      })
    );
    root.add(
      new Button(this, {
        x: right - 420, y: 912, w: 420, h: 84, label: setupText.start, size: 36, state: tscOnly ? 'live' : 'offline', accent: tscOnly, signal, key: 'Enter',
        stamp: setupText.startStamp, onClick: () => this.startRun()
      })
    );
  }

  private buildDials(root: Phaser.GameObjects.Container, signal: number): void {
    const setup = session.setup;
    const dial = makePanel(this, { ...DIAL, bolts: true, scan: true, border: this.focus > 0 ? signal : undefined, borderWidth: this.focus > 0 ? 3 : undefined });
    const head = stencilText(this, 36, 22, setupText.dialsHeader, 27, palette.textMuted, { spacing: 0.12 });
    dial.add(head);
    const reach = `Tier ${setup.startTier} to ${topTier(setup)} over ${setup.sections} section${setup.sections === 1 ? '' : 's'}`;
    dial.add(bodyText(this, 36 + head.width + 24, 30, reach.toUpperCase(), 16.5, palette.textMuted, { spacing: 0.12 }));
    const hint = this.note || (this.focus > 0 ? setupText.dials[this.focus - 1]!.hint : '');
    dial.add(bodyText(this, 36, DIAL.h - 20, hint, 16.5, palette.textMuted, { originY: 1 }));

    const bw = 300;
    const bx = DIAL.w - 36 - bw;
    dial.add(new Button(this, { x: bx, y: 14, w: bw, h: 48, label: setupText.savePreset, size: 22, state: 'live', signal, key: 'P', onClick: () => this.savePreset() }));
    dial.add(new Button(this, { x: bx - bw - 16, y: 14, w: bw, h: 48, label: setupText.loadPreset, size: 22, state: loadQuickstart() ? 'live' : 'offline', signal, key: 'L', onClick: () => this.loadPreset() }));

    const cellW = (DIAL.w - 72) / setupText.dials.length;
    setupText.dials.forEach((d, i) => {
      const x = 36 + i * cellW;
      const lit = this.focus === i + 1;
      dial.add(bodyText(this, x, 92, d.label.toUpperCase(), 17, lit ? signal : palette.textMuted, { spacing: 0.14 }));
      dial.add(bodyText(this, x + 56 + (cellW - 56 * 2 - 24) / 2 + 6, 170, String(setup[d.key]), 40, palette.text, { weight: '700', originX: 0.5, originY: 0.5 }));
      const l = setupLimits[d.key];
      const mk = (label: string, dx: number, dir: 1 | -1, on: boolean): Button =>
        new Button(this, { x: x + dx, y: 142, w: 56, h: 56, label, size: 32, state: on ? 'live' : 'offline', signal, align: 'center', onClick: () => this.turn(d.key, dir) });
      dial.add(mk('-', 0, -1, setup[d.key] > l.min));
      dial.add(mk('+', cellW - 56 - 24, 1, setup[d.key] < l.max));
    });
    root.add(dial);
  }

  private turn(dial: SetupDial, dir: 1 | -1): void {
    session.setup = stepDial(session.setup, dial, dir);
    this.focus = setupText.dials.findIndex((d) => d.key === dial) + 1;
    this.note = '';
    this.time.delayedCall(0, () => this.rebuild());
  }

  private savePreset(): void {
    this.note = saveQuickstart(session.setup) ? 'Preset saved. Quickstart loads it in one click.' : 'The browser refused the save (storage full or blocked).';
    this.time.delayedCall(0, () => this.rebuild());
  }

  private loadPreset(): void {
    const p = loadQuickstart();
    if (!p) return;
    session.setup = p;
    session.faction = p.faction;
    this.note = 'Preset loaded.';
    this.time.delayedCall(0, () => this.rebuild());
  }

  private quickstart(): void {
    const p = loadQuickstart();
    if (!p) return;
    session.setup = p;
    session.faction = p.faction;
    if (p.faction !== 'tsc') {
      this.note = 'That preset is not TSC. Only TSC is playable.';
      this.time.delayedCall(0, () => this.rebuild());
      return;
    }
    this.begin();
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
    c.add(stencilText(this, hx + 72, hy + 66, factionNames[id], 66, selected ? palette.text : palette.textMuted, { spacing: 0.06, originY: 0.5, fixed: true }));
    c.add(bodyText(this, hx + 36, hy + 140, factionBlurbs[id], 22, palette.text, { wrap: CARD.w - 72, lineSpacing: 6 }));
    c.add(bodyText(this, hx + 36, hy + CARD.h - 60, selected ? 'SELECTED' : `PRESS ${index + 1}`, 18, selected ? accent : palette.textMuted, { spacing: 0.14 }));
    c.setSize(CARD.w, CARD.h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.choose(id));
    return c;
  }

  private startRun(): void {
    if (this.modal?.isOpen || session.faction !== 'tsc') return;
    if (!session.campaign) return this.begin();
    this.modal = new Modal(this, this.root, {
      title: setupText.replaceTitle, body: setupText.replaceBody, confirmLabel: setupText.replaceConfirm, cancelLabel: setupText.replaceCancel, signal: this.signal,
      onConfirm: () => {
        this.modal = null;
        this.begin();
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private begin(): void {
    startCampaign(session.setup);
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
    const dialAt = this.focus > 0 ? setupText.dials[this.focus - 1]!.key : null;
    switch (e.key) {
      case '1':
      case '2':
      case '3':
        this.choose(factionOrder[Number(e.key) - 1]!);
        break;
      case 'ArrowDown':
        this.focus = Math.min(setupText.dials.length, this.focus + 1);
        this.time.delayedCall(0, () => this.rebuild());
        break;
      case 'ArrowUp':
        this.focus = Math.max(0, this.focus - 1);
        this.time.delayedCall(0, () => this.rebuild());
        break;
      case 'ArrowLeft':
        if (dialAt) this.turn(dialAt, -1);
        else this.choose(factionOrder[Math.max(0, i - 1)]!);
        break;
      case 'ArrowRight':
        if (dialAt) this.turn(dialAt, 1);
        else this.choose(factionOrder[Math.min(factionOrder.length - 1, i + 1)]!);
        break;
      case '-':
        if (dialAt) this.turn(dialAt, -1);
        break;
      case '+':
      case '=':
        if (dialAt) this.turn(dialAt, 1);
        break;
      case 'Enter':
        this.startRun();
        break;
      case 'q':
      case 'Q':
        this.quickstart();
        break;
      case 'p':
      case 'P':
        this.savePreset();
        break;
      case 'l':
      case 'L':
        this.loadPreset();
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
