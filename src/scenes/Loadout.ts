import Phaser from 'phaser';
import { autosave, campaign } from '../core/session';
import { gearDetail } from '../core/loadout';
import { gearInfo, isSlotted } from '../data/gear';
import { palette } from '../data/palette';
import { equip, equipProblem, handsUsed, templateOf, unequip, weaponSlots, type CrewMember } from '../sim/campaign';
import type { LootItem } from '../sim/expedition';
import { Button } from '../ui/Button';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText, textContext } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const CREW = { x: 40, y: 92, w: 360, h: 960 };
const SLOTS = { x: 420, y: 92, w: 760, h: 960 };
const STASH = { x: 1200, y: 92, w: 680, h: 960 };
const CELL = { w: 316, h: 44, gap: 8 };

/** The character screen: pick a crew member, see what is in their slots, and move gear between them and the stash. */
export class Loadout extends ScreenScene {
  private who = 0;
  private note = '';
  private detail: Phaser.GameObjects.Text | null = null;
  private detailTitle: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SceneKeys.Loadout);
  }

  protected override onCreate(data?: unknown): void {
    const d = data as { who?: number } | undefined;
    this.who = Math.max(0, Math.min(d?.who ?? 0, campaign().crew.length - 1));
    this.note = '';
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  private get member(): CrewMember {
    return campaign().crew[this.who]!;
  }

  private back(): void {
    this.scene.start(SceneKeys.Hub);
  }

  private onKey(e: KeyboardEvent): void {
    const k = e.key;
    if (k === 'Escape') return this.back();
    const n = campaign().crew.length;
    if (k >= '1' && k <= '9' && Number(k) <= n) {
      this.who = Number(k) - 1;
      return this.rebuild();
    }
    if (k === 'ArrowUp' || k === 'ArrowLeft') this.who = (this.who + n - 1) % n;
    else if (k === 'ArrowDown' || k === 'ArrowRight') this.who = (this.who + 1) % n;
    else return;
    this.rebuild();
  }

  private equipFrom(i: number): void {
    const c = campaign();
    const item = c.stash[i];
    if (!item) return;
    const problem = equipProblem(c, this.member, item);
    this.note = problem ?? equip(c, this.member, i);
    if (!problem) autosave();
    this.rebuild();
  }

  private takeOff(i: number): void {
    try {
      this.note = unequip(campaign(), this.member, i);
      autosave();
    } catch (err) {
      this.note = (err as Error).message;
    }
    this.rebuild();
  }

  private show(item: LootItem | null): void {
    if (!this.detail || !this.detailTitle) return;
    if (!item) {
      this.detailTitle.setText('GEAR DETAIL');
      this.detail.setText('Hover an item to read it. Click a stash item to put it on the selected crew member.');
      return;
    }
    this.detailTitle.setText(item.name.toUpperCase());
    this.detail.setText(gearDetail(item.name, item.cls).join('\n'));
  }

  protected build(root: Phaser.GameObjects.Container): void {
    textContext.dense = true;
    try {
      this.buildAll(root);
    } finally {
      textContext.dense = false;
    }
  }

  private buildAll(root: Phaser.GameObjects.Container): void {
    const c = campaign();
    const signal = this.signal;
    const title = stencilText(this, 40, 10, 'Loadout', 44, palette.text, { spacing: 0.05, fixed: true });
    root.add(title);
    root.add(bodyText(this, 44, title.y + title.height + 2, this.note || 'Gear changes happen at the HQ, never mid-run.', 16, this.note ? signal : palette.textMuted));
    root.add(new Button(this, { x: 1664, y: 14, w: 216, h: 56, label: 'HQ', size: 28, state: 'live', signal, key: 'Esc', onClick: () => this.back() }));

    // ---- crew list
    root.add(makePanel(this, { ...CREW, bolts: true }));
    root.add(bodyText(this, CREW.x + 24, CREW.y + 22, 'CREW', 16, palette.textMuted, { spacing: 0.14 }));
    c.crew.forEach((m, i) => {
      const t = templateOf(c, m);
      const x0 = CREW.x + 20;
      const y0 = CREW.y + 56 + i * 112;
      const on = i === this.who;
      const g = this.add.graphics();
      g.fillStyle(on ? palette.panelRaised : palette.panelDeep, 1);
      g.fillRect(x0, y0, CREW.w - 40, 102);
      g.lineStyle(on ? 3 : 1.5, on ? signal : palette.line, 1);
      g.strokeRect(x0 + 1, y0 + 1, CREW.w - 42, 100);
      root.add(g);
      root.add(stencilText(this, x0 + 14, y0 + 8, m.name, 30, palette.text, { spacing: 0.04 }));
      root.add(bodyText(this, x0 + 14, y0 + 52, `HP ${t.hp} · ARMOR ${t.armor}${t.ammo ? ` · AMMO ${t.ammo}` : ''}`, 16, palette.textMuted));
      root.add(bodyText(this, x0 + 14, y0 + 74, `WEAPON SLOTS ${handsUsed(m)}/${weaponSlots(m)}`, 14, palette.textMuted, { spacing: 0.06 }));
      root.add(bodyText(this, x0 + CREW.w - 58, y0 + 10, String(i + 1), 16, palette.textMuted, { originX: 1 }));
      const hit = this.add.zone(x0 + (CREW.w - 40) / 2, y0 + 51, CREW.w - 40, 102).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        this.who = i;
        this.rebuild();
      });
      root.add(hit);
    });

    // ---- the selected member's slots
    const m = this.member;
    const t = templateOf(c, m);
    root.add(makePanel(this, { ...SLOTS, bolts: true, border: signal, borderWidth: 3 }));
    root.add(stencilText(this, SLOTS.x + 28, SLOTS.y + 14, m.name, 52, palette.text, { spacing: 0.04 }));
    const status = m.repairing ? 'ON THE BENCH' : m.damage ? m.damage.name.toUpperCase() : 'READY';
    root.add(bodyText(this, SLOTS.x + SLOTS.w - 28, SLOTS.y + 26, `TIER ${m.tier} · ${status}`, 18, m.damage ? palette.danger : palette.textMuted, { originX: 1 }));
    root.add(
      bodyText(
        this, SLOTS.x + 28, SLOTS.y + 82,
        `HP ${t.hp}   BUILT-IN SOAK ${t.builtin}   ARMOR POOL ${t.armor}${t.ammo ? `   AMMO POOL ${t.ammo}` : ''}`,
        20, palette.text, { weight: '700' }
      )
    );
    let y = SLOTS.y + 128;
    const section = (label: string, right = ''): void => {
      root.add(bodyText(this, SLOTS.x + 28, y, label, 15, palette.textMuted, { spacing: 0.16 }));
      if (right) root.add(bodyText(this, SLOTS.x + SLOTS.w - 28, y, right, 15, palette.textMuted, { originX: 1, spacing: 0.08 }));
      const r = this.add.graphics();
      r.fillStyle(signal, 1);
      r.fillRect(SLOTS.x + 28, y + 22, SLOTS.w - 56, 2);
      root.add(r);
      y += 34;
    };
    const rowH = 76;
    const row = (item: LootItem | null, index: number, emptyLabel: string): void => {
      const x0 = SLOTS.x + 28;
      const w = SLOTS.w - 56;
      const g = this.add.graphics();
      g.fillStyle(palette.panelDeep, 1);
      g.fillRect(x0, y, w, rowH);
      g.lineStyle(1.5, palette.line, 1);
      g.strokeRect(x0 + 0.75, y + 0.75, w - 1.5, rowH - 1.5);
      root.add(g);
      if (!item) {
        root.add(bodyText(this, x0 + 18, y + rowH / 2, emptyLabel, 17, palette.textMuted, { originY: 0.5, spacing: 0.1 }));
      } else {
        const info = gearInfo(item.name);
        root.add(stencilText(this, x0 + 16, y + 6, item.name, 26, palette.text, { spacing: 0.04 }));
        const first = info?.actions[0];
        const line = [
          info ? gearDetail(item.name, item.cls)[0] : item.cls,
          ...(info?.maxSoak ? [`soak +${info.maxSoak}`] : []),
          ...(info?.ammo ? [`ammo ${info.ammo}`] : []),
          ...(first ? [info!.actions.map((a) => a.name).join(', ')] : [])
        ].join(' · ');
        root.add(bodyText(this, x0 + 16, y + 44, line, 15, palette.textMuted, { wrap: w - 220 }));
        root.add(
          new Button(this, { x: x0 + w - 190, y: y + 8, w: 176, h: rowH - 16, label: 'Take off', size: 22, state: c.run ? 'offline' : 'live', signal, onClick: () => this.takeOff(index) })
        );
        const hit = this.add.zone(x0 + (w - 200) / 2, y + rowH / 2, w - 200, rowH).setInteractive();
        hit.on('pointerover', () => this.show(item));
        hit.on('pointerout', () => this.show(null));
        root.add(hit);
      }
      y += rowH + 8;
    };

    const weapons = m.equipped.map((item, i) => ({ item, i })).filter((e) => gearInfo(e.item.name)?.slot === 'weapon');
    section('WEAPON SLOTS', `${handsUsed(m)} OF ${weaponSlots(m)} USED`);
    for (const e of weapons) row(e.item, e.i, '');
    const free = weaponSlots(m) - handsUsed(m);
    if (free > 0) row(null, -1, `${free} FREE WEAPON SLOT${free > 1 ? 'S' : ''}. TWO-HANDED GUNS NEED 2, SHIELDS TAKE 1.`);
    y += 6;
    section('ARMOR');
    const armor = m.equipped.map((item, i) => ({ item, i })).find((e) => gearInfo(e.item.name)?.slot === 'armor');
    row(armor?.item ?? null, armor?.i ?? -1, 'NO ARMOR');
    y += 6;
    section('TOOL');
    const tool = m.equipped.map((item, i) => ({ item, i })).find((e) => gearInfo(e.item.name)?.slot === 'tool');
    row(tool?.item ?? null, tool?.i ?? -1, 'NO TOOL');
    y += 6;
    const fixed = m.base.gear.filter((n) => !isSlotted(n));
    section('BUILT IN');
    root.add(bodyText(this, SLOTS.x + 28, y, fixed.length ? fixed.join(' · ') : 'Nothing.', 17, palette.text, { wrap: SLOTS.w - 56 }));
    root.add(bodyText(this, SLOTS.x + 28, SLOTS.y + SLOTS.h - 34, 'ROLE GEAR AND ATTACHMENTS STAY ON THE UNIT. WITH NO WEAPON IT USES THE ARMORY STUB PISTOL.', 13, palette.textMuted));

    // ---- stash
    root.add(makePanel(this, { ...STASH, bolts: true }));
    root.add(bodyText(this, STASH.x + 24, STASH.y + 22, `STASH ${c.stash.length}/${c.cfg.stashCap}`, 16, palette.textMuted, { spacing: 0.14 }));
    root.add(bodyText(this, STASH.x + STASH.w - 24, STASH.y + 22, `CLICK TO GIVE TO ${m.name.toUpperCase()}`, 14, palette.textMuted, { originX: 1 }));
    c.stash.forEach((item, i) => {
      const col = i % 2;
      const rw = Math.floor(i / 2);
      const x0 = STASH.x + 24 + col * (CELL.w + CELL.gap + 8);
      const y0 = STASH.y + 52 + rw * (CELL.h + 6);
      const gear = !!gearInfo(item.name) && gearInfo(item.name)!.slot !== 'other';
      const problem = gear ? equipProblem(c, m, item) : 'not gear';
      const ok = gear && !problem;
      const g = this.add.graphics();
      g.fillStyle(palette.panelDeep, 1);
      g.fillRect(x0, y0, CELL.w, CELL.h);
      g.lineStyle(ok ? 2 : 1.5, ok ? signal : palette.line, 1);
      g.strokeRect(x0 + 0.75, y0 + 0.75, CELL.w - 1.5, CELL.h - 1.5);
      root.add(g);
      const nm = bodyText(this, x0 + 12, y0 + 7, item.name.toUpperCase(), 16, gear ? palette.text : palette.textMuted, { weight: '700', spacing: 0.04 });
      if (nm.width > CELL.w - 24) nm.setScale((CELL.w - 24) / nm.width);
      root.add(nm);
      root.add(bodyText(this, x0 + 12, y0 + 26, gear ? (problem ? 'NO ROOM' : item.cls.toUpperCase()) : 'SUPPLIES', 11, palette.textMuted, { spacing: 0.1 }));
      const hit = this.add.zone(x0 + CELL.w / 2, y0 + CELL.h / 2, CELL.w, CELL.h).setInteractive({ useHandCursor: ok });
      hit.on('pointerover', () => this.show(item));
      hit.on('pointerout', () => this.show(null));
      hit.on('pointerup', () => this.equipFrom(i));
      root.add(hit);
    });
    if (c.stash.length === 0) root.add(bodyText(this, STASH.x + 24, STASH.y + 60, 'The stash is empty. Buy packs at the HQ market or win loot on a run.', 16, palette.textMuted, { wrap: STASH.w - 48 }));

    // ---- detail box
    const dy = STASH.y + 52 + 12 * (CELL.h + 6) + 14;
    const dg = this.add.graphics();
    dg.fillStyle(palette.panelDeep, 1);
    dg.fillRect(STASH.x + 24, dy, STASH.w - 48, STASH.y + STASH.h - 24 - dy);
    dg.lineStyle(1.5, palette.line, 1);
    dg.strokeRect(STASH.x + 24.75, dy + 0.75, STASH.w - 49.5, STASH.y + STASH.h - 24 - dy - 1.5);
    root.add(dg);
    this.detailTitle = bodyText(this, STASH.x + 40, dy + 12, 'GEAR DETAIL', 17, signal, { weight: '700', spacing: 0.1 });
    this.detail = bodyText(this, STASH.x + 40, dy + 38, '', 15, palette.text, { wrap: STASH.w - 80, lineSpacing: 3 });
    root.add([this.detailTitle, this.detail]);
    this.show(null);
  }
}
