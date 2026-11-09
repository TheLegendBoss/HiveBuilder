import Phaser from 'phaser';
import { loadFromSlot, saveToSlot, session } from '../core/session';
import { deleteSlot, slotIds, slotInfo, type SlotId, type SlotInfo } from '../core/saves';
import { savesText } from '../data/menu';
import { palette } from '../data/palette';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText } from '../ui/text';
import { SceneKeys, type SceneKey } from './keys';
import { resumeKey } from './resume';
import { ScreenScene } from './ScreenScene';

const ROW = { x: 180, y: 190, w: 1560, h: 150, step: 170 };

const stamp = (t: number): string => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

/** Autosave plus three manual slots. Opened from the main menu, the HQ and the expedition map. */
export class Saves extends ScreenScene {
  private from: SceneKey = SceneKeys.MainMenu;
  private focus = 0;
  private infos: SlotInfo[] = [];
  private note = '';

  constructor() {
    super(SceneKeys.Saves);
  }

  init(data: { from?: SceneKey }): void {
    this.from = data?.from ?? SceneKeys.MainMenu;
    this.focus = 0;
    this.note = '';
  }

  private get canSave(): boolean {
    return session.campaign !== null;
  }

  protected override onCreate(): void {
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  protected build(root: Phaser.GameObjects.Container): void {
    const signal = this.signal;
    this.infos = slotIds.map((s) => slotInfo(s));
    root.add(stencilText(this, 84, 36, savesText.title, 90, palette.text, { spacing: 0.06, fixed: true }));
    root.add(
      bodyText(this, 90, 150, (this.note || (this.canSave ? savesText.hintLoad : savesText.hintNoCampaign)).toUpperCase(), 16.5, palette.textMuted, { spacing: 0.12 })
    );

    this.infos.forEach((info, i) => this.drawRow(root, info, i, signal));

    root.add(
      new Button(this, {
        x: ROW.x, y: 912, w: 330, h: 84, label: savesText.back, size: 36, state: 'live', signal, key: 'Esc', onClick: () => this.leave()
      })
    );
  }

  private drawRow(root: Phaser.GameObjects.Container, info: SlotInfo, i: number, signal: number): void {
    const y = ROW.y + i * ROW.step;
    const focused = this.focus === i;
    root.add(makePanel(this, { x: ROW.x, y, w: ROW.w, h: ROW.h, bolts: true, border: focused ? signal : undefined, borderWidth: focused ? 3 : undefined }));
    const label = info.slot === 'auto' ? savesText.autosave : savesText.slot(info.slot);
    const hit = this.add.rectangle(ROW.x, y, 880, ROW.h, palette.bg, 0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => this.setFocus(i));
    hit.on('pointerup', () => this.loadSlot(info.slot));
    root.add(hit);
    root.add(stencilText(this, ROW.x + 36, y + 22, label, 42, info.empty ? palette.textMuted : palette.text, { spacing: 0.06 }));
    const line = info.empty ? savesText.empty : info.broken ? savesText.broken : info.summary ?? '';
    root.add(bodyText(this, ROW.x + 36, y + 94, line, 24, info.empty || info.broken ? palette.textMuted : palette.text, { wrap: 840 }));
    if (info.savedAt) root.add(bodyText(this, ROW.x + 440, y + 34, stamp(info.savedAt), 18, palette.textMuted, { spacing: 0.08 }));

    const live = !info.empty && !info.broken;
    let bx = ROW.x + ROW.w - 36;
    const add = (lbl: string, key: string | undefined, state: 'live' | 'offline', onClick: () => void, w = 240): void => {
      bx -= w;
      root.add(new Button(this, { x: bx, y: y + 36, w, h: 78, label: lbl, size: 30, state, signal, key, onClick }));
      bx -= 20;
    };
    add('Delete', 'D', info.empty ? 'offline' : 'live', () => this.remove(info.slot));
    if (info.slot !== 'auto') add('Save', 'S', this.canSave ? 'live' : 'offline', () => this.save(info));
    add('Load', 'Enter', live ? 'live' : 'offline', () => this.loadSlot(info.slot), 270);
  }

  private setFocus(i: number): void {
    if (i === this.focus) return;
    this.focus = i;
    this.time.delayedCall(0, () => this.rebuild());
  }

  private loadSlot(slot: SlotId): void {
    if (this.modal?.isOpen) return;
    if (!loadFromSlot(slot)) {
      this.note = 'That slot cannot be loaded.';
      this.rebuild();
      return;
    }
    this.scene.start(resumeKey());
  }

  private save(info: SlotInfo): void {
    if (this.modal?.isOpen || info.slot === 'auto' || !this.canSave) return;
    const doSave = (): void => {
      this.note = saveToSlot(info.slot) ? `Saved to ${savesText.slot(info.slot)}.` : 'The browser refused the save (storage full or blocked).';
      this.modal = null;
      this.rebuild();
    };
    if (info.empty) return doSave();
    this.modal = new Modal(this, this.root, {
      title: savesText.overwriteTitle, body: savesText.overwriteBody, confirmLabel: 'Overwrite', cancelLabel: 'Cancel', signal: this.signal,
      onConfirm: doSave,
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private remove(slot: SlotId): void {
    if (this.modal?.isOpen || slotInfo(slot).empty) return;
    this.modal = new Modal(this, this.root, {
      title: savesText.deleteTitle, body: savesText.deleteBody, confirmLabel: 'Delete', cancelLabel: 'Keep', signal: this.signal,
      onConfirm: () => {
        deleteSlot(slot);
        this.note = 'Deleted.';
        this.modal = null;
        this.rebuild();
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private leave(): void {
    this.scene.start(this.from);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const slot = slotIds[this.focus]!;
    switch (e.key) {
      case 'Escape':
        return this.leave();
      case 'ArrowDown':
        return this.setFocus(Math.min(slotIds.length - 1, this.focus + 1));
      case 'ArrowUp':
        return this.setFocus(Math.max(0, this.focus - 1));
      case 'Enter':
        return this.loadSlot(slot);
      case 's':
      case 'S':
        return this.save(this.infos[this.focus]!);
      case 'd':
      case 'D':
        return this.remove(slot);
    }
  }
}
