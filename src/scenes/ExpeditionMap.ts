import Phaser from 'phaser';
import { session, startExpedition } from '../core/session';
import { forceById } from '../data/rooms';
import { mix, palette } from '../data/palette';
import {
  atCheckpoint, currentRoom, leaveGate, move, moves, retreat, takeGate, tierOf, type Expedition, type Room, type RoomType
} from '../sim/expedition';
import { Button } from '../ui/Button';
import { drawHpBar } from '../ui/combat/parts';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
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
      this.openPause();
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

    const ty = SIDE.y + SIDE.h - 112;
    const s = x.stats;
    root.add(monoText(this, px, ty, `FIGHTS ${s.fights}   ROOMS ${s.rooms}   MOVES ${s.moves}`, 16, palette.textMuted));
    root.add(monoText(this, px, ty + 28, `EAGLES ${s.eagles}   LOOT DRAWS ${s.loot}`, 16, palette.textMuted));
    root.add(monoText(this, px, ty + 56, 'LOOT AND EAGLES ARE TALLIED ONLY', 14, palette.textMuted));
  }

  private drawFoot(root: Phaser.GameObjects.Container, signal: number): void {
    const x = this.exp;
    const here = currentRoom(x);
    root.add(stencilText(this, FOOT.x + 32, FOOT.y + 22, here.entrance ? 'Section entrance' : `${roomName[here.type]} room`, 36, palette.text, { spacing: 0.05 }));
    root.add(monoText(this, FOOT.x + 34, FOOT.y + 74, this.note, 18, palette.textMuted, { wrap: 760, full: true }));
    const lines = x.log.slice(-4).reverse();
    root.add(monoText(this, FOOT.x + 900, FOOT.y + 24, 'LOG', 16, palette.textMuted, { spacing: 0.14 }));
    lines.forEach((l, i) => {
      const t = l.length > 70 ? l.slice(0, 67) + '…' : l;
      root.add(monoText(this, FOOT.x + 900, FOOT.y + 54 + i * 30, '> ' + t, 17, i === 0 ? palette.text : palette.textMuted));
    });
    root.add(
      new Button(this, {
        x: FOOT.x + FOOT.w - 360, y: FOOT.y + FOOT.h - 92, w: 330, h: 70, label: 'Retreat', size: 33, state: x.status === 'running' && !x.pending ? 'live' : 'offline',
        signal, key: 'R', onClick: () => this.openRetreat()
      })
    );
    root.add(monoText(this, FOOT.x + 34, FOOT.y + FOOT.h - 30, '1-3 OR ARROWS: MOVE   R: RETREAT   ESC: LEAVE', 14, palette.textMuted, { originY: 0.5 }));
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
