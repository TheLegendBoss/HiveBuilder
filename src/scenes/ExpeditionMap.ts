import Phaser from 'phaser';
import { session, startExpedition } from '../core/session';
import { forceById } from '../data/rooms';
import { mix, palette } from '../data/palette';
import {
  atCheckpoint, buyPack, canAffordGamble, canBuyPack, leaveMarket, sellItem, cashOutGamble, closeGamble, commitGamble, currentRoom, declineGamble, dropItem, leaveGate, leaveLoot,
  move, moves, pushGamble, retreat, takeGate, takeLoot, tierOf, useItem, type Expedition, type GamblePending, type Room, type RoomType
} from '../sim/expedition';
import { Button } from '../ui/Button';
import { drawHpBar } from '../ui/combat/parts';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import type { LootItem } from '../sim/expedition';
import { makePanel } from '../ui/Panel';
import { monoText, stencilText, textContext } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const MAP = { x: 40, y: 92, w: 1400, h: 740 };
const SIDE = { x: 1470, y: 92, w: 410, h: 740 };
const FOOT = { x: 40, y: 852, w: 1840, h: 200 };

const roomName: Record<RoomType, string> = {
  Fight: 'Fight', Scavenge: 'Scavenge', Gamble: 'Gamble', Hazard: 'Hazard', Market: 'Market', Rest: 'Rest', Clinic: 'Clinic', Gate: 'Gate'
};

/** The floor map: walk room to room, spend rations, and hand fights over to the combat screen. */
export class ExpeditionMap extends ScreenScene {
  private note = '';
  private starting = false;

  constructor() {
    super(SceneKeys.Expedition);
  }

  /** For tests and the console. */
  get exp(): Expedition {
    return session.expedition!;
  }

  protected override onCreate(): void {
    if (!session.expedition) startExpedition();
    this.note = this.exp.log[this.exp.log.length - 1] ?? '';
    this.starting = false;
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  // ---------- actions

  private go(room: Room): void {
    if (this.modal?.isOpen || this.exp.status !== 'running' || this.exp.pending) return;
    if (!moves(this.exp).some((r) => r.id === room.id)) return;
    const r = move(this.exp, room.id);
    this.note = r.note;
    this.rebuild();
  }

  /** Reachable rooms in a stable reading order: top to bottom, left to right. */
  private reachable(): Room[] {
    return moves(this.exp).sort((a, b) => a.y - b.y || a.x - b.x);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const x = this.exp;
    if (e.key === 'Escape') {
      if (this.exp.pending?.kind === 'market') {
        leaveMarket(this.exp);
        this.rebuild();
      } else if (this.exp.pending?.kind === 'loot') {
        leaveLoot(this.exp);
        this.rebuild();
      } else this.openPause();
      return;
    }
    if (this.exp.pending?.kind === 'market') {
      if (e.key === 'Enter') {
        leaveMarket(this.exp);
        this.rebuild();
      } else if (e.key.toLowerCase() === 'b' && canBuyPack(this.exp)) {
        buyPack(this.exp);
        this.rebuild();
      }
      return;
    }
    if (this.exp.pending?.kind === 'loot') {
      if (e.key === 'Enter') {
        leaveLoot(this.exp);
        this.rebuild();
      } else if (e.key >= '1' && e.key <= '6') this.takeOffer(Number(e.key) - 1);
      return;
    }
    if (x.status !== 'running' || x.pending) return;
    if (e.key.toLowerCase() === 'r') {
      this.openRetreat();
      return;
    }
    const list = this.reachable();
    if (e.key >= '1' && e.key <= '9') {
      const r = list[Number(e.key) - 1];
      if (r) this.go(r);
      return;
    }
    const dir: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const d = dir[e.key];
    if (d) {
      const here = currentRoom(x);
      const r = list.find((q) => q.x - here.x === d[0] && q.y - here.y === d[1]);
      if (r) this.go(r);
      e.preventDefault();
    }
  }

  private openPause(): void {
    this.modal = new Modal(this, this.root, {
      title: 'Leave the expedition?',
      body: 'This drops the whole run and returns to the sandbox setup. Nothing is saved.',
      confirmLabel: 'Abandon',
      cancelLabel: 'Keep going',
      signal: this.signal,
      onConfirm: () => {
        session.expedition = null;
        this.scene.start(SceneKeys.SandboxSetup);
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private openRetreat(): void {
    const free = atCheckpoint(this.exp);
    this.modal = new Modal(this, this.root, {
      title: 'Call a retreat?',
      body: free
        ? 'You are at the section entrance, so pulling out costs nothing. The expedition ends here.'
        : 'Pulling out from here loses ground on the floor (working rule: it only marks the run as ground lost). The expedition ends.',
      confirmLabel: 'Retreat',
      cancelLabel: 'Keep going',
      signal: this.signal,
      onConfirm: () => {
        retreat(this.exp);
        this.rebuild();
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  // ---------- building

  protected build(root: Phaser.GameObjects.Container): void {
    textContext.dense = true;
    try {
      this.buildAll(root);
    } finally {
      textContext.dense = false;
    }
  }

  private buildAll(root: Phaser.GameObjects.Container): void {
    const x = this.exp;
    const signal = this.signal;
    const title = stencilText(this, 40, 10, 'Sandbox expedition', 44, palette.text, { spacing: 0.05, fixed: true });
    root.add(title);
    root.add(
      monoText(
        this, 44, title.y + title.height + 2,
        `Section ${x.section + 1} of ${x.cfg.sections} · tier ${tierOf(x.section)} · seed ${x.cfg.seed}`, 16, palette.textMuted
      )
    );
    const lamp = this.add.graphics();
    drawLamp(lamp, 760, 38, 9, x.status === 'running' ? signal : palette.danger);
    root.add(lamp);
    root.add(
      monoText(this, 786, 38, x.status === 'running' ? (x.pending ? 'ROOM ACTIVE' : 'CHOOSE A DOOR') : x.status.toUpperCase(), 20, palette.text, { originY: 0.5, spacing: 0.1 })
    );

    root.add(makePanel(this, { ...MAP, fill: palette.panelDeep, bolts: true, border: signal, borderWidth: 3 }));
    this.drawMap(root, signal);
    root.add(makePanel(this, { ...SIDE, bolts: true }));
    this.drawSide(root);
    root.add(makePanel(this, { ...FOOT, bolts: true }));
    this.drawFoot(root, signal);
    this.showPending();
  }

  private drawMap(root: Phaser.GameObjects.Container, signal: number): void {
    const x = this.exp;
    const xs = x.rooms.map((r) => r.x);
    const ys = x.rooms.map((r) => r.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const cols = Math.max(...xs) - minX + 1;
    const rows = Math.max(...ys) - minY + 1;
    const pad = 44;
    const cell = Math.min(220, (MAP.w - pad * 2) / cols, (MAP.h - pad * 2) / rows);
    const box = Math.min(150, cell * 0.74);
    const ox = MAP.x + MAP.w / 2 - (cols * cell) / 2 + cell / 2;
    const oy = MAP.y + MAP.h / 2 - (rows * cell) / 2 + cell / 2;
    const at = (r: Room): { cx: number; cy: number } => ({ cx: ox + (r.x - minX) * cell, cy: oy + (r.y - minY) * cell });
    const here = currentRoom(x);
    const reach = this.reachable();

    const doors = this.add.graphics();
    root.add(doors);
    for (const r of x.rooms) {
      for (const n of r.links) {
        if (n < r.id) continue;
        const a = at(r);
        const b = at(x.rooms[n]!);
        const used = r.entered && x.rooms[n]!.entered;
        doors.lineStyle(used ? 6 : 4, used ? palette.bolt : palette.lineDim, 1);
        doors.lineBetween(a.cx, a.cy, b.cx, b.cy);
      }
    }

    for (const r of x.rooms) {
      const { cx, cy } = at(r);
      const isHere = r.id === here.id;
      const idx = reach.findIndex((q) => q.id === r.id);
      const canGo = idx >= 0;
      const c = this.add.container(cx, cy);
      const g = this.add.graphics();
      const danger = r.type === 'Fight' && !r.cleared && !r.entrance;
      let fill: number = r.entered ? palette.panelRaised : palette.panel;
      if (r.cleared && !r.entrance) fill = palette.panelDeep;
      g.fillStyle(fill, 1);
      g.fillRect(-box / 2, -box / 2, box, box);
      const edge = isHere ? signal : canGo ? mix(signal, palette.bg, 0.25) : danger && r.entered ? palette.danger : palette.line;
      g.lineStyle(isHere ? 5 : canGo ? 3 : 1.5, edge, 1);
      g.strokeRect(-box / 2 + 1, -box / 2 + 1, box - 2, box - 2);
      if (danger) {
        // corner notch marks a live fight room (text partner: the label)
        g.fillStyle(palette.danger, 1);
        g.fillTriangle(box / 2 - 22, -box / 2, box / 2, -box / 2, box / 2, -box / 2 + 22);
      }
      c.add(g);
      const label = r.entrance ? 'Entry' : r.type === 'Gate' ? (x.section + 1 >= x.cfg.sections ? 'Out' : 'Gate') : roomName[r.type];
      const dim = r.cleared && !r.entrance && !isHere;
      const fit = Math.max(14, Math.min(27, Math.floor((box - 14) / (label.length * 0.56))));
      c.add(stencilText(this, 0, -4, label, fit, dim ? palette.textMuted : palette.text, { originX: 0.5, originY: 0.5, spacing: 0.05 }));
      const sub = isHere ? 'SQUAD' : r.cleared && !r.entrance ? 'DONE' : r.entered ? '' : 'UNSEEN';
      if (r.entered || r.cleared || isHere) {
        if (sub) c.add(monoText(this, 0, box / 2 - 20, sub, 14, isHere ? signal : palette.textMuted, { originX: 0.5, originY: 0.5, spacing: 0.1 }));
      }
      if (canGo) {
        const k = monoText(this, -box / 2 + 8, -box / 2 + 6, String(idx + 1), 16, signal, { weight: '700' });
        c.add(k);
      }
      root.add(c);
      if (canGo) {
        const hit = this.add.rectangle(cx, cy, box, box, palette.bg, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => this.go(r));
        root.add(hit);
      }
    }
  }

  private drawSide(root: Phaser.GameObjects.Container): void {
    const x = this.exp;
    const px = SIDE.x + 28;
    root.add(monoText(this, px, SIDE.y + 24, 'SQUAD', 16, palette.textMuted, { spacing: 0.14 }));
    const bars = this.add.graphics();
    root.add(bars);
    x.cfg.squad.forEach((u, i) => {
      const y = SIDE.y + 58 + i * 74;
      const hp = x.hp[i]!;
      const low = hp <= Math.ceil(u.hp / 3);
      root.add(monoText(this, px, y, u.name.toUpperCase(), 20, palette.text));
      root.add(monoText(this, SIDE.x + SIDE.w - 28, y, `${hp}/${u.hp}${low ? ' LOW' : ''}`, 18, low ? palette.danger : palette.textMuted, { originX: 1 }));
      drawHpBar(bars, px, y + 32, SIDE.w - 56, 14, hp, u.hp);
    });

    const ry = SIDE.y + 58 + 5 * 74 + 18;
    root.add(monoText(this, px, ry, 'RATIONS', 16, palette.textMuted, { spacing: 0.14 }));
    root.add(monoText(this, SIDE.x + SIDE.w - 28, ry - 6, `${x.rations}`, 40, x.rations <= 4 ? palette.danger : palette.text, { originX: 1, weight: '700' }));
    const pips = this.add.graphics();
    root.add(pips);
    const per = 12;
    for (let i = 0; i < x.cfg.rations; i++) {
      const col = i % per;
      const row = Math.floor(i / per);
      const filled = i < x.rations;
      const sz = 20;
      const gap = 6;
      const bx = px + col * (sz + gap);
      const by = ry + 36 + row * (sz + gap);
      if (filled) {
        pips.fillStyle(x.rations <= 4 ? palette.danger : palette.text, 1);
        pips.fillRect(bx, by, sz, sz);
      } else {
        pips.lineStyle(1.5, palette.line, 1);
        pips.strokeRect(bx + 0.75, by + 0.75, sz - 1.5, sz - 1.5);
      }
    }
    root.add(monoText(this, px, ry + 36 + 2 * 26 + 6, x.rations === 0 ? 'OUT: -1 HP EACH MOVE' : 'MOVING COSTS 1. FIGHTS COST 0.', 14, x.rations === 0 ? palette.danger : palette.textMuted));

    const ey = SIDE.y + 590;
    root.add(monoText(this, px, ey + 8, 'EAGLES', 16, palette.textMuted, { spacing: 0.14 }));
    root.add(monoText(this, SIDE.x + SIDE.w - 28, ey, `${x.eagles}`, 32, palette.text, { originX: 1, weight: '700' }));
    const s = x.stats;
    root.add(monoText(this, px, ey + 48, `FIGHTS ${s.fights}  ROOMS ${s.rooms}  MOVES ${s.moves}  XP ${s.xp}`, 14, palette.textMuted));
    x.log.slice(-3).reverse().forEach((l, i) => {
      const t = l.length > 34 ? l.slice(0, 32) + '…' : l;
      root.add(monoText(this, px, ey + 76 + i * 22, '> ' + t, 14, i === 0 ? palette.text : palette.textMuted));
    });
  }

  private drawFoot(root: Phaser.GameObjects.Container, signal: number): void {
    const x = this.exp;
    const here = currentRoom(x);
    root.add(stencilText(this, FOOT.x + 32, FOOT.y + 22, here.entrance ? 'Section entrance' : `${roomName[here.type]} room`, 36, palette.text, { spacing: 0.05 }));
    root.add(monoText(this, FOOT.x + 34, FOOT.y + 74, this.note, 18, palette.textMuted, { wrap: 440, full: true }));
    root.add(monoText(this, FOOT.x + 34, FOOT.y + FOOT.h - 30, '1-3 OR ARROWS: MOVE   R: RETREAT   ESC: LEAVE', 14, palette.textMuted, { originY: 0.5 }));

    const px = FOOT.x + 540;
    root.add(monoText(this, px, FOOT.y + 20, `PACK ${x.pack.length}/${x.cfg.packSize}`, 16, palette.textMuted, { spacing: 0.14 }));
    root.add(monoText(this, px + 830, FOOT.y + 20, 'CLICK AN ITEM', 14, palette.textMuted, { originX: 1 }));
    const g = this.add.graphics();
    root.add(g);
    for (let i = 0; i < x.cfg.packSize; i++) {
      const sx = px + (i % 4) * 210;
      const sy = FOOT.y + 52 + Math.floor(i / 4) * 66;
      const item = x.pack[i];
      g.fillStyle(palette.panelDeep, 1);
      g.fillRect(sx, sy, 200, 56);
      g.lineStyle(1.5, item?.use ? signal : palette.line, 1);
      g.strokeRect(sx + 0.75, sy + 0.75, 198.5, 54.5);
      if (!item) continue;
      const size = Math.max(12, Math.min(16, Math.floor(180 / (item.name.length * 0.62))));
      root.add(monoText(this, sx + 10, sy + 8, item.name.toUpperCase(), size, palette.text));
      root.add(monoText(this, sx + 10, sy + 32, item.use ? 'USE' : item.cls.split(',')[0]!.toUpperCase(), 13, item.use ? signal : palette.textMuted));
      const hit = this.add.rectangle(sx + 100, sy + 28, 200, 56, palette.bg, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.openItem(i));
      root.add(hit);
    }
    root.add(
      new Button(this, {
        x: FOOT.x + FOOT.w - 360, y: FOOT.y + FOOT.h - 92, w: 330, h: 70, label: 'Retreat', size: 33, state: x.status === 'running' && !x.pending ? 'live' : 'offline',
        signal, key: 'R', onClick: () => this.openRetreat()
      })
    );
  }

  private openItem(i: number): void {
    const x = this.exp;
    const item = x.pack[i];
    if (!item || this.modal?.isOpen || x.status !== 'running' || (x.pending && x.pending.kind !== 'loot')) return;
    const usable = item.use !== null;
    this.modal = new Modal(this, this.root, {
      title: item.name,
      body: `${item.cls}\n${item.text}${usable ? '' : '\nGear cannot be equipped yet; it rides in the pack.'}`,
      confirmLabel: usable ? 'Use' : 'Drop it',
      cancelLabel: 'Keep it',
      signal: this.signal,
      onConfirm: () => {
        if (usable) {
          const r = useItem(x, i);
          this.note = r ?? `${item.name}: nobody needs it right now`;
        } else {
          dropItem(x, i);
          this.note = `Dropped ${item.name}`;
        }
        this.rebuild();
      },
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  // ---------- rooms that need an answer

  private showPending(): void {
    const x = this.exp;
    if (x.status !== 'running') return this.showSummary();
    const p = x.pending;
    if (!p) return;
    if (p.kind === 'fight') {
      const f = forceById(p.force);
      this.modal = new Modal(this, this.root, {
        title: 'Contact',
        body: `${f.name} ahead. ${p.step === 0 ? 'Tier 1, standard strength.' : `Tier ${p.step + 1}: each enemy has ${p.step} extra HP and every attack ${p.step} extra damage.`}\nThere is no backing out of a fight. Your crew's HP carries in as it stands.`,
        confirmLabel: 'Fight',
        signal: this.signal,
        onConfirm: () => {
          if (this.starting) return;
          this.starting = true;
          this.scene.start(SceneKeys.Combat);
        }
      });
      return;
    }
    if (p.kind === 'loot') return this.showLoot(p.offers, p.from);
    if (p.kind === 'market') return this.showMarket();
    if (p.kind === 'gamble') return this.showGamble(p);
    const last = x.section + 1 >= x.cfg.sections;
    this.modal = new Modal(this, this.root, {
      title: last ? 'Way out' : 'Gate',
      body: last
        ? 'This gate leaves the floor. Take it to finish the expedition; the squad heals fully at home.'
        : `This gate leads on to section ${x.section + 2}, tier ${tierOf(x.section + 1)}. The section behind you stays behind.`,
      confirmLabel: last ? 'Leave floor' : 'Go through',
      cancelLabel: 'Stay here',
      signal: this.signal,
      onConfirm: () => {
        takeGate(x);
        this.note = x.log[x.log.length - 1] ?? '';
        this.rebuild();
      },
      onCancel: () => {
        leaveGate(x);
        this.modal = null;
        this.rebuild();
      }
    });
  }

  private showLoot(offers: LootItem[], from: string): void {
    const x = this.exp;
    const signal = this.signal;
    const layer = this.add.container(0, 0);
    this.root.add(layer);
    const dim = this.add.rectangle(960, 540, 1920, 1080, palette.bg, 0.8).setInteractive();
    const P = { x: 300, y: 150, w: 1320, h: 790 };
    layer.add([dim, makePanel(this, { ...P, bolts: true, border: signal, borderWidth: 3 })]);
    layer.add(stencilText(this, P.x + 40, P.y + 26, `Loot: ${from}`, 48, palette.text, { spacing: 0.05 }));
    layer.add(monoText(this, P.x + 42, P.y + 96, 'TAKE WHAT YOU CAN CARRY. THE REST IS LEFT BEHIND.', 16, palette.textMuted, { spacing: 0.08 }));
    const full = x.pack.length >= x.cfg.packSize;
    layer.add(monoText(this, P.x + 42, P.y + 140, 'OFFERED', 16, palette.textMuted, { spacing: 0.14 }));
    offers.slice(0, 6).forEach((o, i) => {
      const y = P.y + 172 + i * 98;
      const row = this.add.graphics();
      row.fillStyle(palette.panelDeep, 1);
      row.fillRect(P.x + 40, y, 700, 90);
      row.lineStyle(1.5, palette.line, 1);
      row.strokeRect(P.x + 40.75, y + 0.75, 698.5, 88.5);
      layer.add(row);
      const nm = stencilText(this, P.x + 56, y + 8, o.name, 27, palette.text, { spacing: 0.04 });
      layer.add(nm);
      layer.add(monoText(this, P.x + 56 + nm.width + 14, y + 16, o.cls.toUpperCase(), 13, palette.textMuted));
      layer.add(monoText(this, P.x + 56, y + 44, o.text, 14, palette.textMuted, { wrap: 520 }));
      layer.add(
        new Button(this, {
          x: P.x + 580, y: y + 16, w: 150, h: 58, label: 'Take', size: 27, state: full ? 'offline' : 'live', signal, accent: !full,
          key: String(i + 1), onClick: () => this.takeOffer(i)
        })
      );
    });
    layer.add(monoText(this, P.x + 780, P.y + 140, `PACK ${x.pack.length}/${x.cfg.packSize}${full ? ' (FULL: DROP SOMETHING)' : ''}`, 16, full ? palette.danger : palette.textMuted, { spacing: 0.14 }));
    x.pack.forEach((it, i) => {
      const y = P.y + 172 + i * 56;
      const row = this.add.graphics();
      row.fillStyle(palette.panelDeep, 1);
      row.fillRect(P.x + 780, y, 500, 50);
      row.lineStyle(1.5, palette.line, 1);
      row.strokeRect(P.x + 780.75, y + 0.75, 498.5, 48.5);
      layer.add(row);
      layer.add(monoText(this, P.x + 796, y + 5, it.name.toUpperCase(), 16, palette.text));
      layer.add(monoText(this, P.x + 796, y + 28, it.cls.toUpperCase(), 13, palette.textMuted));
      layer.add(
        new Button(this, {
          x: P.x + 1140, y: y + 5, w: 128, h: 40, label: 'Drop', size: 21, state: 'live', signal, onClick: () => {
            dropItem(x, i);
            this.rebuild();
          }
        })
      );
    });
    layer.add(
      new Button(this, {
        x: P.x + P.w - 440, y: P.y + P.h - 96, w: 400, h: 70, label: offers.length ? 'Leave the rest' : 'Done', size: 30, state: 'live', signal, accent: true, key: 'Enter',
        onClick: () => {
          leaveLoot(x);
          this.rebuild();
        }
      })
    );
  }

  private showMarket(): void {
    const x = this.exp;
    const signal = this.signal;
    const layer = this.add.container(0, 0);
    this.root.add(layer);
    const dim = this.add.rectangle(960, 540, 1920, 1080, palette.bg, 0.8).setInteractive();
    const P = { x: 300, y: 150, w: 1320, h: 790 };
    layer.add([dim, makePanel(this, { ...P, bolts: true, border: signal, borderWidth: 3 })]);
    layer.add(stencilText(this, P.x + 40, P.y + 26, 'Market', 48, palette.text, { spacing: 0.05 }));
    layer.add(monoText(this, P.x + 42, P.y + 96, 'TRADE WITH A LOCAL STALL. PRICES ARE WORKING NUMBERS.', 16, palette.textMuted, { spacing: 0.08 }));
    layer.add(monoText(this, P.x + 42, P.y + 140, 'FOR SALE', 16, palette.textMuted, { spacing: 0.14 }));
    layer.add(monoText(this, P.x + 740, P.y + 140, `YOUR EAGLES ${x.eagles}`, 16, palette.text, { originX: 1, spacing: 0.1 }));
    const can = canBuyPack(x);
    const row = this.add.graphics();
    row.fillStyle(palette.panelDeep, 1);
    row.fillRect(P.x + 40, P.y + 172, 700, 90);
    row.lineStyle(1.5, palette.line, 1);
    row.strokeRect(P.x + 40.75, P.y + 172.75, 698.5, 88.5);
    layer.add(row);
    const nm = stencilText(this, P.x + 56, P.y + 180, 'Basic pack', 27, palette.text, { spacing: 0.04 });
    layer.add(nm);
    layer.add(monoText(this, P.x + 56 + nm.width + 14, P.y + 188, `${x.cfg.packPrice} EAGLES`, 13, palette.textMuted));
    layer.add(monoText(this, P.x + 56, P.y + 216, `${x.cfg.packDraws} loot draws. Pick what you can carry.`, 14, palette.textMuted, { wrap: 520 }));
    layer.add(
      new Button(this, {
        x: P.x + 580, y: P.y + 188, w: 150, h: 58, label: 'Buy', size: 27, state: can ? 'live' : 'offline', signal, accent: can, key: 'B',
        onClick: () => {
          if (!can) return;
          buyPack(x);
          this.rebuild();
        }
      })
    );
    layer.add(monoText(this, P.x + 780, P.y + 140, `SELL SPARES (${x.cfg.sellValue} EAGLE EACH)   PACK ${x.pack.length}/${x.cfg.packSize}`, 16, palette.textMuted, { spacing: 0.1 }));
    x.pack.forEach((it, i) => {
      const y = P.y + 172 + i * 56;
      const r = this.add.graphics();
      r.fillStyle(palette.panelDeep, 1);
      r.fillRect(P.x + 780, y, 500, 50);
      r.lineStyle(1.5, palette.line, 1);
      r.strokeRect(P.x + 780.75, y + 0.75, 498.5, 48.5);
      layer.add(r);
      layer.add(monoText(this, P.x + 796, y + 5, it.name.toUpperCase(), 16, palette.text));
      layer.add(monoText(this, P.x + 796, y + 28, it.cls.toUpperCase(), 13, palette.textMuted));
      layer.add(
        new Button(this, {
          x: P.x + 1140, y: y + 5, w: 128, h: 40, label: 'Sell', size: 21, state: 'live', signal, onClick: () => {
            sellItem(x, i);
            this.rebuild();
          }
        })
      );
    });
    layer.add(
      new Button(this, {
        x: P.x + P.w - 440, y: P.y + P.h - 96, w: 400, h: 70, label: 'Leave market', size: 30, state: 'live', signal, accent: true, key: 'Enter',
        onClick: () => {
          leaveMarket(x);
          this.rebuild();
        }
      })
    );
  }

  private takeOffer(i: number): void {
    const x = this.exp;
    if (x.pending?.kind !== 'loot' || x.pack.length >= x.cfg.packSize || !x.pending.offers[i]) return;
    takeLoot(x, i);
    this.rebuild();
  }

  private showGamble(p: GamblePending): void {
    const x = this.exp;
    const noun: Record<string, string> = { eagles: 'Eagles', loot: 'loot draws', rations: 'rations', xp: 'XP' };
    const stakeText = `${p.ladder.stake} ${noun[p.def.stake]}`;
    const prize = (n: number): string => `${n} ${noun[p.def.reward]}`;
    const [r1, r2, r3] = p.ladder.rungs;
    const ladder = `Rung 1 pays ${prize(r1)}, rung 2 ${prize(r2)}, rung 3 ${prize(r3)}.`;
    const last = p.last ? `Last card: ${p.last.card} (${p.last.band}).` : '';
    const done = (): void => this.rebuild();
    if (p.stage === 'offer') {
      const can = canAffordGamble(x, p);
      this.modal = new Modal(this, this.root, {
        title: p.def.name,
        body: `${p.def.blurb}\nStake ${stakeText}. ${ladder}\nEach push draws the top results card: 10 to king climbs a rung, 6 to 9 holds, ace to 5 busts and loses the stake and winnings.${can ? '' : '\nYou cannot cover the stake.'}`,
        confirmLabel: can ? `Stake ${stakeText}` : 'Walk away',
        cancelLabel: can ? 'Walk away' : undefined,
        signal: this.signal,
        onConfirm: () => {
          if (can) commitGamble(x);
          else declineGamble(x);
          done();
        },
        onCancel: () => {
          declineGamble(x);
          this.modal = null;
          this.rebuild();
        }
      });
    } else if (p.stage === 'live') {
      const here = p.rung === 0 ? 'Nothing won yet.' : `Rung ${p.rung} of 3, worth ${prize(p.ladder.rungs[p.rung - 1]!)}.`;
      this.modal = new Modal(this, this.root, {
        title: p.def.name,
        body: `${here} ${p.rung < 3 ? `Next: ${prize(p.ladder.rungs[p.rung]!)}.` : ''}\n${last || 'Nothing drawn yet.'}\nA high card climbs, a mid card holds, a low card busts.`,
        confirmLabel: 'Draw a card',
        cancelLabel: p.rung === 0 ? 'Walk off' : 'Cash out',
        signal: this.signal,
        onConfirm: () => {
          pushGamble(x);
          done();
        },
        onCancel: () => {
          cashOutGamble(x);
          done();
        }
      });
    } else {
      this.modal = new Modal(this, this.root, {
        title: p.def.name,
        body: `${p.outcome ?? ''}\n${last}`,
        confirmLabel: 'Done',
        signal: this.signal,
        onConfirm: () => {
          closeGamble(x);
          this.note = x.log[x.log.length - 1] ?? '';
          done();
        }
      });
    }
  }

  private showSummary(): void {
    const x = this.exp;
    const title = x.status === 'done' ? 'Floor complete' : x.status === 'wiped' ? 'Squad overwhelmed' : 'Retreated';
    const s = x.stats;
    const lines = [
      `${s.sections} of ${x.cfg.sections} sections cleared · ${s.fights} fights · ${s.rooms} rooms entered · ${s.moves} moves.`,
      `Rations left ${x.rations}. Eagles ${s.eagles}, loot draws ${s.loot} (tallied only, not paid out yet).`,
      x.status === 'wiped'
        ? 'Two lanes fell. Downed crew are left behind (nothing is lost in the sandbox).'
        : x.status === 'retreated'
          ? x.groundLost ? 'Ground lost on the floor (not wired yet).' : 'A clean pull-out from the entrance.'
          : 'The squad heals fully at home.'
    ];
    this.modal = new Modal(this, this.root, {
      title,
      body: lines.join('\n'),
      confirmLabel: 'New expedition',
      cancelLabel: 'Back to setup',
      signal: this.signal,
      onConfirm: () => {
        startExpedition(Math.floor(Math.random() * 1e9));
        this.note = '';
        this.rebuild();
      },
      onCancel: () => {
        session.expedition = null;
        this.scene.start(SceneKeys.SandboxSetup);
      }
    });
  }
}
