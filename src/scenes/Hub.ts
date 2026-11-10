import Phaser from 'phaser';
import { autosave, campaign, launchExpedition, session } from '../core/session';
import { mix, palette } from '../data/palette';
import {
  buyPack, canBuyPack, canPromote, canRepair, launchProblem, maxPurse, perkSlots, promoCost, promote, readyCrew, repair, repairCost, sellStash,
  templateOf
} from '../sim/campaign';
import { Button } from '../ui/Button';
import { drawHpBar } from '../ui/combat/parts';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText, textContext } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const CREW = { x: 40, y: 92, w: 1010, h: 566 };
const TRADE = { x: 1070, y: 92, w: 810, h: 566 };
const LOAD = { x: 40, y: 678, w: 1840, h: 374 };
const COLS = 6;
const CELL = { w: 118, h: 82, gap: 8 };

/** The gang's HQ: spend Eagles and XP on the crew, buy and sell, then pick a purse and a pack and head out. */
export class Hub extends ScreenScene {
  private note = '';
  private purse = 10;
  private pack = new Set<number>();
  private sellMode = false;
  private cursor = 0;
  private starting = false;

  constructor() {
    super(SceneKeys.Hub);
  }

  private get c() {
    return campaign();
  }

  protected override onCreate(): void {
    this.starting = false;
    this.sellMode = false;
    this.cursor = 0;
    this.note = session.debrief ? '' : 'Spend, promote, repair, then pick what to carry.';
    this.pack = new Set();
    this.purse = Math.min(10, maxPurse(this.c));
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  // ---------- actions

  private crewAction(i: number): void {
    const m = this.c.crew[i];
    if (!m) return;
    if (m.damage) {
      if (!canRepair(this.c, m)) return;
      this.note = repair(this.c, m);
    } else if (canPromote(this.c, m)) {
      promote(this.c, m);
      const t = templateOf(this.c, m);
      this.note = `${m.name} is now tier ${m.tier}: max HP ${t.hp}.`;
    } else return;
    this.fixPurse();
    this.rebuild();
  }

  private fixPurse(): void {
    this.purse = Math.min(this.purse, maxPurse(this.c));
  }

  private buy(): void {
    if (!canBuyPack(this.c)) return;
    const r = buyPack(this.c);
    this.note = `Pack opened: ${r.got.map((g) => g.name).join(', ') || 'nothing kept'}${r.sold.length ? `. ${r.sold.length} sold, the stash is full.` : '.'}`;
    this.fixPurse();
    this.rebuild();
  }

  private stashTap(i: number): void {
    const c = this.c;
    const item = c.stash[i];
    if (!item) return;
    this.cursor = i;
    if (this.sellMode) {
      sellStash(c, i);
      const next = new Set<number>();
      for (const p of this.pack) if (p !== i) next.add(p > i ? p - 1 : p);
      this.pack = next;
      this.note = `Sold ${item.name} for ${c.cfg.sellValue}.`;
      this.fixPurse();
    } else if (this.pack.has(i)) this.pack.delete(i);
    else if (this.pack.size < c.cfg.packSize) this.pack.add(i);
    else this.note = 'The pack is full. Take something out first.';
    this.rebuild();
  }

  private autoPack(): void {
    const c = this.c;
    const order = c.stash.map((it, i) => ({ it, i })).sort((a, b) => Number(b.it.use !== null) - Number(a.it.use !== null) || a.i - b.i);
    this.pack = new Set(order.slice(0, c.cfg.packSize).map((o) => o.i));
    this.note = 'Packed the useful things first.';
    this.rebuild();
  }

  private clearPack(): void {
    this.pack = new Set();
    this.rebuild();
  }

  private stepPurse(dir: number): void {
    const step = this.c.cfg.purseStep;
    this.purse = Math.max(0, Math.min(maxPurse(this.c), this.purse + dir * step));
    this.rebuild();
  }

  private loadout() {
    return { purse: this.purse, pack: [...this.pack].sort((a, b) => a - b) };
  }

  private start(): void {
    if (this.starting || this.modal?.isOpen) return;
    const problem = launchProblem(this.c, this.loadout());
    if (problem) {
      this.note = problem;
      this.rebuild();
      return;
    }
    this.starting = true;
    launchExpedition(this.loadout());
    this.scene.start(SceneKeys.Expedition);
  }

  private openLoadout(): void {
    this.scene.start(SceneKeys.Loadout);
  }

  private openHolds(): void {
    this.scene.start(SceneKeys.Footholds);
  }

  private openSaves(): void {
    this.scene.start(SceneKeys.Saves, { from: SceneKeys.Hub });
  }

  private back(): void {
    this.modal = new Modal(this, this.root, {
      title: 'Leave the HQ?',
      body: 'Back to the main menu. The campaign is autosaved, so Continue picks it up here.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      signal: this.signal,
      onConfirm: () => this.scene.start(SceneKeys.MainMenu),
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const k = e.key;
    if (k === 'Enter') return this.start();
    if (k === 'Escape') return this.back();
    if (k.toLowerCase() === 'v') return this.openSaves();
    if (k.toLowerCase() === 'h') return this.openHolds();
    if (k.toLowerCase() === 'l') return this.openLoadout();
    if (k >= '1' && k <= '9') return this.crewAction(Number(k) - 1);
    const lower = k.toLowerCase();
    if (lower === 'b') return this.buy();
    if (lower === 's') {
      this.sellMode = !this.sellMode;
      return this.rebuild();
    }
    if (lower === 'a') return this.autoPack();
    if (lower === 'c') return this.clearPack();
    if (k === '-') return this.stepPurse(-1);
    if (k === '+' || k === '=') return this.stepPurse(1);
    if (k === ' ') {
      e.preventDefault();
      return this.stashTap(this.cursor);
    }
    const n = this.c.stash.length;
    if (n === 0) return;
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS };
    const d = move[k];
    if (d !== undefined) {
      e.preventDefault();
      this.cursor = Math.max(0, Math.min(n - 1, this.cursor + d));
      this.rebuild();
    }
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
    const c = this.c;
    const signal = this.signal;
    autosave();
    this.cursor = Math.max(0, Math.min(this.cursor, Math.max(0, c.stash.length - 1)));
    const title = stencilText(this, 40, 10, 'Tenebrae HQ', 44, palette.text, { spacing: 0.05, fixed: true });
    root.add(title);
    root.add(
      bodyText(this, 44, title.y + title.height + 2, `Sandbox campaign · expedition ${c.expeditions + 1}${c.fallen.length ? ` · ${c.fallen.length} lost` : ''}`, 16, palette.textMuted)
    );
    const counter = (x: number, label: string, value: string, hot = false): void => {
      root.add(bodyText(this, x, 14, label, 14, palette.textMuted, { spacing: 0.14 }));
      root.add(bodyText(this, x, 32, value, 36, hot ? signal : palette.text, { weight: '700' }));
    };
    root.add(
      new Button(this, { x: 424, y: 14, w: 150, h: 56, label: 'Gear', size: 24, state: 'live', signal, key: 'L', onClick: () => this.openLoadout() })
    );
    root.add(
      new Button(this, { x: 582, y: 14, w: 150, h: 56, label: 'Holds', size: 24, state: 'live', signal, key: 'H', onClick: () => this.openHolds() })
    );
    root.add(
      new Button(this, { x: 740, y: 14, w: 150, h: 56, label: 'Saves', size: 24, state: 'live', signal, key: 'V', onClick: () => this.openSaves() })
    );
    root.add(
      new Button(this, { x: 898, y: 14, w: 150, h: 56, label: 'Menu', size: 24, state: 'live', signal, key: 'Esc', onClick: () => this.back() })
    );
    counter(1080, 'EAGLES', String(c.eagles), true);
    counter(1330, 'POWER', String(c.power));
    counter(1560, 'CREW FIT', `${readyCrew(c).length}/${c.crew.length}`);
    counter(1770, 'RUNS', String(c.expeditions));

    root.add(makePanel(this, { ...CREW, bolts: true }));
    this.drawCrew(root, signal);
    root.add(makePanel(this, { ...TRADE, bolts: true }));
    this.drawTrade(root, signal);
    root.add(makePanel(this, { ...LOAD, bolts: true, border: signal, borderWidth: 3 }));
    this.drawLoad(root, signal);

    if (session.debrief) this.showDebrief();
  }

  private drawCrew(root: Phaser.GameObjects.Container, signal: number): void {
    const c = this.c;
    root.add(bodyText(this, CREW.x + 28, CREW.y + 22, 'CREW', 16, palette.textMuted, { spacing: 0.14 }));
    root.add(bodyText(this, CREW.x + CREW.w - 28, CREW.y + 22, '1-5: PROMOTE OR REPAIR', 14, palette.textMuted, { originX: 1 }));
    const bars = this.add.graphics();
    c.crew.forEach((m, i) => {
      const x0 = CREW.x + 24;
      const y0 = CREW.y + 56 + i * 96;
      const t = templateOf(c, m);
      const hurt = m.damage !== null;
      const row = this.add.graphics();
      row.fillStyle(palette.panelDeep, 1);
      row.fillRect(x0, y0, CREW.w - 48, 88);
      row.lineStyle(1.5, hurt ? palette.danger : palette.line, 1);
      row.strokeRect(x0 + 0.75, y0 + 0.75, CREW.w - 49.5, 86.5);
      root.add(row);
      root.add(stencilText(this, x0 + 16, y0 + 8, m.name, 30, palette.text, { spacing: 0.04 }));
      root.add(bodyText(this, x0 + 16, y0 + 54, `TIER ${m.tier} · PERK SLOTS ${perkSlots(m)}`, 14, palette.textMuted));
      root.add(bodyText(this, x0 + 250, y0 + 12, `HP ${t.hp}`, 22, palette.text, { weight: '700' }));
      root.add(bodyText(this, x0 + 250, y0 + 54, `SOAK ${t.builtin} · ARM ${t.armor}`, 14, palette.textMuted));

      const cost = promoCost(c, m);
      root.add(bodyText(this, x0 + 440, y0 + 10, cost === null ? 'XP MAX TIER' : `XP ${m.xp}/${cost}`, 14, palette.textMuted));
      if (cost !== null) drawHpBar(bars, x0 + 440, y0 + 34, 200, 12, Math.min(m.xp, cost), cost, palette.text, palette.bloodDry);
      const fx = m.nextFight?.stunned ? ' · STUNNED NEXT FIGHT' : m.nextFight?.suppressed ? ' · SUPPRESSED NEXT FIGHT' : '';
      const status = m.repairing ? 'ON THE BENCH' : hurt ? m.damage!.name.toUpperCase() : `READY${fx}`;
      const statusText = bodyText(this, x0 + 440, y0 + 54, status, 14, m.repairing ? palette.bone : hurt ? palette.danger : signal, { weight: '700' });
      root.add(statusText);

      let label = 'Max tier';
      let live = false;
      if (m.repairing) label = 'Benched';
      else if (hurt) {
        label = `Repair ${repairCost(c, m)}`;
        live = canRepair(c, m);
      } else if (cost !== null) {
        label = `Promote ${cost}`;
        live = canPromote(c, m);
      }
      root.add(
        new Button(this, {
          x: x0 + 660, y: y0 + 12, w: 276, h: 64, label, size: 26, state: live ? 'live' : 'offline', accent: live, signal,
          key: String(i + 1), onClick: () => this.crewAction(i)
        })
      );
    });
    root.add(bars);
    if (c.crew.length < 5) {
      const gone = 5 - c.crew.length;
      root.add(bodyText(this, CREW.x + 28, CREW.y + 56 + c.crew.length * 96 + 10, `${gone} station${gone === 1 ? '' : 's'} empty: recruiting arrives in a later build.`, 15, palette.textMuted));
    }
    root.add(
      bodyText(this, CREW.x + 28, CREW.y + CREW.h - 30, 'DAMAGED CREW SIT OUT. MINOR REPAIR: INSTANT. MAJOR: PAID NOW, BACK AFTER THE NEXT RUN.', 13, palette.textMuted)
    );
  }

  private drawTrade(root: Phaser.GameObjects.Container, signal: number): void {
    const c = this.c;
    root.add(bodyText(this, TRADE.x + 28, TRADE.y + 22, 'MARKET AND STASH', 16, palette.textMuted, { spacing: 0.14 }));
    const buyOk = canBuyPack(c);
    root.add(
      new Button(this, {
        x: TRADE.x + 28, y: TRADE.y + 50, w: 470, h: 66, label: `Buy pack ${c.cfg.packPrice}`, size: 28, state: buyOk ? 'live' : 'offline',
        accent: buyOk, signal, key: 'B', onClick: () => this.buy()
      })
    );
    root.add(
      new Button(this, {
        x: TRADE.x + 518, y: TRADE.y + 50, w: 264, h: 66, label: this.sellMode ? 'Selling' : 'Sell mode', size: 26, state: 'live',
        accent: this.sellMode, signal: this.sellMode ? palette.danger : signal, key: 'S',
        onClick: () => {
          this.sellMode = !this.sellMode;
          this.rebuild();
        }
      })
    );
    root.add(
      bodyText(this, TRADE.x + 28, TRADE.y + 128, this.note, 14, palette.text, { wrap: TRADE.w - 56 })
    );
    root.add(
      bodyText(this, TRADE.x + 28, TRADE.y + 158, `STASH ${c.stash.length}/${c.cfg.stashCap}`, 14, palette.textMuted, { spacing: 0.12 })
    );
    root.add(
      bodyText(
        this, TRADE.x + TRADE.w - 28, TRADE.y + 158,
        this.sellMode ? `CLICK TO SELL FOR ${c.cfg.sellValue}` : 'CLICK TO PACK  ARROWS + SPACE', 14, this.sellMode ? palette.danger : palette.textMuted, { originX: 1 }
      )
    );
    const g = this.add.graphics();
    root.add(g);
    const slots = c.cfg.stashCap;
    for (let i = 0; i < slots; i++) {
      const cx = TRADE.x + 28 + (i % COLS) * (CELL.w + CELL.gap);
      const cy = TRADE.y + 184 + Math.floor(i / COLS) * (CELL.h + CELL.gap);
      const item = c.stash[i];
      const inPack = this.pack.has(i);
      g.fillStyle(inPack ? mix(signal, palette.bg, 0.88) : palette.panelDeep, 1);
      g.fillRect(cx, cy, CELL.w, CELL.h);
      const cur = i === this.cursor && item;
      g.lineStyle(inPack || cur ? 3 : 1.5, inPack ? signal : cur ? palette.bone : palette.line, 1);
      g.strokeRect(cx + 0.75, cy + 0.75, CELL.w - 1.5, CELL.h - 1.5);
      if (!item) continue;
      root.add(bodyText(this, cx + 8, cy + 8, item.name.toUpperCase(), 12, palette.text, { wrap: CELL.w - 14 }));
      const tag = inPack ? 'IN PACK' : item.use ? 'USE' : item.cls.split(',')[0]!.toUpperCase();
      root.add(bodyText(this, cx + 8, cy + CELL.h - 22, tag, 12, inPack ? signal : item.use ? signal : palette.textMuted));
      const hit = this.add.rectangle(cx + CELL.w / 2, cy + CELL.h / 2, CELL.w, CELL.h, palette.bg, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.stashTap(i));
      root.add(hit);
    }
  }

  private drawLoad(root: Phaser.GameObjects.Container, signal: number): void {
    const c = this.c;
    const px = LOAD.x + 32;
    root.add(bodyText(this, px, LOAD.y + 22, `PACK ${this.pack.size}/${c.cfg.packSize}`, 16, palette.textMuted, { spacing: 0.14 }));
    const g = this.add.graphics();
    root.add(g);
    const picked = [...this.pack].sort((a, b) => a - b).map((i) => c.stash[i]!);
    for (let i = 0; i < c.cfg.packSize; i++) {
      const sx = px + (i % 4) * 210;
      const sy = LOAD.y + 56 + Math.floor(i / 4) * 66;
      const item = picked[i];
      g.fillStyle(palette.panelDeep, 1);
      g.fillRect(sx, sy, 200, 56);
      g.lineStyle(1.5, item?.use ? signal : palette.line, 1);
      g.strokeRect(sx + 0.75, sy + 0.75, 198.5, 54.5);
      if (!item) continue;
      const size = Math.max(12, Math.min(16, Math.floor(180 / (item.name.length * 0.62))));
      root.add(bodyText(this, sx + 10, sy + 8, item.name.toUpperCase(), size, palette.text));
      root.add(bodyText(this, sx + 10, sy + 32, item.use ? 'USE' : item.cls.split(',')[0]!.toUpperCase(), 13, item.use ? signal : palette.textMuted));
    }
    root.add(
      new Button(this, {
        x: px, y: LOAD.y + 204, w: 250, h: 60, label: 'Auto pack', size: 26, state: c.stash.length ? 'live' : 'offline', signal, key: 'A', onClick: () => this.autoPack()
      })
    );
    root.add(
      new Button(this, {
        x: px + 270, y: LOAD.y + 204, w: 250, h: 60, label: 'Clear', size: 26, state: this.pack.size ? 'live' : 'offline', signal, key: 'C', onClick: () => this.clearPack()
      })
    );
    root.add(
      bodyText(this, px, LOAD.y + 288, 'THE PACK HOLDS WHAT YOU CARRY. ANYTHING IN IT IS LOST IF THE SQUAD IS WIPED.', 14, palette.textMuted, { wrap: 820 })
    );

    const qx = LOAD.x + 960;
    root.add(bodyText(this, qx, LOAD.y + 22, 'PURSE', 16, palette.textMuted, { spacing: 0.14 }));
    root.add(bodyText(this, qx, LOAD.y + 52, `${this.purse}`, 64, palette.text, { weight: '700' }));
    root.add(bodyText(this, qx + 130, LOAD.y + 92, `OF ${c.eagles} EAGLES`, 16, palette.textMuted));
    root.add(
      new Button(this, {
        x: qx, y: LOAD.y + 150, w: 150, h: 60, label: `-${c.cfg.purseStep}`, size: 28, state: this.purse > 0 ? 'live' : 'offline', signal, key: '-', onClick: () => this.stepPurse(-1)
      })
    );
    root.add(
      new Button(this, {
        x: qx + 170, y: LOAD.y + 150, w: 150, h: 60, label: `+${c.cfg.purseStep}`, size: 28, state: this.purse < maxPurse(c) ? 'live' : 'offline', signal, key: '+', onClick: () => this.stepPurse(1)
      })
    );
    root.add(
      bodyText(this, qx, LOAD.y + 232, 'EAGLES CARRIED ONTO THE FLOOR, FOR MARKETS AND GAMBLES. A WIPE LOSES THEM; EVERYTHING ELSE STAYS HOME.', 14, palette.textMuted, { wrap: 340 })
    );

    const rx = LOAD.x + 1380;
    const fit = readyCrew(c).length;
    const problem = launchProblem(c, this.loadout());
    root.add(
      new Button(this, {
        x: rx, y: LOAD.y + 26, w: 424, h: 100, label: 'Start expedition', size: 27, state: problem ? 'offline' : 'live', accent: !problem, signal, key: 'Enter',
        onClick: () => this.start()
      })
    );
    const lamp = this.add.graphics();
    drawLamp(lamp, rx + 10, LOAD.y + 160, 8, problem ? palette.danger : signal);
    root.add(lamp);
    root.add(
      bodyText(this, rx + 32, LOAD.y + 160, problem ?? `${fit} CREW GO · RATIONS 24 · SECTIONS 3`, 15, problem ? palette.danger : palette.text, { originY: 0.5, wrap: 390 })
    );
    root.add(
      new Button(this, {
        x: rx, y: LOAD.y + LOAD.h - 94, w: 424, h: 64, label: 'Main menu', size: 28, state: 'live', signal, key: 'Esc', onClick: () => this.back()
      })
    );
  }

  private showDebrief(): void {
    const d = session.debrief!;
    const wiped = d.status === 'wiped';
    this.modal = new Modal(this, this.root, {
      title: wiped ? 'Squad lost' : d.status === 'done' ? 'Floor cleared' : 'Back at the HQ',
      body: d.lines.join('\n'),
      confirmLabel: 'Continue',
      signal: this.signal,
      onConfirm: () => {
        session.debrief = null;
        this.modal = null;
        this.note = 'Spend, promote, repair, then pick what to carry.';
        this.rebuild();
      }
    });
  }
}
