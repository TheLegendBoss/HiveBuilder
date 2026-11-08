import Phaser from 'phaser';
import { candidates, nextStep, pickActor, pickLane, pickTarget, pickVariant, unplayableReason, type Sel, type Step } from '../core/selection';
import { cardDefs } from '../data/cards';
import { mix, palette, toCss } from '../data/palette';
import { tscVsScavvers } from '../data/scenarios';
import { fuelAvailable, listActions, perform, suggestBurn } from '../sim/actions';
import { needsActor } from '../sim/cards';
import { chooseAction } from '../sim/autoplay';
import { enemyAct, enemyPlan } from '../sim/enemy';
import { createGame, inLane, inSetup, isLive, unitById } from '../sim/state';
import { beginTurn } from '../sim/turn';
import type { Action, Ev, Game, Target, Unit } from '../sim/types';
import { Button } from '../ui/Button';
import { drawCable } from '../ui/Cable';
import { makeCard, makeIntentBadge, makePile, makePlate, drawHpBar, CARD_H, CARD_W, type PlateMark } from '../ui/combat/parts';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import { drawHazardStrip, makePanel } from '../ui/Panel';
import { monoText, stencilText, textContext } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

// Layout at the 1920 by 1080 reference.
const LANE_X = [40, 520, 1000];
const LANE_W = 440;
const LANE_TOP = 92;
const ENEMY_ZONE_Y = LANE_TOP + 50;
const FRONT_Y = LANE_TOP + 296;
const PLAYER_ZONE_Y = LANE_TOP + 362;
const PLATE_H = 96;
const PANEL = { x: 1470, y: 92, w: 410, h: 568 };
const LOG_Y = 668;
const TRAY = { x: 40, y: 708, w: 1840, h: 364 };
const CARD_TOP = 772;
const HAND_X0 = 190;
const HAND_W = 1500;

type Opt =
  | { k: 'actor'; id: number }
  | { k: 'target'; t: Target }
  | { k: 'lane'; lane: number }
  | { k: 'variant'; v: string };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const band = (v: number): string => (v <= 5 ? 'LOW' : v <= 9 ? 'MID' : 'HIGH');

export class Combat extends ScreenScene {
  private sim!: Game;
  private seed = 1;
  private sel: Sel | null = null;
  private actions: Action[] = [];
  private step: Step | null = null;
  private focusIdx = 0;
  private burnMode = false;
  private burn: number[] | null = null;
  private cycleSet: number[] = [];
  private viewUnit: number | null = null;
  private busy = false;
  private outcomeOpen = false;
  private showLog = false;
  private logLine = '';
  private logHistory: string[] = [];
  private fxQueue: Ev[] = [];
  private pos = new Map<number, Box>();
  private laneBars = new Map<string, Box>();
  private cardBox = new Map<number, Box>();
  private tip: Phaser.GameObjects.Container | null = null;
  private gearBtn: Box | null = null;

  constructor() {
    super(SceneKeys.Combat);
  }

  init(data: { seed?: number }): void {
    // ?seed=N in the address replays a fight exactly (handy for testing).
    const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
    this.seed = data?.seed ?? (Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 1e9));
  }

  /** For tests and the console. */
  get fight(): Game {
    return this.sim;
  }

  protected override onCreate(): void {
    this.sim = createGame(tscVsScavvers, this.seed);
    this.sel = null;
    this.burnMode = false;
    this.burn = null;
    this.cycleSet = [];
    this.viewUnit = null;
    this.busy = false;
    this.outcomeOpen = false;
    this.showLog = false;
    this.logHistory = [];
    this.logLine = 'Fight started. Deploy a squad member into each lane.';
    this.pos.clear();
    this.fxQueue = [];
    this.absorb(beginTurn(this.sim));
    this.derive();
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  // ---------- state

  private derive(): void {
    this.actions = listActions(this.sim);
    this.step = this.sel ? nextStep(this.actions, this.sel) : null;
    if (this.sel && this.step?.step === 'none') this.clearSel();
  }

  private clearSel(): void {
    this.sel = null;
    this.step = null;
    this.focusIdx = 0;
    this.burnMode = false;
    this.burn = null;
    this.cycleSet = [];
  }

  private options(): Opt[] {
    const s = this.step;
    if (!s) return [];
    switch (s.step) {
      case 'actor':
        return s.actors.map((id) => ({ k: 'actor', id }));
      case 'target':
        return s.targets.map((t) => ({ k: 'target', t }));
      case 'lane':
        return s.lanes.map((lane) => ({ k: 'lane', lane }));
      case 'variant':
        return s.variants.map((v) => ({ k: 'variant', v }));
      case 'ready':
        return s.moreTargets.map((t) => ({ k: 'target', t }));
      default:
        return [];
    }
  }

  private refresh(): void {
    this.derive();
    this.rebuild();
  }

  private absorb(ev: Ev[]): void {
    const lines: string[] = [];
    for (const e of ev) if (e.t === 'log') lines.push(e.text);
    if (lines.length) {
      this.logLine = lines.join(' · ');
      this.logHistory.push(...lines);
      if (this.logHistory.length > 60) this.logHistory.splice(0, this.logHistory.length - 60);
    }
    this.fxQueue.push(...ev);
  }

  private pickOption(o: Opt): void {
    if (!this.sel || this.busy) return;
    if (o.k === 'actor') this.sel = pickActor(this.sel, o.id);
    else if (o.k === 'target') this.sel = pickTarget(this.sel, o.t);
    else if (o.k === 'lane') this.sel = pickLane(this.sel, o.lane);
    else this.sel = pickVariant(this.sel, o.v);
    this.focusIdx = 0;
    this.burn = null;
    this.refresh();
  }

  private select(item: Sel['item']): void {
    if (this.busy || this.sim.result) return;
    this.clearSel();
    this.sel = { item, targets: [] };
    this.refresh();
  }

  private selectCard(i: number): void {
    const c = this.sim.hand[i];
    if (!c) return;
    if (this.burnMode || this.sel?.item.kind === 'cycle') {
      this.toggleSet(c.iid);
      return;
    }
    if (this.sel?.item.kind === 'card' && this.sel.item.name === c.name) {
      this.clearSel();
      this.refresh();
      return;
    }
    if (!this.actions.some((a) => a.kind === 'play' && a.card === c.name)) {
      this.logLine = `${c.name}: ${this.reasonFor(c.name, c.iid)}. It can still be burned for fuel.`;
      this.rebuild();
      return;
    }
    this.select({ kind: 'card', name: c.name });
  }

  private toggleSet(iid: number): void {
    const playedIid = this.readyAction()?.cardIid;
    if (iid === playedIid) return;
    if (this.sel?.item.kind === 'cycle') {
      const at = this.cycleSet.indexOf(iid);
      if (at >= 0) this.cycleSet.splice(at, 1);
      else if (this.cycleSet.length < this.sim.scenario.cycleLimit) this.cycleSet.push(iid);
    } else {
      const cur = this.currentBurn();
      const at = cur.indexOf(iid);
      this.burn = at >= 0 ? cur.filter((x) => x !== iid) : [...cur, iid];
    }
    this.rebuild();
  }

  private readyAction(): Action | null {
    return this.step?.step === 'ready' ? this.step.action : null;
  }

  private currentBurn(): number[] {
    const a = this.readyAction();
    if (!a || a.fuel <= 0) return [];
    return this.burn ?? suggestBurn(this.sim, a, this.actions);
  }

  private burnValue(ids: number[]): number {
    return ids.reduce((s, id) => {
      const c = this.sim.hand.find((x) => x.iid === id);
      return s + (c ? (cardDefs[c.name]?.fuelValue ?? 1) : 0);
    }, 0);
  }

  private confirm(): void {
    if (this.busy || this.sim.result || !this.sel) return;
    const a = this.readyAction();
    if (!a) return;
    let cards: number[] | undefined;
    if (a.kind === 'cycle') {
      if (this.cycleSet.length < 1) {
        this.logLine = 'Pick 1 or 2 cards to discard (click them or press 1 to 7), then confirm.';
        this.rebuild();
        return;
      }
      cards = this.cycleSet;
    } else if (a.fuel > 0) {
      cards = this.currentBurn();
      if (this.burnValue(cards) < a.fuel) {
        this.logLine = `Need ${a.fuel} fuel: burn more cards.`;
        this.rebuild();
        return;
      }
    }
    this.perform(a, cards);
  }

  private perform(a: Action, cards?: number[]): void {
    let ev: Ev[];
    try {
      ev = perform(this.sim, a, cards);
    } catch (e) {
      this.logLine = (e as Error).message;
      this.rebuild();
      return;
    }
    if (a.actor !== undefined) this.viewUnit = a.actor;
    this.clearSel();
    this.absorb(ev);
    this.busy = true;
    this.derive();
    this.rebuild();
    if (this.sim.result) this.time.delayedCall(this.anim(900), () => this.openOutcome());
    else this.time.delayedCall(this.anim(750), () => this.enemyTurn());
  }

  private enemyTurn(): void {
    this.absorb(enemyAct(this.sim));
    this.derive();
    this.rebuild();
    if (this.sim.result) {
      this.time.delayedCall(this.anim(900), () => this.openOutcome());
      return;
    }
    this.time.delayedCall(this.anim(550), () => {
      this.absorb(beginTurn(this.sim));
      this.busy = false;
      this.derive();
      this.rebuild();
    });
  }

  private openOutcome(): void {
    this.outcomeOpen = true;
    this.rebuild();
  }

  private reasonFor(name: string, iid: number): string {
    const def = cardDefs[name]!;
    const carriers = this.sim.units.filter((u) => u.side === 'P' && u.lane !== null && isLive(u) && !u.stunned && u.gear.includes(def.source));
    return unplayableReason({
      cardName: name,
      needsActor: needsActor(name),
      source: def.source,
      hasReadyCarrier: carriers.length > 0,
      carrierHasAmmo: def.ammoCost === 0 || carriers.some((u) => u.ammo >= def.ammoCost),
      fuelOk: fuelAvailable(this.sim, iid) >= def.playFuel,
      setup: inSetup(this.sim)
    });
  }

  // ---------- keyboard

  private onKey(e: KeyboardEvent): void {
    if (this.modal?.isOpen) return;
    const key = e.key;
    if (this.showLog && (key === 'Escape' || key.toLowerCase() === 'l')) {
      this.showLog = false;
      this.rebuild();
      return;
    }
    if (key.toLowerCase() === 'l') {
      this.showLog = !this.showLog;
      this.rebuild();
      return;
    }
    if (key === 'Escape') {
      if (this.burnMode) {
        this.burnMode = false;
        this.rebuild();
      } else if (this.sel) {
        this.clearSel();
        this.refresh();
      } else this.openPause();
      return;
    }
    if (this.busy || this.sim.result) return;
    if (key === 'F8') {
      // Dev aid: let the stand-in player take this action.
      const c = chooseAction(this.sim);
      if (c) {
        this.clearSel();
        this.derive();
        this.sel = null;
        this.perform(c.action, c.cards);
      }
      return;
    }
    const opts = this.options();
    if (key === 'Tab' || key === 'ArrowRight' || key === 'ArrowLeft') {
      e.preventDefault();
      if (!opts.length) return;
      const back = key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey);
      this.focusIdx = (this.focusIdx + (back ? -1 : 1) + opts.length) % opts.length;
      this.rebuild();
      return;
    }
    if (key === 'Enter') {
      e.preventDefault();
      if (this.step?.step === 'ready' && !(opts.length && this.focusIdx > 0)) this.confirm();
      else if (opts.length) this.pickOption(opts[Math.min(this.focusIdx, opts.length - 1)]!);
      return;
    }
    if (key === 'e' || key === 'E' || key === ' ') {
      e.preventDefault();
      if (this.sel?.item.kind === 'cycle') this.confirm();
      else this.select({ kind: 'cycle' });
      return;
    }
    if (key.toLowerCase() === 'b') {
      if (this.step?.step === 'ready' && this.step.action.fuel > 0) {
        this.burnMode = !this.burnMode;
        this.rebuild();
      }
      return;
    }
    if (key.toLowerCase() === 'g') {
      const gear = [...new Set(this.actions.filter((a) => a.kind === 'basic').map((a) => a.label))];
      if (!gear.length) return;
      const cur = this.sel?.item.kind === 'gear' ? gear.indexOf(this.sel.item.label) : -1;
      this.select({ kind: 'gear', label: gear[(cur + 1) % gear.length]! });
      return;
    }
    if (key.toLowerCase() === 'r') {
      const reserve = this.reserve();
      if (!reserve.length) return;
      const cur = this.sel?.item.kind === 'deploy' ? reserve.findIndex((u) => u.id === (this.sel!.item as { unit: number }).unit) : -1;
      this.select({ kind: 'deploy', unit: reserve[(cur + 1) % reserve.length]!.id });
      return;
    }
    if (/^[1-9]$/.test(key)) {
      const n = Number(key) - 1;
      if (this.step?.step === 'lane') {
        if (n < 3) this.pickOption({ k: 'lane', lane: n });
        return;
      }
      this.selectCard(n);
    }
  }

  private openPause(): void {
    this.modal = new Modal(this, this.root, {
      title: 'Leave the fight?',
      body: 'Abandoning the fight returns you to the sandbox setup. Nothing is saved.',
      confirmLabel: 'Abandon',
      cancelLabel: 'Keep fighting',
      signal: this.signal,
      onConfirm: () => this.scene.start(SceneKeys.SandboxSetup),
      onCancel: () => {
        this.modal = null;
      }
    });
  }

  private reserve(): Unit[] {
    return this.sim.units.filter((u) => u.side === 'P' && u.lane === null && isLive(u));
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
    this.tip = null;
    this.gearBtn = null;
    this.cardBox.clear();
    this.laneBars.clear();
    const signal = this.signal;
    const g = this.sim;
    const opts = this.options();
    const focus = opts.length ? opts[Math.min(this.focusIdx, opts.length - 1)]! : null;
    const plan = g.turn === 'P' && !g.result ? enemyPlan(g) : null;

    this.drawTopBar(root, signal);
    for (let L = 0; L < 3; L++) this.drawLaneBg(root, L);
    root.add(makePanel(this, { x: TRAY.x, y: TRAY.y, w: TRAY.w, h: TRAY.h, bolts: true, border: signal, borderWidth: 3 }));
    root.add(makePanel(this, { x: 40, y: LOG_Y, w: 1840, h: 34, fill: palette.panelDeep }));
    // Cables go under plates, text and cards: they never cover anything you need to read.
    const cableGfx = this.add.graphics();
    root.add(cableGfx);
    for (let L = 0; L < 3; L++) this.drawLane(root, L, signal, opts, focus, plan?.unit ?? null);
    this.drawLog(root, signal);
    this.drawTray(root, signal);
    this.drawPanel(root, signal, opts, focus);
    this.drawCables(cableGfx, signal);
    if (this.showLog) this.drawLogOverlay(root, signal);
    this.playFx(root);
    if (this.outcomeOpen) this.showOutcome(root);
  }

  private drawTopBar(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const title = stencilText(this, 40, 10, g.scenario.battlefield.name, 44, palette.text, { spacing: 0.05, fixed: true });
    root.add(title);
    root.add(monoText(this, 44, title.y + title.height + 2, `${g.scenario.enemyName} · lane HP ${g.scenario.battlefield.laneHp.join('/')}`, 16, palette.textMuted));
    const lamp = this.add.graphics();
    drawLamp(lamp, 760, 38, 9, this.busy ? palette.danger : signal);
    root.add(lamp);
    const phase = g.result
      ? g.result === 'win'
        ? 'FIGHT WON'
        : 'RETREAT'
      : this.busy
        ? 'ENEMY ACTING'
        : inSetup(g)
          ? 'SETUP · DEPLOY'
          : 'YOUR ACTION';
    const round = stencilText(this, 784, 8, `Round ${g.round}`, 36, palette.text, { spacing: 0.06 });
    root.add(round);
    root.add(monoText(this, 784, round.y + round.height, phase, 18, this.busy ? palette.danger : signal, { spacing: 0.1 }));
    const r1 = monoText(this, 1880, 10, `RESULTS DECK ${g.results.length}/52`, 18, palette.textMuted, { originX: 1, spacing: 0.06 });
    root.add(r1);
    root.add(monoText(this, 1880, r1.y + r1.height + 4, `SEED ${this.seed} · DEPTH 1 · MIDDLE HIVE`, 16, palette.textMuted, { originX: 1, spacing: 0.06 }));
  }

  private drawLaneBg(root: Phaser.GameObjects.Container, L: number): void {
    const x0 = LANE_X[L]!;
    const bg = this.add.graphics();
    bg.fillStyle(palette.panelDeep, 1);
    bg.fillRect(x0, LANE_TOP, LANE_W, 578);
    bg.lineStyle(1.5, palette.lineDim, 1);
    bg.strokeRect(x0 + 0.75, LANE_TOP + 0.75, LANE_W - 1.5, 576.5);
    drawHazardStrip(bg, x0, FRONT_Y, LANE_W, 14);
    root.add(bg);
  }

  private drawLane(
    root: Phaser.GameObjects.Container,
    L: number,
    signal: number,
    opts: Opt[],
    focus: Opt | null,
    nextUnit: number | null
  ): void {
    const g = this.sim;
    const x0 = LANE_X[L]!;
    const targetStep = this.step?.step === 'target' || (this.step?.step === 'ready' && opts.length > 0);
    const laneChoice = opts.find((o) => o.k === 'lane' && o.lane === L);

    // Enemy lane HP.
    const hdr = stencilText(this, x0 + 14, LANE_TOP + 8, `Lane ${L + 1}`, 26, palette.textMuted, { spacing: 0.08 });
    root.add(hdr);
    this.drawLaneHp(root, 'E', L, LANE_TOP + 20, x0 + 14 + hdr.width + 14, signal, opts, focus);

    // Enemy plates.
    const foes = inLane(g, 'E', L);
    this.placePlates(root, foes, x0, ENEMY_ZONE_Y, true, opts, focus, nextUnit, targetStep);

    // Player plates.
    const friends = inLane(g, 'P', L, false);
    this.placePlates(root, friends, x0, PLAYER_ZONE_Y, false, opts, focus, null, targetStep);

    // Your lane HP.
    this.drawLaneHp(root, 'P', L, LANE_TOP + 334, x0 + 14, signal, opts, focus);

    // Deploy drop zone.
    if (laneChoice) {
      const z = this.add.graphics();
      const isFocus = focus?.k === 'lane' && focus.lane === L;
      z.lineStyle(isFocus ? 4.5 : 3, signal, 1);
      z.strokeRect(x0 + 4, PLAYER_ZONE_Y - 4, LANE_W - 8, 214);
      root.add(z);
      root.add(monoText(this, x0 + LANE_W / 2, PLAYER_ZONE_Y + 100, `DEPLOY HERE (${L + 1})`, 22, signal, { originX: 0.5, originY: 0.5, spacing: 0.1 }));
      const hit = this.add.zone(x0 + LANE_W / 2, PLAYER_ZONE_Y + 102, LANE_W - 8, 212).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.pickOption({ k: 'lane', lane: L }));
      root.add(hit);
    }
  }

  private drawLaneHp(
    root: Phaser.GameObjects.Container,
    side: 'E' | 'P',
    L: number,
    cy: number,
    labelX: number,
    signal: number,
    opts: Opt[],
    focus: Opt | null
  ): void {
    const g = this.sim;
    const hp = g.laneHP[side][L]!;
    const max = g.scenario.battlefield.laneHp[L]!;
    const asTarget = side === 'E' ? opts.find((o) => o.k === 'target' && o.t.k === 'lane' && o.t.lane === L) : undefined;
    const isFocus = !!asTarget && focus?.k === 'target' && focus.t.k === 'lane' && focus.t.lane === L;
    const open = side === 'E' && inLane(g, 'E', L).length === 0 && g.round > g.scenario.setupRounds;
    let label = side === 'E' ? 'ENEMY HP' : 'YOUR HP';
    let color: number = palette.textMuted;
    if (hp === 0) {
      label = side === 'E' ? 'CAPTURED' : 'LOST';
      color = side === 'E' ? signal : palette.danger;
    } else if (asTarget) {
      label = 'TARGET';
      color = signal;
    } else if (open) {
      label = 'OPEN';
      color = palette.bone;
    }
    const x0 = LANE_X[L]!;
    root.add(monoText(this, labelX, cy, label, 14, color, { originY: 0.5, spacing: 0.08 }));
    const count = monoText(this, x0 + LANE_W - 14, cy, `${hp}/${max}`, 16, palette.text, { originX: 1, originY: 0.5 });
    root.add(count);
    const bar: Box = { x: count.x - count.width - 10 - 120, y: cy - 8, w: 120, h: 16 };
    const gfx = this.add.graphics();
    if (asTarget) {
      gfx.lineStyle(isFocus ? 4.5 : 3, signal, 1);
      gfx.strokeRect(bar.x - 6, bar.y - 6, bar.w + 12, bar.h + 12);
    }
    drawHpBar(gfx, bar.x, bar.y, bar.w, bar.h, hp, max);
    root.add(gfx);
    this.laneBars.set(`${side}${L}`, bar);
    if (asTarget) {
      const hit = this.add.zone(bar.x + bar.w / 2, bar.y + bar.h / 2, bar.w + 20, bar.h + 20).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.pickOption(asTarget));
      root.add(hit);
    }
  }

  private placePlates(
    root: Phaser.GameObjects.Container,
    units: Unit[],
    x0: number,
    y0: number,
    enemy: boolean,
    opts: Opt[],
    focus: Opt | null,
    nextUnit: number | null,
    targetStep: boolean
  ): void {
    const n = units.length;
    const cols = n <= 4 ? 2 : 3;
    const w = cols === 3 ? 138 : 210;
    const compact = cols === 3;
    const gap = 10;
    const rowPitch = enemy ? 118 : 104;
    const left = x0 + (LANE_W - (cols * w + (cols - 1) * gap)) / 2;
    const targetUnitOpts = opts.filter((o) => o.k === 'target' && o.t.k === 'unit');
    const hasUnitTargets = targetUnitOpts.length > 0;
    units.forEach((u, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = left + col * (w + gap);
      const py = y0 + row * rowPitch + (enemy ? 24 : 0);
      const asActor = opts.find((o) => o.k === 'actor' && o.id === u.id);
      const asTarget = opts.find((o) => o.k === 'target' && o.t.k === 'unit' && o.t.id === u.id);
      const choice = asActor ?? asTarget;
      const isFocus = !!choice && !!focus && JSON.stringify(focus) === JSON.stringify(choice);
      let mark: PlateMark = null;
      if (asActor) mark = 'PICK';
      else if (asTarget) mark = 'TARGET';
      else if (enemy && targetStep && hasUnitTargets) mark = 'OUT OF RANGE';
      const actorId = this.sel ? this.stepActor() : null;
      const plate = makePlate(this, {
        x: px, y: py, w, h: PLATE_H, unit: u, enemy, signal: this.signal, mark,
        active: !enemy && (actorId === u.id || (actorId === null && this.viewUnit === u.id)),
        focus: isFocus,
        dim: mark === 'OUT OF RANGE',
        compact,
        onClick: () => {
          if (choice) this.pickOption(choice);
          else if (!enemy) {
            this.viewUnit = u.id;
            this.rebuild();
          }
        }
      });
      root.add(plate);
      this.pos.set(u.id, { x: px + w / 2, y: py + PLATE_H / 2, w, h: PLATE_H });
      if (enemy) {
        root.add(this.intentBadge(u, px, py - 24, w, nextUnit === u.id));
      }
    });
  }

  private stepActor(): number | null {
    if (!this.sel) return null;
    if (this.sel.actor !== undefined) return this.sel.actor;
    const c = candidates(this.actions, this.sel);
    const ids = [...new Set(c.map((a) => a.actor))];
    return ids.length === 1 && ids[0] !== undefined ? ids[0] : null;
  }

  private intentBadge(u: Unit, x: number, y: number, w: number, next: boolean): Phaser.GameObjects.Container {
    const g = this.sim;
    let label = '—';
    if (u.stunned) label = 'STUNNED';
    else if (u.pattern.length) {
      const def = g.scenario.enemyActions[u.pattern[u.pi]!]!;
      label = def.kind === 'rally' ? 'RALLY' : `${def.melee ? 'MELEE' : 'ATK'} ${def.dmg}`;
    }
    if (next && !g.result) {
      const plan = enemyPlan(g);
      if (plan.kind === 'attack' && plan.victim) {
        const name = plan.victim.k === 'unit' ? unitById(g, plan.victim.id).name : `LANE ${plan.victim.lane + 1}`;
        label = `${label} ▸ ${name}`.toUpperCase();
      }
    }
    return makeIntentBadge(this, x, y, w, (next ? 'NEXT ' : '') + label, next);
  }

  private drawLog(root: Phaser.GameObjects.Container, signal: number): void {
    const text = this.logLine.length > 150 ? this.logLine.slice(0, 147) + '…' : this.logLine;
    root.add(monoText(this, 56, LOG_Y + 17, '> ' + text, 18, palette.text, { originY: 0.5 }));
    root.add(monoText(this, 1864, LOG_Y + 17, 'L = LOG', 14, signal, { originX: 1, originY: 0.5, spacing: 0.08 }));
  }

  private drawTray(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    // Reserve row.
    const resLabel = monoText(this, HAND_X0, TRAY.y + 14, 'RESERVE', 16, palette.textMuted, { originY: 0.5, spacing: 0.12 });
    root.add(resLabel);
    let rx = HAND_X0 + resLabel.width + 16;
    const selDeploy = this.sel?.item.kind === 'deploy' ? this.sel.item.unit : null;
    for (const u of this.reserve()) {
      const w = 150;
      const on = selDeploy === u.id;
      const chip = this.add.container(rx + w / 2, TRAY.y + 14);
      const gg = this.add.graphics();
      gg.fillStyle(on ? mix(signal, palette.bg, 0.85) : palette.panelDeep, 1);
      gg.fillRect(-w / 2, -12, w, 24);
      gg.lineStyle(on ? 3 : 1.5, on ? signal : palette.line, 1);
      gg.strokeRect(-w / 2, -12, w, 24);
      chip.add(gg);
      const t = monoText(this, 0, 0, u.name.toUpperCase(), 16, palette.text, { originX: 0.5, originY: 0.5 });
      if (t.width > w - 14) t.setScale((w - 14) / t.width);
      chip.add(t);
      chip.setSize(w, 24);
      chip.setInteractive({ useHandCursor: true });
      chip.on('pointerup', () => (on ? (this.clearSel(), this.refresh()) : this.select({ kind: 'deploy', unit: u.id })));
      root.add(chip);
      rx += w + 12;
    }
    if (!this.reserve().length) root.add(monoText(this, rx, TRAY.y + 14, 'ALL DEPLOYED', 16, palette.textMuted, { originY: 0.5 }));
    root.add(monoText(this, HAND_X0 + HAND_W, TRAY.y + 14, `HAND ${g.hand.length}/${g.scenario.handSize}`, 16, palette.textMuted, { originX: 1, originY: 0.5, spacing: 0.12 }));

    root.add(makePile(this, TRAY.x + 26, CARD_TOP + 10, 'DECK', g.deck.length, signal));
    root.add(makePile(this, TRAY.x + TRAY.w - 138, CARD_TOP + 10, 'DISCARD', g.discard.length, palette.bone));

    // Cards.
    const n = g.hand.length;
    const gap = 12;
    const total = n * CARD_W + (n - 1) * gap;
    const x0 = HAND_X0 + (HAND_W - total) / 2;
    const ready = this.readyAction();
    const burning = new Set(this.burnMode || (ready && ready.fuel > 0) ? this.currentBurn() : []);
    const cycling = this.sel?.item.kind === 'cycle';
    const selCard = this.sel?.item.kind === 'card' ? this.sel.item.name : null;
    let selIid = -1;
    if (selCard) selIid = (ready?.cardIid ?? g.hand.find((c) => c.name === selCard)?.iid) ?? -1;
    g.hand.forEach((c, i) => {
      const def = cardDefs[c.name]!;
      const cx = x0 + i * (CARD_W + gap) + CARD_W / 2;
      const cy = CARD_TOP + CARD_H / 2;
      const isSel = c.iid === selIid;
      const playable = !this.busy && this.actions.some((a) => a.kind === 'play' && a.card === c.name);
      const tag = cycling && this.cycleSet.includes(c.iid) ? 'DISCARD' : burning.has(c.iid) ? 'BURN' : isSel && ready ? 'PLAYING' : null;
      const outer = this.add.container(cx, cy);
      const inner = makeCard(this, { def, key: String(i + 1), signal, selected: isSel, playable: playable || cycling || this.burnMode, tag, focus: false });
      inner.y = isSel ? -28 : 0;
      outer.add(inner);
      outer.setSize(CARD_W, CARD_H);
      outer.setInteractive({ useHandCursor: true });
      outer.on('pointerover', () => {
        if (!isSel) this.tweens.add({ targets: inner, y: -14, duration: this.anim(100) });
        this.showTip(root, c.name, c.iid, cx, playable);
      });
      outer.on('pointerout', () => {
        if (!isSel) this.tweens.add({ targets: inner, y: 0, duration: this.anim(100) });
        this.tip?.destroy();
        this.tip = null;
      });
      outer.on('pointerup', () => this.selectCard(i));
      root.add(outer);
      this.cardBox.set(c.iid, { x: cx, y: cy - (isSel ? 28 : 0) - CARD_H / 2, w: CARD_W, h: CARD_H });
    });
  }

  private showTip(root: Phaser.GameObjects.Container, name: string, iid: number, cx: number, playable: boolean): void {
    const def = cardDefs[name]!;
    this.tip?.destroy();
    const w = 420;
    const lines = [`${def.sourceType.toUpperCase()} · ${def.source}`, def.text, `BURN VALUE ${def.fuelValue} FUEL`];
    const c = this.add.container(0, 0);
    const title = stencilText(this, 18, 12, def.name, 34, palette.text);
    const body = monoText(this, 18, 58, lines[0]! + '\n' + lines[1]!, 18, palette.text, { wrap: w - 36, lineSpacing: 6 });
    const foot = monoText(this, 18, 0, lines[2]!, 16, palette.textMuted, { spacing: 0.06 });
    const cost = [def.playFuel ? `PLAY COST ${def.playFuel} FUEL` : '', def.ammoCost ? `${def.ammoCost} AMMO` : ''].filter(Boolean).join(' · ');
    const reason = playable ? '' : this.reasonFor(name, iid).toUpperCase();
    const extra = [cost, reason].filter(Boolean).join('\n');
    const ex = monoText(this, 18, 0, extra, 16, reason ? palette.danger : palette.text, { wrap: w - 36 });
    const h = 58 + body.height + 14 + (extra ? ex.height + 8 : 0) + foot.height + 16;
    foot.y = h - foot.height - 12;
    ex.y = 58 + body.height + 12;
    const panel = makePanel(this, { x: 0, y: 0, w, h, fill: palette.panelRaised, border: this.signal, borderWidth: 2 });
    c.add([panel, title, body, ex, foot]);
    c.setPosition(Phaser.Math.Clamp(cx - w / 2, 40, 1880 - w), TRAY.y - h + 6);
    root.add(c);
    this.tip = c;
  }

  private drawPanel(root: Phaser.GameObjects.Container, signal: number, opts: Opt[], focus: Opt | null): void {
    const g = this.sim;
    const p = makePanel(this, { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h, bolts: true, scan: true, border: signal, borderWidth: 3 });
    root.add(p);
    const lamp = this.add.graphics();
    drawLamp(lamp, 24, 22, 7, signal);
    p.add(lamp);
    p.add(monoText(this, 42, 22, 'ACTING UNIT', 16, palette.textMuted, { originY: 0.5, spacing: 0.14 }));

    const aid = this.stepActor();
    const deployId = this.sel?.item.kind === 'deploy' ? this.sel.item.unit : null;
    const unit =
      (deployId !== null ? unitById(g, deployId) : null) ??
      (aid !== null ? unitById(g, aid) : null) ??
      (this.viewUnit !== null ? unitById(g, this.viewUnit) : null) ??
      g.units.find((u) => u.side === 'P' && u.lane !== null) ??
      null;

    const W = PANEL.w - 44;
    let y = 42;
    const line = (str: string, size: number, color: number, gapAfter = 6, extra: { wrap?: boolean } = {}): Phaser.GameObjects.Text => {
      const t = monoText(this, 22, y, str, size, color, extra.wrap === false ? {} : { wrap: W });
      p.add(t);
      y += t.height + gapAfter;
      return t;
    };

    if (unit) {
      const nm = stencilText(this, 22, y, unit.name, 48, palette.text, { spacing: 0.04 });
      if (nm.width > W) nm.setScale(W / nm.width);
      p.add(nm);
      y += nm.height * nm.scaleY + 2;
      line(unit.lane === null ? 'IN RESERVE' : `LANE ${unit.lane + 1} · TSC DROID`, 18, palette.textMuted, 10);
      const bar = this.add.graphics();
      drawHpBar(bar, 22, y, W - 70, 20, unit.hp, unit.maxHp);
      p.add(bar);
      p.add(monoText(this, 22 + W, y + 10, `${unit.hp}/${unit.maxHp}`, 20, palette.text, { originX: 1, originY: 0.5 }));
      y += 34;
      line(`SOAK ${unit.armor + unit.builtin} (ARMOR ${unit.armor}/${unit.armorMax} + BUILT-IN ${unit.builtin})`, 16, palette.bone, 4);
      if (unit.ammoMax > 0) line(`AMMO ${unit.ammo}/${unit.ammoMax}`, 16, palette.bone, 4);
      const st: string[] = [];
      if (unit.downed) st.push('DOWNED');
      if (unit.stunned) st.push('STUNNED');
      if (unit.exposed) st.push('EXPOSED');
      if (unit.suppressed > 0) st.push(`SUPPRESSED ${unit.suppressed}`);
      if (unit.counter) st.push('COUNTER READY');
      if (unit.sight) st.push('SIGHT ALIGNED');
      line(st.length ? st.join(' · ') : 'NO STATUS', 16, st.length ? palette.danger : palette.textMuted, 12);
    } else {
      line('NO UNIT DEPLOYED YET', 18, palette.textMuted, 12);
    }

    // Fuel pips: fuel the hand can pay, with the pending cost outlined.
    const ready = this.readyAction();
    const fuelHand = g.hand.reduce((s2, c) => s2 + (cardDefs[c.name]?.fuelValue ?? 1), 0);
    line(`FUEL IN HAND ${fuelHand}${ready && ready.fuel > 0 ? ` · COST ${ready.fuel}` : ''}`, 16, palette.textMuted, 4);
    const pips = this.add.graphics();
    const cost = ready?.fuel ?? 0;
    for (let i = 0; i < Math.min(fuelHand, 18); i++) {
      const px = 30 + i * 20;
      if (i < cost) {
        pips.lineStyle(2, signal, 1);
        pips.strokeCircle(px, y + 7, 7);
      } else {
        pips.fillStyle(palette.bone, 1);
        pips.fillCircle(px, y + 7, 6);
      }
    }
    p.add(pips);
    y += 24;

    // Gear actions of the viewed unit.
    if (unit && unit.lane !== null) {
      const mine = this.actions.filter((a) => a.kind === 'basic' && a.actor === unit.id);
      const labels = [...new Set(mine.map((a) => a.label))];
      const selGear = this.sel?.item.kind === 'gear' ? this.sel.item.label : null;
      labels.slice(0, 2).forEach((lab, i) => {
        const first = mine.find((a) => a.label === lab)!;
        const on = selGear === lab;
        const bh = 36;
        const b = this.add.container(22 + W / 2, y + bh / 2);
        const gg = this.add.graphics();
        gg.fillStyle(on ? mix(signal, palette.bg, 0.85) : palette.panelDeep, 1);
        gg.fillRect(-W / 2, -bh / 2, W, bh);
        gg.lineStyle(on ? 3 : 1.5, on ? signal : palette.line, 1);
        gg.strokeRect(-W / 2, -bh / 2, W, bh);
        b.add(gg);
        const nameT = monoText(this, -W / 2 + 12, 0, lab.toUpperCase(), 18, palette.text, { originY: 0.5 });
        const costT = monoText(this, W / 2 - 12, 0, `FUEL ${first.fuel}${first.ammo ? ` · AMMO ${first.ammo}` : ''}`, 16, palette.textMuted, { originX: 1, originY: 0.5 });
        b.add([nameT, costT]);
        b.setSize(W, bh);
        b.setInteractive({ useHandCursor: true });
        b.on('pointerup', () => (on ? (this.clearSel(), this.refresh()) : this.select({ kind: 'gear', label: lab })));
        p.add(b);
        if (i === 0) this.gearBtn = { x: PANEL.x + 22 + W / 2, y: PANEL.y + y + bh / 2, w: W, h: bh };
        y += bh + 6;
      });
      if (!labels.length) line(this.busy ? 'WAIT FOR YOUR ACTION' : 'NO GEAR ACTION READY', 16, palette.textMuted, 8);
    }

    // Prompt for the current step: the biggest size that fits above the buttons.
    const limit = PANEL.h - 14 - 46 - 10;
    const text = this.prompt(opts, focus);
    for (const size of [18, 16, 14]) {
      const t = monoText(this, 22, y, text, size, palette.text, { wrap: W, lineSpacing: 4 });
      if (y + t.height <= limit || size === 14) {
        p.add(t);
        y += t.height + 8;
        break;
      }
      t.destroy();
    }

    // Variant buttons.
    if (this.step?.step === 'variant') {
      this.step.variants.forEach((v, i) => {
        const on = focus?.k === 'variant' && focus.v === v;
        p.add(
          new Button(this, {
            x: 22, y: y + i * 34, w: W, h: 30, label: v.toUpperCase(), size: 20, state: 'live', accent: on, signal,
            onClick: () => this.pickOption({ k: 'variant', v })
          })
        );
      });
    }

    // Buttons.
    const bw = (W - 10) / 2;
    const by = PANEL.h - 14 - 46;
    p.add(
      new Button(this, {
        x: 22, y: by, w: bw, h: 46, label: ready ? 'Confirm' : 'Cancel', size: 26, state: 'live', accent: !!ready, signal,
        onClick: () => (ready ? this.confirm() : (this.clearSel(), this.refresh()))
      })
    );
    p.add(
      new Button(this, {
        x: 22 + bw + 10, y: by, w: bw, h: 46, label: 'Cycle', size: 26, state: this.busy || !!g.result || inSetup(g) ? 'offline' : 'live', signal,
        onClick: () => (this.sel?.item.kind === 'cycle' ? this.confirm() : this.select({ kind: 'cycle' }))
      })
    );
  }

  private prompt(opts: Opt[], focus: Opt | null): string {
    const g = this.sim;
    if (g.result) return g.result === 'win' ? 'Two enemy lanes are captured. The fight is won.' : 'Two of your lanes fell. Retreat.';
    if (this.busy) return 'Enemy acting…';
    const s = this.step;
    if (!this.sel || !s) {
      return inSetup(g)
        ? `SETUP: pick a reserve unit (click or R), then an empty lane. ${3 - g.round + 1} deploys left.`
        : 'Pick a card (1-7 or click), a gear action (G), or Cycle (E) to discard up to ' + g.scenario.cycleLimit + ' cards and draw.';
    }
    if (this.sel.item.kind === 'cycle') {
      return `DISCARD & DRAW: click or press 1-7 to mark up to ${g.scenario.cycleLimit} cards (${this.cycleSet.length} marked), then Enter.`;
    }
    switch (s.step) {
      case 'actor':
        return 'WHO USES IT? Click a highlighted unit, or Tab and Enter.';
      case 'target':
        return 'PICK A TARGET: click one, or Tab and Enter.';
      case 'lane':
        return 'PICK A LANE: click it, or press 1-3.';
      case 'variant':
        return 'CHOOSE ONE:';
      case 'ready': {
        const a = s.action;
        const bits: string[] = [a.kind === 'deploy' ? a.label : `${a.label}${a.actor ? ' · ' + unitById(g, a.actor).name : ''}`];
        if (a.fuel > 0) {
          const ids = this.currentBurn();
          const names = ids.map((id) => g.hand.find((c) => c.iid === id)?.name ?? '?').join(', ');
          bits.push(`BURN ${names || 'nothing'} (${this.burnValue(ids)}/${a.fuel} fuel). B to change.`);
        }
        if (opts.length && focus) bits.push('Pick another target or Enter to fire.');
        else bits.push('Enter to confirm.');
        return bits.join('\n');
      }
      default:
        return '';
    }
  }

  private drawCables(gfx: Phaser.GameObjects.Graphics, signal: number): void {
    const s = this.step;
    if (!s || !this.sel) return;
    const opts = this.options();
    if (!opts.length || s.step === 'variant' || s.step === 'lane') return;
    let from: { x: number; y: number } | null = null;
    const ready = this.readyAction();
    if (this.sel.item.kind === 'card') {
      const iid = ready?.cardIid ?? this.sim.hand.find((c) => this.sel!.item.kind === 'card' && c.name === (this.sel!.item as { name: string }).name)?.iid;
      const b = iid !== undefined ? this.cardBox.get(iid) : undefined;
      if (b) from = { x: b.x + b.w / 2, y: b.y };
    } else if (this.sel.item.kind === 'deploy') {
      from = { x: HAND_X0 + 140, y: TRAY.y + 4 };
    } else {
      const aid = this.stepActor();
      const b = aid !== null ? this.pos.get(aid) : this.gearBtn;
      if (b) from = { x: b.x, y: b.y + (aid !== null ? b.h / 2 : 0) };
    }
    if (!from) return;
    for (const o of opts) {
      let to: { x: number; y: number } | null = null;
      if (o.k === 'actor') {
        const b = this.pos.get(o.id);
        if (b) to = { x: b.x, y: b.y + b.h / 2 };
      } else if (o.k === 'target') {
        if (o.t.k === 'unit') {
          const b = this.pos.get(o.t.id);
          if (b) to = { x: b.x, y: b.y + b.h / 2 };
        } else {
          const b = this.laneBars.get(`${o.t.side}${o.t.lane}`);
          if (b) to = { x: b.x + b.w / 2, y: b.y + b.h + 4 };
        }
      }
      if (to) drawCable(gfx, from, to, { color: signal, c1: { x: 0, y: -170 }, c2: { x: 0, y: 150 }, width: 3 });
    }
  }

  private drawLogOverlay(root: Phaser.GameObjects.Container, signal: number): void {
    const w = 1000;
    const h = 620;
    const x = (1920 - w) / 2;
    const y = 150;
    const p = makePanel(this, { x, y, w, h, bolts: true, hazard: true, scan: true, border: signal, borderWidth: 3, fill: palette.panel });
    root.add(p);
    p.add(stencilText(this, 36, 36, 'Vox log', 44, palette.text));
    const rows = this.logHistory.slice(-16);
    rows.forEach((l, i) => p.add(monoText(this, 36, 100 + i * 31, l.length > 80 ? l.slice(0, 77) + '…' : l, 18, i === rows.length - 1 ? palette.text : palette.textMuted)));
    p.add(monoText(this, w - 36, h - 30, 'L or Esc to close', 16, palette.textMuted, { originX: 1 }));
  }

  // ---------- feedback

  private floater(root: Phaser.GameObjects.Container, text: string, x: number, y: number, color: number, size = 28): void {
    const t = monoText(this, x, y, text, size, color, { originX: 0.5, originY: 0.5, weight: 'bold' });
    t.setStroke(toCss(palette.bg), 6);
    root.add(t);
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: this.anim(950),
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy()
    });
  }

  private playFx(root: Phaser.GameObjects.Container): void {
    const q = this.fxQueue;
    this.fxQueue = [];
    let stack = 0;
    for (const e of q) {
      if (e.t === 'damage') {
        const b = this.pos.get(e.unit);
        if (!b) continue;
        const parts: string[] = [];
        if (e.hp > 0) parts.push(`-${e.hp}`);
        if (e.soaked > 0) parts.push(`${e.soaked} SOAK`);
        if (e.killed) parts.push('KILLED');
        if (e.downed) parts.push('DOWNED');
        if (parts.length) this.floater(root, parts.join(' · '), b.x, b.y - 10 - (stack++ % 3) * 6, e.hp > 0 || e.killed || e.downed ? palette.danger : palette.bone, 24);
        const flash = this.add.rectangle(b.x, b.y, b.w, b.h, palette.danger, 0.4);
        root.add(flash);
        this.tweens.add({ targets: flash, alpha: 0, duration: this.anim(350), onComplete: () => flash.destroy() });
      } else if (e.t === 'laneDamage') {
        const b = this.laneBars.get(`${e.side}${e.lane}`);
        if (b && e.amount > 0) this.floater(root, `-${e.amount} LANE${e.captured ? ' CAPTURED' : ''}`, b.x + b.w / 2, b.y + 28, e.side === 'E' ? this.signal : palette.danger, 22);
      } else if (e.t === 'heal') {
        const b = this.pos.get(e.unit);
        if (b) this.floater(root, `+${e.hp} HP${e.revived ? ' UP' : ''}`, b.x, b.y, palette.text, 24);
      } else if (e.t === 'soakGain') {
        const b = this.pos.get(e.unit);
        if (b) this.floater(root, `+${e.amount} SOAK`, b.x, b.y, palette.bone, 24);
      } else if (e.t === 'ammoGain') {
        const b = this.pos.get(e.unit);
        if (b) this.floater(root, `+${e.amount} AMMO`, b.x, b.y, palette.bone, 24);
      } else if (e.t === 'status' && e.on) {
        const b = this.pos.get(e.unit);
        if (b) this.floater(root, e.status.toUpperCase(), b.x, b.y + 20, e.status === 'counter' || e.status === 'sight' ? this.signal : palette.danger, 20);
      } else if (e.t === 'intentSkip') {
        const b = this.pos.get(e.unit);
        if (b) this.floater(root, 'LOSES ACTION', b.x, b.y, palette.text, 22);
      } else if (e.t === 'results') {
        this.floater(root, 'RESULTS ' + e.cards.map((v) => `${v} ${band(v)}`).join(' → '), 720, 380, palette.text, 30);
      } else if (e.t === 'draw' && e.reshuffled) {
        this.floater(root, 'RESHUFFLED', 120, CARD_TOP - 10, palette.bone, 22);
      }
    }
  }

  private showOutcome(root: Phaser.GameObjects.Container): void {
    const g = this.sim;
    const won = g.result === 'win';
    const downed = g.units.filter((u) => u.side === 'P' && u.downed).map((u) => u.name);
    const body = [
      `${g.round} rounds · ${g.stats.played ?? 0} cards played · ${g.stats.burned ?? 0} burned · ${g.stats.cycled ?? 0} cycled.`,
      downed.length ? `Downed: ${downed.join(', ')}.` : 'Nobody downed.',
      won ? 'Reward (not wired yet): 1 loot draw and 2 Eagles.' : 'You pull back. Downed crew are left behind (not wired yet).'
    ].join('\n');
    this.modal = new Modal(this, root, {
      title: won ? 'Victory' : 'Retreat',
      body,
      confirmLabel: 'Fight again',
      cancelLabel: 'Back to setup',
      signal: this.signal,
      onConfirm: () => this.scene.restart({ seed: Math.floor(Math.random() * 1e9) }),
      onCancel: () => this.scene.start(SceneKeys.SandboxSetup)
    });
  }
}
