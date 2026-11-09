import Phaser from 'phaser';
import { loadoutOf } from '../core/loadout';
import { candidates, needsConfirm, pickActor, pickLane, pickTarget, pickVariant, resolve, unplayableReason, type Sel, type Step } from '../core/selection';
import { session } from '../core/session';
import { cardDefs } from '../data/cards';
import type { Force } from '../data/forces';
import { mix, palette, toCss } from '../data/palette';
import { settleFight, startFight } from '../data/rooms';
import { tscVsScavvers } from '../data/scenarios';
import { fuelAvailable, listActions, perform, suggestBurn } from '../sim/actions';
import { needsActor } from '../sim/cards';
import { chooseAction } from '../sim/autoplay';
import { enemyAct, enemyPlan } from '../sim/enemy';
import { rollInitiative } from '../sim/initiative';
import { createGame, inLane, inSetup, isLive, unitById } from '../sim/state';
import { beginEnemyTurn, beginTurn } from '../sim/turn';
import type { Action, Ev, Game, Target, Unit } from '../sim/types';
import { Button } from '../ui/Button';
import { drawCable } from '../ui/Cable';
import { flowInline, makeCard, makeIntentBadge, makePile, makePlate, makeUnitCard, drawHpBar, CARD_H, CARD_W, type PlateMark } from '../ui/combat/parts';
import { drawSuit } from '../ui/icons';
import { toRef } from '../ui/layout';
import { drawLamp } from '../ui/Lamp';
import { Modal } from '../ui/Modal';
import { drawHazardStrip, makePanel } from '../ui/Panel';
import { bodyText, stencilText, textContext } from '../ui/text';
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
const LANE_BOTTOM = LANE_TOP + 578;
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
  /** set when this fight belongs to the expedition */
  private force: Force | null = null;
  private sel: Sel | null = null;
  private actions: Action[] = [];
  private step: Step | null = null;
  private focusIdx = 0;
  /** hand cards marked to be burned for the pending action */
  private burn: number[] = [];
  private cycleSet: number[] = [];
  /** the squad member shown in the side panel (the last to act, or the last one clicked) */
  private viewUnit: number | null = null;
  /** a squad member the player clicked on to act with; the next ability they pick uses this unit */
  private chosenUnit: number | null = null;
  private busy = false;
  /** which hand fills the tray: the squad's unit cards or the action cards */
  private handView: 'units' | 'actions' = 'units';
  private loadoutPane: Phaser.GameObjects.Container | null = null;
  /** the initiative roll is on screen */
  private intro = false;
  private initiative: Extract<Ev, { t: 'initiative' }> | null = null;
  private fx: Phaser.GameObjects.Container | null = null;
  private fxMs = 0;
  /** a unit card the pointer is down on, and whether it has turned into a drag */
  private dragCand: { unit: number; x: number; y: number } | null = null;
  private dragging: { unit: number; ghost: Phaser.GameObjects.Container; hi: Phaser.GameObjects.Graphics } | null = null;
  private dragMoved = false;
  private outcomeOpen = false;
  private showLog = false;
  private logLine = '';
  private logHistory: string[] = [];
  private fxQueue: Ev[] = [];
  private pos = new Map<number, Box>();
  /** where each lane's enemy half and squad half sit, for targeting and effects */
  private laneBoxes = new Map<string, Box>();
  private cardBox = new Map<number, Box>();
  private tip: Phaser.GameObjects.Container | null = null;
  private gearBtn: Box | null = null;
  private unitTiles = new Map<number, Box>();

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
    const x = session.expedition;
    if (x?.pending?.kind === 'fight') {
      const f = startFight(x);
      this.sim = f.game;
      this.force = f.force;
    } else {
      this.force = null;
      this.sim = createGame(tscVsScavvers, this.seed);
    }
    this.sel = null;
    this.burn = [];
    this.cycleSet = [];
    this.viewUnit = null;
    this.chosenUnit = null;
    this.handView = 'units';
    this.loadoutPane = null;
    this.busy = true;
    this.intro = true;
    this.outcomeOpen = false;
    this.showLog = false;
    this.logHistory = [];
    this.logLine = 'Rolling for initiative…';
    this.pos.clear();
    this.fxQueue = [];
    this.fxMs = 0;
    this.dragging = null;
    this.dragCand = null;
    this.fx = null;
    this.absorb(rollInitiative(this.sim));
    this.initiative = this.fxQueue.find((e): e is Extract<Ev, { t: 'initiative' }> => e.t === 'initiative') ?? null;
    this.fxQueue = [];
    if (this.sim.first === 'P') this.absorb(beginTurn(this.sim));
    this.derive();
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onKey, this);
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.off('pointerdown', this.onPointerDown, this);
    });
    // The first build has to exist before the roll can draw on top of it.
    this.time.delayedCall(60, () => this.playIntro());
  }

  // ---------- state

  private derive(): void {
    this.actions = listActions(this.sim);
    if (this.sel) {
      const r = resolve(this.actions, this.sel);
      this.sel = r.sel;
      this.step = r.step;
      if (r.step.step === 'none') this.clearSel();
    } else this.step = null;
    this.trimBurn();
  }

  /** Open on the unit hand while the squad is being deployed, on the action hand once the fight is on (reserves can still be fetched with the tab or H). */
  private autoHand(): void {
    this.handView = inSetup(this.sim) && this.actions.some((a) => a.kind === 'deploy') ? 'units' : 'actions';
  }

  private clearSel(): void {
    this.sel = null;
    this.step = null;
    this.focusIdx = 0;
    this.burn = [];
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

  /** Re-read the legal actions, fire the pending one if nothing is left to choose, and redraw. */
  private refresh(): void {
    this.derive();
    if (this.tryFire()) return;
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
    this.refresh();
  }

  private select(item: Sel['item'], actor?: number): void {
    if (this.busy || this.sim.result) return;
    this.clearSel();
    this.sel = { item, targets: [], ...(actor !== undefined ? { actor } : {}) };
    this.handView = item.kind === 'deploy' ? 'units' : 'actions';
    this.refresh();
  }

  /** The card in hand the pending play would use up. It can never be burned for itself. */
  private playIid(): number | undefined {
    if (!this.sel) return undefined;
    const a = this.readyAction();
    if (a) return a.cardIid;
    if (this.sel.item.kind !== 'card') return undefined;
    return candidates(this.actions, this.sel)[0]?.cardIid;
  }

  /** Fuel the pending action costs. Before it is fully chosen: the least any version of it costs. */
  private fuelNeed(): number {
    if (!this.sel || this.sel.item.kind === 'cycle') return 0;
    const a = this.readyAction();
    if (a) return a.fuel;
    const c = candidates(this.actions, this.sel);
    return c.length ? Math.min(...c.map((x) => x.fuel)) : 0;
  }

  private fuelOf(iid: number): number {
    const c = this.sim.hand.find((x) => x.iid === iid);
    return c ? (cardDefs[c.name]?.fuelValue ?? 1) : 0;
  }

  /** Drop marks that no longer make sense: cards that left the hand, the card being played, fuel already covered. */
  private trimBurn(): void {
    const need = this.fuelNeed();
    const play = this.playIid();
    const out: number[] = [];
    let total = 0;
    for (const iid of this.burn) {
      if (total >= need) break;
      if (iid === play || !this.sim.hand.some((c) => c.iid === iid)) continue;
      out.push(iid);
      total += this.fuelOf(iid);
    }
    this.burn = out;
  }

  private selectCard(i: number): void {
    const c = this.sim.hand[i];
    if (!c || this.busy || this.sim.result) return;
    if (this.sel?.item.kind === 'cycle') {
      this.toggleCycle(c.iid);
      return;
    }
    // An action that costs fuel is waiting: the hand is now the place to pick what to burn.
    if (this.sel && this.fuelNeed() > 0) {
      if (c.iid === this.playIid()) {
        this.clearSel();
        this.refresh();
      } else this.toggleBurn(c.iid);
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
    const who = this.chosenUnit;
    const pre = who !== null && this.actions.some((a) => a.kind === 'play' && a.card === c.name && a.actor === who) ? who : undefined;
    this.select({ kind: 'card', name: c.name }, pre);
  }

  private toggleBurn(iid: number): void {
    const at = this.burn.indexOf(iid);
    if (at >= 0) this.burn.splice(at, 1);
    else {
      if (this.burnValue(this.burn) >= this.fuelNeed()) {
        this.logLine = 'Fuel is covered. Click a marked card to unmark it.';
        this.rebuild();
        return;
      }
      this.burn.push(iid);
    }
    this.refresh();
  }

  private toggleCycle(iid: number): void {
    const at = this.cycleSet.indexOf(iid);
    if (at >= 0) this.cycleSet.splice(at, 1);
    else if (this.cycleSet.length < this.sim.scenario.cycleLimit) this.cycleSet.push(iid);
    this.rebuild();
  }

  private readyAction(): Action | null {
    return this.step?.step === 'ready' ? this.step.action : null;
  }

  private burnValue(ids: number[]): number {
    return ids.reduce((sum, id) => sum + this.fuelOf(id), 0);
  }

  /** The marked cards, topped up from the game's suggestion when they do not cover the cost. */
  private fillBurn(a: Action, need: number = a.fuel): number[] {
    const marked = [...this.burn];
    let have = this.burnValue(marked);
    const add = (iid: number): void => {
      if (have >= need || marked.includes(iid) || iid === a.cardIid) return;
      marked.push(iid);
      have += this.fuelOf(iid);
    };
    for (const iid of suggestBurn(this.sim, { ...a, fuel: need }, this.actions)) add(iid);
    for (const c of this.sim.hand) add(c.iid);
    return marked;
  }

  /** B: burn the cards the game would pick, for the fuel still owed. */
  private autoBurn(): void {
    const need = this.fuelNeed();
    const base = this.readyAction() ?? (this.sel ? candidates(this.actions, this.sel)[0] : undefined);
    if (!base || need <= 0) return;
    this.burn = this.fillBurn(base, need);
    this.refresh();
  }

  /** Perform the pending action as soon as nothing is left to choose and the fuel is covered. */
  private tryFire(): boolean {
    if (this.busy || this.sim.result || !this.sel || !this.step) return false;
    if (this.step.step !== 'ready' || needsConfirm(this.step, this.sel)) return false;
    const a = this.step.action;
    if (a.fuel > 0 && this.burnValue(this.burn) < a.fuel) return false;
    this.perform(a, a.fuel > 0 ? [...this.burn] : undefined);
    return true;
  }

  /** The Confirm button and Enter: for the optional second target, the discard picks, or burning the suggestion. */
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
    } else if (a.fuel > 0) cards = this.fillBurn(a);
    this.perform(a, cards);
  }

  /** How long to wait before the next side moves: the usual beat, or long enough for the effects to play out. */
  private beat(base: number): number {
    return this.anim(Math.max(base, this.fxMs + 220));
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
    this.chosenUnit = null;
    this.clearSel();
    this.absorb(ev);
    this.busy = true;
    this.derive();
    this.rebuild();
    if (this.sim.result) this.time.delayedCall(this.beat(900), () => this.openOutcome());
    else this.time.delayedCall(this.beat(750), () => this.enemyTurn());
  }

  private enemyTurn(): void {
    this.absorb(beginEnemyTurn(this.sim));
    this.absorb(enemyAct(this.sim));
    this.derive();
    this.rebuild();
    if (this.sim.result) {
      this.time.delayedCall(this.beat(900), () => this.openOutcome());
      return;
    }
    this.time.delayedCall(this.beat(550), () => {
      this.absorb(beginTurn(this.sim));
      this.busy = false;
      this.derive();
      this.autoHand();
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
      if (this.intro) {
        this.endIntro();
      } else if (this.sel) {
        this.clearSel();
        this.refresh();
      } else if (this.chosenUnit !== null) {
        this.chosenUnit = null;
        this.rebuild();
      } else this.openPause();
      return;
    }
    if (this.intro) {
      this.endIntro();
      return;
    }
    if (key.toLowerCase() === 'h') {
      this.handView = this.handView === 'units' ? 'actions' : 'units';
      this.rebuild();
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
      this.autoBurn();
      return;
    }
    if (key.toLowerCase() === 'g') {
      // Gear actions of the clicked unit if there is one, else of everyone.
      const mine = this.chosenUnit !== null ? this.actions.filter((a) => a.kind === 'basic' && a.actor === this.chosenUnit) : [];
      const gear = [...new Set((mine.length ? mine : this.actions.filter((a) => a.kind === 'basic')).map((a) => a.label))];
      if (!gear.length) return;
      const cur = this.sel?.item.kind === 'gear' ? gear.indexOf(this.sel.item.label) : -1;
      this.select({ kind: 'gear', label: gear[(cur + 1) % gear.length]! }, mine.length ? this.chosenUnit! : undefined);
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

  /** Hand the finished (or abandoned) fight back to the expedition and return to its map. */
  private backToMap(): void {
    if (session.expedition && this.force) settleFight(session.expedition, this.sim, this.force);
    this.scene.start(SceneKeys.Expedition);
  }

  private openPause(): void {
    const exp = this.force !== null;
    this.modal = new Modal(this, this.root, {
      title: exp ? 'Give up the fight?' : 'Leave the fight?',
      body: exp
        ? 'Giving up counts as a loss: the squad retreats, the downed are left behind and the expedition ends.'
        : 'Abandoning the fight returns you to the sandbox setup. Nothing is saved.',
      confirmLabel: exp ? 'Give up' : 'Abandon',
      cancelLabel: 'Keep fighting',
      signal: this.signal,
      onConfirm: () => (exp ? this.backToMap() : this.scene.start(SceneKeys.SandboxSetup)),
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
    this.ensureFx();
    textContext.dense = true;
    try {
      this.buildAll(root);
    } finally {
      textContext.dense = false;
    }
  }

  /** Effects live on their own layer so a redraw of the screen never cuts them short. */
  private ensureFx(): Phaser.GameObjects.Container {
    if (!this.fx || !this.fx.active) {
      this.fx = this.add.container(0, 0);
      this.fx.setDepth(100);
    }
    this.fx.setPosition(this.L.offsetX, this.L.offsetY);
    this.fx.setScale(this.L.scale);
    return this.fx;
  }

  private buildAll(root: Phaser.GameObjects.Container): void {
    this.tip = null;
    this.gearBtn = null;
    this.cardBox.clear();
    this.laneBoxes.clear();
    this.unitTiles.clear();
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
    this.playFx();
    if (this.outcomeOpen) this.showOutcome(root);
  }

  private drawTopBar(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const title = stencilText(this, 40, 10, g.scenario.battlefield.name, 44, palette.text, { spacing: 0.05, fixed: true });
    root.add(title);
    root.add(bodyText(this, 44, title.y + title.height + 2, `${g.scenario.enemyName} · lane HP ${g.scenario.battlefield.laneHp.join('/')}`, 16, palette.textMuted));
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
    root.add(bodyText(this, 784, round.y + round.height, phase, 18, this.busy ? palette.danger : signal, { spacing: 0.1 }));
    const r1 = bodyText(this, 1880, 10, `RESULTS DECK ${g.results.length}/52`, 18, palette.textMuted, { originX: 1, spacing: 0.06 });
    root.add(r1);
    root.add(bodyText(this, 1880, r1.y + r1.height + 4, `SEED ${this.seed} · DEPTH 1 · MIDDLE HIVE`, 16, palette.textMuted, { originX: 1, spacing: 0.06 }));
    this.drawInitiativeChips(root, signal);
  }

  /** The two initiative cards from the opening roll, the winner filled. */
  private drawInitiativeChips(root: Phaser.GameObjects.Container, signal: number): void {
    const ini = this.initiative;
    if (!ini || this.intro) return;
    const chips: Array<{ label: string; d: { value: number; suit: number }; first: boolean }> = [
      { label: 'SQUAD', d: ini.squad, first: ini.first === 'P' },
      { label: 'ENEMY', d: ini.enemy, first: ini.first === 'E' }
    ];
    root.add(bodyText(this, 1060, 12, `INITIATIVE · ${ini.first === 'P' ? 'SQUAD' : 'ENEMY'} FIRST`, 14, palette.textMuted, { spacing: 0.12 }));
    chips.forEach((c, i) => {
      const x = 1060 + i * 190;
      const y = 36;
      const gg = this.add.graphics();
      if (c.first) {
        gg.fillStyle(signal, 1);
        gg.fillRect(x, y, 180, 40);
      } else {
        gg.lineStyle(1.5, palette.line, 1);
        gg.strokeRect(x, y, 180, 40);
      }
      drawSuit(gg, c.d.suit, x + 152, y + 20, 18, c.first ? palette.bg : palette.textMuted);
      root.add(gg);
      root.add(bodyText(this, x + 12, y + 20, `${c.label} ${c.d.value}`, 18, c.first ? palette.bg : palette.textMuted, { originY: 0.5, spacing: 0.06 }));
    });
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
    const laneTarget = opts.find((o): o is Extract<Opt, { k: 'target' }> => o.k === 'target' && o.t.k === 'lane' && o.t.side === 'E' && o.t.lane === L);
    const foes = inLane(g, 'E', L);
    const enemyHalf: Box = { x: x0, y: LANE_TOP, w: LANE_W, h: FRONT_Y - LANE_TOP };
    const squadHalf: Box = { x: x0, y: FRONT_Y + 14, w: LANE_W, h: LANE_BOTTOM - FRONT_Y - 14 };
    this.laneBoxes.set(`E${L}`, enemyHalf);
    this.laneBoxes.set(`P${L}`, squadHalf);

    // A lane as a target (its HP, or everything standing in it): the whole enemy half lights up and is the button.
    // It sits under the plates, so a plate that is itself a target still wins the click.
    if (laneTarget) {
      const isFocus = focus?.k === 'target' && focus.t.k === 'lane' && focus.t.lane === L;
      const z = this.add.graphics();
      z.fillStyle(signal, isFocus ? 0.2 : 0.1);
      z.fillRect(enemyHalf.x, enemyHalf.y, enemyHalf.w, enemyHalf.h);
      z.lineStyle(isFocus ? 6 : 4, signal, 1);
      z.strokeRect(x0 + 3, LANE_TOP + 3, LANE_W - 6, enemyHalf.h - 6);
      root.add(z);
      const hit = this.add.zone(x0 + LANE_W / 2, enemyHalf.y + enemyHalf.h / 2, enemyHalf.w, enemyHalf.h).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.pickOption(laneTarget));
      root.add(hit);
    }

    // Enemy lane HP.
    const hdr = stencilText(this, x0 + 14, LANE_TOP + 8, `Lane ${L + 1}`, 26, palette.textMuted, { spacing: 0.08 });
    root.add(hdr);
    this.drawLaneHp(root, 'E', L, LANE_TOP + 20, x0 + 14 + hdr.width + 14, signal, !!laneTarget, foes.length > 0);

    // Enemy plates.
    this.placePlates(root, foes, x0, ENEMY_ZONE_Y, true, opts, focus, nextUnit, targetStep);

    // Player plates.
    const friends = inLane(g, 'P', L, false);
    this.placePlates(root, friends, x0, PLAYER_ZONE_Y, false, opts, focus, null, targetStep);

    // Your lane HP.
    this.drawLaneHp(root, 'P', L, LANE_TOP + 334, x0 + 14, signal, false, false);

    // Deploy drop zone.
    if (laneChoice) {
      const hot = this.dragging !== null;
      const z = this.add.graphics();
      const isFocus = focus?.k === 'lane' && focus.lane === L;
      z.fillStyle(signal, hot || isFocus ? 0.12 : 0.05);
      z.fillRect(x0 + 4, PLAYER_ZONE_Y - 4, LANE_W - 8, 214);
      z.lineStyle(isFocus ? 4.5 : 3, signal, 1);
      z.strokeRect(x0 + 4, PLAYER_ZONE_Y - 4, LANE_W - 8, 214);
      root.add(z);
      root.add(bodyText(this, x0 + LANE_W / 2, PLAYER_ZONE_Y + 100, `DEPLOY HERE (${L + 1})`, 22, signal, { originX: 0.5, originY: 0.5, spacing: 0.1 }));
      const hit = this.add.zone(x0 + LANE_W / 2, PLAYER_ZONE_Y + 102, LANE_W - 8, 212).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!this.dragMoved) this.pickOption({ k: 'lane', lane: L });
      });
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
    asTarget: boolean,
    hasFoes: boolean
  ): void {
    const g = this.sim;
    const hp = g.laneHP[side][L]!;
    const max = g.scenario.battlefield.laneHp[L]!;
    const open = side === 'E' && !hasFoes && g.round > g.scenario.setupRounds;
    let label = side === 'E' ? 'ENEMY HP' : 'YOUR HP';
    let color: number = palette.textMuted;
    if (hp === 0) {
      label = side === 'E' ? 'CAPTURED' : 'LOST';
      color = side === 'E' ? signal : palette.danger;
    } else if (asTarget) {
      label = hasFoes ? 'TARGET · EVERY ENEMY HERE' : 'TARGET · LANE HP';
      color = signal;
    } else if (open) {
      label = 'OPEN';
      color = palette.bone;
    }
    const x0 = LANE_X[L]!;
    root.add(bodyText(this, labelX, cy, label, asTarget ? 15 : 14, color, { originY: 0.5, spacing: 0.08, weight: asTarget ? '700' : undefined }));
    const count = bodyText(this, x0 + LANE_W - 14, cy, `${hp}/${max}`, 16, palette.text, { originX: 1, originY: 0.5 });
    root.add(count);
    const barW = asTarget ? 70 : 120;
    const bar: Box = { x: count.x - count.width - 10 - barW, y: cy - 8, w: barW, h: 16 };
    const gfx = this.add.graphics();
    drawHpBar(gfx, bar.x, bar.y, bar.w, bar.h, hp, max);
    root.add(gfx);
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
          else if (enemy) {
            // A lane that is a target takes the click anywhere in its box, plates included.
            const lane = opts.find((o) => o.k === 'target' && o.t.k === 'lane' && o.t.side === 'E' && o.t.lane === u.lane);
            if (lane) this.pickOption(lane);
          } else this.clickFriend(u);
        }
      });
      root.add(plate);
      this.pos.set(u.id, { x: px + w / 2, y: py + PLATE_H / 2, w, h: PLATE_H });
      if (enemy) {
        root.add(this.intentBadge(u, px, py - 24, w, nextUnit === u.id));
      }
    });
  }

  /** Clicking one of your own units picks it to act: its abilities show in the side panel and the next one you pick is its. */
  private clickFriend(u: Unit): void {
    this.viewUnit = u.id;
    if (!this.sel && !this.busy) this.chosenUnit = this.chosenUnit === u.id ? null : u.id;
    this.rebuild();
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
      if (def.kind === 'rally') label = 'RALLY';
      else if (def.kind === 'buff') label = `+${def.soak ?? 1} SOAK`;
      else {
        const kind = def.area ? 'AREA' : def.melee ? 'MELEE' : 'ATK';
        label = `${kind}${def.dmg > 0 ? ` ${def.dmg}` : ''}${def.burn ? ' +FIRE' : ''}${def.stun ? ' +STUN' : ''}${def.suppress ? ' +SUP' : ''}`;
        if (def.windup && u.charging !== def.id) label = `WIND-UP ${label}`;
      }
    }
    if (next && !g.result) {
      const plan = enemyPlan(g);
      if (plan.kind === 'attack' && plan.victim) {
        const name = plan.victim.k === 'unit' ? unitById(g, plan.victim.id).name : `LANE ${plan.victim.lane + 1}`;
        label = `${label} ▸ ${name}`.toUpperCase();
      } else if (plan.kind === 'attack' && plan.areaLane !== undefined && plan.areaLane !== null) {
        label = `${label} ▸ LANE ${plan.areaLane + 1}`;
      }
    }
    return makeIntentBadge(this, x, y, w, (next ? 'NEXT ' : '') + label, next);
  }

  private drawLog(root: Phaser.GameObjects.Container, signal: number): void {
    const text = this.logLine.length > 150 ? this.logLine.slice(0, 147) + '…' : this.logLine;
    root.add(bodyText(this, 56, LOG_Y + 17, '> ' + text, 18, palette.text, { originY: 0.5 }));
    root.add(bodyText(this, 1864, LOG_Y + 17, 'L = LOG', 14, signal, { originX: 1, originY: 0.5, spacing: 0.08 }));
  }

  private drawTray(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    this.drawUnitHand(root, signal);
    this.drawHandTabs(root, signal);
    root.add(makePile(this, TRAY.x + 26, CARD_TOP + 10, 'DECK', g.deck.length, signal));
    root.add(makePile(this, TRAY.x + TRAY.w - 138, CARD_TOP + 10, 'DISCARD', g.discard.length, palette.bone));
    if (this.handView === 'units') this.drawUnitCards(root, signal);
    else this.drawActionCards(root, signal);
  }

  /** Two tabs flip the tray between the squad's unit cards and the action hand (H does the same). */
  private drawHandTabs(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const left = this.reserve().length;
    const tabs: Array<{ id: 'units' | 'actions'; label: string; w: number }> = [
      { id: 'units', label: left ? `UNIT HAND · ${left}` : 'UNIT HAND', w: left ? 170 : 130 },
      { id: 'actions', label: `ACTION HAND ${g.hand.length}/${g.scenario.handSize}`, w: 180 }
    ];
    let x = HAND_X0 + HAND_W - tabs.reduce((n, t) => n + t.w + 8, -8);
    for (const t of tabs) {
      const on = this.handView === t.id;
      const h = 32;
      const b = this.add.container(x + t.w / 2, TRAY.y + 8 + h / 2);
      const gg = this.add.graphics();
      gg.fillStyle(on ? mix(signal, palette.bg, 0.85) : palette.panelDeep, 1);
      gg.fillRect(-t.w / 2, -h / 2, t.w, h);
      gg.lineStyle(on ? 3 : 1.5, on ? signal : palette.line, 1);
      gg.strokeRect(-t.w / 2, -h / 2, t.w, h);
      b.add(gg);
      b.add(bodyText(this, 0, 0, t.label, 15, on ? palette.text : palette.textMuted, { originX: 0.5, originY: 0.5, spacing: 0.1, weight: '700' }));
      b.setSize(t.w, h);
      b.setInteractive({ useHandCursor: !on });
      b.on('pointerup', () => {
        if (on || this.intro) return;
        this.handView = t.id;
        this.rebuild();
      });
      root.add(b);
      x += t.w + 8;
    }
  }

  private drawActionCards(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const n = g.hand.length;
    const gap = 12;
    const total = n * CARD_W + (n - 1) * gap;
    const x0 = HAND_X0 + (HAND_W - total) / 2;
    const marked = new Set(this.burn);
    const cycling = this.sel?.item.kind === 'cycle';
    // An action that costs fuel is waiting: every other card in hand is a candidate to burn.
    const need = this.fuelNeed();
    const awaiting = !this.busy && !!this.sel && !cycling && need > 0 && this.burnValue(this.burn) < need;
    const playIid = this.sel?.item.kind === 'card' ? this.playIid() : undefined;
    g.hand.forEach((c, i) => {
      const def = cardDefs[c.name]!;
      const cx = x0 + i * (CARD_W + gap) + CARD_W / 2;
      const cy = CARD_TOP + CARD_H / 2;
      const isSel = c.iid === playIid;
      const playable = !this.busy && this.actions.some((a) => a.kind === 'play' && a.card === c.name);
      const tag = cycling && this.cycleSet.includes(c.iid) ? 'DISCARD' : marked.has(c.iid) ? 'BURN' : isSel && this.sel ? 'PLAYING' : awaiting ? 'BURN?' : null;
      const outer = this.add.container(cx, cy);
      const inner = makeCard(this, { def, key: String(i + 1), signal, selected: isSel, playable: playable || cycling || awaiting || marked.has(c.iid), tag, focus: false });
      inner.y = isSel || marked.has(c.iid) ? -28 : 0;
      outer.add(inner);
      outer.setSize(CARD_W, CARD_H);
      outer.setInteractive({ useHandCursor: true });
      outer.on('pointerover', () => {
        if (!isSel && !marked.has(c.iid)) this.tweens.add({ targets: inner, y: -14, duration: this.anim(100) });
        this.showTip(root, c.name, c.iid, cx, playable);
      });
      outer.on('pointerout', () => {
        if (!isSel && !marked.has(c.iid)) this.tweens.add({ targets: inner, y: 0, duration: this.anim(100) });
        this.tip?.destroy();
        this.tip = null;
      });
      outer.on('pointerup', () => this.selectCard(i));
      root.add(outer);
      this.cardBox.set(c.iid, { x: cx, y: cy - (isSel ? 28 : 0) - CARD_H / 2, w: CARD_W, h: CARD_H });
    });
  }

  /**
   * The squad as a hand of unit cards. Units in reserve are the ones you can play: click one and then a
   * lane, or drag it onto a lane. Units already on the field stay in the row, dimmed, with their lane.
   */
  private drawUnitHand(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const squad = g.units.filter((u) => u.side === 'P' && !u.dead);
    const y = TRAY.y + 8;
    const h = 50;
    const gap = 10;
    const maxW = 1120;
    const w = Math.min(250, Math.floor((maxW - (squad.length - 1) * gap) / Math.max(1, squad.length)));
    const inReserve = squad.filter((u) => u.lane === null && isLive(u)).length;
    root.add(bodyText(this, TRAY.x + 22, y + 12, 'SQUAD', 16, palette.textMuted, { originY: 0.5, spacing: 0.12 }));
    root.add(bodyText(this, TRAY.x + 22, y + 34, inReserve ? `${inReserve} TO DEPLOY` : 'ALL DEPLOYED', 14, inReserve ? signal : palette.textMuted, { originY: 0.5, spacing: 0.08 }));
    const picked = this.sel?.item.kind === 'deploy' ? this.sel.item.unit : null;
    squad.forEach((u, i) => {
      const x = HAND_X0 + i * (w + gap);
      const reserve = u.lane === null && isLive(u);
      const can = reserve && this.actions.some((a) => a.kind === 'deploy' && a.unit === u.id);
      const on = picked === u.id;
      const viewed = !reserve && (this.chosenUnit === u.id || this.viewUnit === u.id);
      const tile = this.add.container(x + w / 2, y + h / 2);
      const gg = this.add.graphics();
      gg.fillStyle(on ? mix(signal, palette.bg, 0.85) : palette.panelDeep, 1);
      gg.fillRect(-w / 2, -h / 2, w, h);
      gg.lineStyle(on ? 4 : can ? 2.5 : viewed ? 2.5 : 1.5, on || can || viewed ? signal : palette.line, 1);
      gg.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      tile.add(gg);
      const tag = u.downed ? 'DOWNED' : reserve ? (can ? 'DEPLOY' : 'WAIT') : `LANE ${u.lane! + 1}`;
      const tagCol = u.downed ? palette.danger : can ? signal : palette.textMuted;
      const tg = bodyText(this, w / 2 - 10, -h / 2 + 15, tag, 14, tagCol, { originX: 1, originY: 0.5, spacing: 0.08 });
      const nm = stencilText(this, -w / 2 + 10, -h / 2 + 4, u.name, 22, reserve || on ? palette.text : palette.textMuted, { spacing: 0.04 });
      const room = w - 20 - tg.width - 8;
      if (nm.width > room) nm.setScale(room / nm.width);
      tile.add([nm, tg]);
      const bar = this.add.graphics();
      drawHpBar(bar, -w / 2 + 10, h / 2 - 17, w - 70, 9, u.hp, u.maxHp);
      tile.add(bar);
      tile.add(bodyText(this, w / 2 - 10, h / 2 - 12, `${u.hp}/${u.maxHp}`, 14, palette.text, { originX: 1, originY: 0.5 }));
      tile.setSize(w, h);
      tile.setAlpha(reserve ? 1 : 0.7);
      tile.setInteractive({ useHandCursor: reserve ? can : true });
      this.bindUnitPointer(root, tile, u, reserve, can, on);
      root.add(tile);
      this.unitTiles.set(u.id, { x, y, w, h });
    });
  }

  /** Click, drag and hover for a unit's tile or card: reserve units deploy, units on the field become the acting unit. */
  private bindUnitPointer(root: Phaser.GameObjects.Container, obj: Phaser.GameObjects.Container, u: Unit, reserve: boolean, can: boolean, on: boolean): void {
    obj.on('pointerover', () => this.showLoadout(root, u));
    obj.on('pointerout', () => this.hideLoadout());
    if (reserve && can) {
      obj.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        this.dragMoved = false;
        this.dragCand = { unit: u.id, x: ptr.x, y: ptr.y };
      });
      obj.on('pointerup', () => {
        if (this.dragMoved || this.busy) return;
        if (on) {
          this.clearSel();
          this.refresh();
        } else this.select({ kind: 'deploy', unit: u.id });
      });
    } else if (!reserve) obj.on('pointerup', () => this.clickFriend(u));
  }

  /** The squad as full cards in the place of the action hand. */
  private drawUnitCards(root: Phaser.GameObjects.Container, signal: number): void {
    const g = this.sim;
    const squad = g.units.filter((u) => u.side === 'P' && !u.dead);
    const n = squad.length;
    const gap = 12;
    const total = n * CARD_W + (n - 1) * gap;
    const x0 = HAND_X0 + (HAND_W - total) / 2;
    const picked = this.sel?.item.kind === 'deploy' ? this.sel.item.unit : null;
    squad.forEach((u, i) => {
      const reserve = u.lane === null && isLive(u);
      const can = reserve && !this.busy && this.actions.some((a) => a.kind === 'deploy' && a.unit === u.id);
      const on = picked === u.id;
      const acting = !reserve && (this.chosenUnit === u.id || this.viewUnit === u.id);
      const state = u.downed ? 'DOWNED' : on ? 'PICK A LANE' : can ? 'CLICK TO DEPLOY' : reserve ? 'WAITING' : `LANE ${u.lane! + 1}`;
      const cx = x0 + i * (CARD_W + gap) + CARD_W / 2;
      const cy = CARD_TOP + CARD_H / 2;
      const outer = this.add.container(cx, cy);
      const inner = makeUnitCard(this, { unit: u, signal, ready: can || acting, selected: on, state });
      inner.y = on ? -28 : 0;
      outer.add(inner);
      outer.setSize(CARD_W, CARD_H);
      outer.setInteractive({ useHandCursor: reserve ? can : true });
      outer.on('pointerover', () => {
        if (!on) this.tweens.add({ targets: inner, y: -14, duration: this.anim(100) });
      });
      outer.on('pointerout', () => {
        if (!on) this.tweens.add({ targets: inner, y: 0, duration: this.anim(100) });
      });
      this.bindUnitPointer(root, outer, u, reserve, can, on);
      root.add(outer);
    });
  }

  private hideLoadout(): void {
    this.loadoutPane?.destroy();
    this.loadoutPane = null;
  }

  /** Hovering a unit shows its whole loadout where the acting unit panel is, until the pointer leaves. */
  private showLoadout(root: Phaser.GameObjects.Container, u: Unit): void {
    this.hideLoadout();
    const signal = this.signal;
    const p = makePanel(this, { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h, bolts: true, scan: true, border: signal, borderWidth: 3 });
    const lamp = this.add.graphics();
    drawLamp(lamp, 24, 22, 7, signal);
    p.add(lamp);
    p.add(bodyText(this, 42, 22, 'UNIT LOADOUT', 16, palette.textMuted, { originY: 0.5, spacing: 0.14 }));
    const W = PANEL.w - 44;
    let y = 42;
    const nm = stencilText(this, 22, y, u.name, 44, palette.text, { spacing: 0.04 });
    if (nm.width > W) nm.setScale(W / nm.width);
    p.add(nm);
    y += nm.height * nm.scaleY;
    const where = u.downed ? 'DOWNED' : u.lane === null ? 'IN RESERVE' : `LANE ${u.lane + 1}`;
    const st: string[] = [];
    if (u.stunned) st.push('STUNNED');
    if (u.exposed) st.push('EXPOSED');
    if (u.suppressed > 0) st.push(`SUPPRESSED ${u.suppressed}`);
    if (u.burning > 0) st.push(`BURNING ${u.burning}`);
    p.add(bodyText(this, 22, y, `${where} · TSC DROID${st.length ? ' · ' + st.join(' · ') : ''}`, 16, st.length || u.downed ? palette.danger : palette.textMuted, { wrap: W }));
    y += 26;
    const bar = this.add.graphics();
    drawHpBar(bar, 22, y, W - 70, 18, u.hp, u.maxHp);
    p.add(bar);
    p.add(bodyText(this, 22 + W, y + 9, `${u.hp}/${u.maxHp}`, 19, palette.text, { originX: 1, originY: 0.5 }));
    y += 28;
    p.add(bodyText(this, 22, y, `SOAK ${u.armor + u.builtin} (ARMOR ${u.armor}/${u.armorMax} + BUILT-IN ${u.builtin})${u.ammoMax > 0 ? `   AMMO ${u.ammo}/${u.ammoMax}` : ''}`, 15, palette.bone, { wrap: W }));
    y += 28;

    // One block per piece of gear: what it does as a basic action, then the cards that need it.
    const lo = loadoutOf(u.gear);
    const limit = PANEL.h - 16;
    const rule = this.add.graphics();
    rule.fillStyle(signal, 1);
    rule.fillRect(22, y, W, 2);
    p.add(rule);
    y += 10;
    const lay = (size: number, dry: boolean, parent: Phaser.GameObjects.Container): number => {
      let yy = y;
      for (const e of lo) {
        if (!dry) {
          parent.add(bodyText(this, 22, yy, e.gear.toUpperCase(), size + 1, palette.text, { spacing: 0.06, weight: '700' }));
          if (e.type) parent.add(bodyText(this, 22 + W, yy + 1, e.type.toUpperCase(), 12, palette.textMuted, { originX: 1, spacing: 0.14 }));
        }
        yy += size + 7;
        for (const a of e.actions) {
          const desc = `${a.dmg} damage to ${a.targets > 1 ? `up to ${a.targets} units` : 'one unit'}. Costs ${a.fuel} fuel${a.ammo ? ` and ${a.ammo} ammo` : ''}.`;
          yy += flowInline(this, parent, 34, yy, W - 12, a.name, desc, size, signal, palette.text, { dry }).height + 2;
        }
        for (const d of e.cards) {
          const desc = `${d.text.charAt(0).toUpperCase()}${d.text.slice(1)}.${d.playFuel ? ` Costs ${d.playFuel} fuel.` : ''}${d.ammoCost ? ` Uses ${d.ammoCost} ammo.` : ''}`;
          yy += flowInline(this, parent, 34, yy, W - 12, d.name, desc, size, palette.bone, palette.textMuted, { dry }).height + 2;
        }
        yy += 6;
      }
      return yy;
    };
    let size = 16;
    while (size > 12 && lay(size, true, p) > limit) size -= 1;
    lay(size, false, p);
    root.add(p);
    this.loadoutPane = p;
  }

  private showTip(root: Phaser.GameObjects.Container, name: string, iid: number, cx: number, playable: boolean): void {
    const def = cardDefs[name]!;
    this.tip?.destroy();
    const w = 420;
    const lines = [`${def.sourceType.toUpperCase()} · ${def.source}`, def.text, `BURN VALUE ${def.fuelValue} FUEL`];
    const c = this.add.container(0, 0);
    const title = stencilText(this, 18, 12, def.name, 34, palette.text);
    const body = bodyText(this, 18, 58, lines[0]! + '\n' + lines[1]!, 18, palette.text, { wrap: w - 36, lineSpacing: 6 });
    const foot = bodyText(this, 18, 0, lines[2]!, 16, palette.textMuted, { spacing: 0.06 });
    const cost = [def.playFuel ? `PLAY COST ${def.playFuel} FUEL` : '', def.ammoCost ? `${def.ammoCost} AMMO` : ''].filter(Boolean).join(' · ');
    const reason = playable ? '' : this.reasonFor(name, iid).toUpperCase();
    const extra = [cost, reason].filter(Boolean).join('\n');
    const ex = bodyText(this, 18, 0, extra, 16, reason ? palette.danger : palette.text, { wrap: w - 36 });
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
    p.add(bodyText(this, 42, 22, 'ACTING UNIT', 16, palette.textMuted, { originY: 0.5, spacing: 0.14 }));

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
      const t = bodyText(this, 22, y, str, size, color, extra.wrap === false ? {} : { wrap: W });
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
      p.add(bodyText(this, 22 + W, y + 10, `${unit.hp}/${unit.maxHp}`, 20, palette.text, { originX: 1, originY: 0.5 }));
      y += 34;
      line(`SOAK ${unit.armor + unit.builtin} (ARMOR ${unit.armor}/${unit.armorMax} + BUILT-IN ${unit.builtin})`, 16, palette.bone, 4);
      if (unit.ammoMax > 0) line(`AMMO ${unit.ammo}/${unit.ammoMax}`, 16, palette.bone, 4);
      const st: string[] = [];
      if (unit.downed) st.push('DOWNED');
      if (unit.stunned) st.push('STUNNED');
      if (unit.exposed) st.push('EXPOSED');
      if (unit.suppressed > 0) st.push(`SUPPRESSED ${unit.suppressed}`);
      if (unit.burning > 0) st.push(`BURNING ${unit.burning}`);
      if (unit.charging) st.push('WINDING UP');
      if (unit.counter) st.push('COUNTER READY');
      if (unit.sight) st.push('SIGHT ALIGNED');
      line(st.length ? st.join(' · ') : 'NO STATUS', 16, st.length ? palette.danger : palette.textMuted, 12);
    } else {
      line('NO UNIT DEPLOYED YET', 18, palette.textMuted, 12);
    }

    // Fuel pips: fuel the hand can pay. Cards marked to burn fill red; the rest of the pending cost is outlined.
    const need = this.fuelNeed();
    const have = this.burnValue(this.burn);
    const fuelHand = g.hand.reduce((s2, c) => s2 + (cardDefs[c.name]?.fuelValue ?? 1), 0);
    line(`FUEL IN HAND ${fuelHand}${need > 0 ? ` · COST ${need} · BURNING ${Math.min(have, need)}` : ''}`, 16, palette.textMuted, 4);
    const pips = this.add.graphics();
    for (let i = 0; i < Math.min(fuelHand, 18); i++) {
      const px = 30 + i * 20;
      if (i < Math.min(have, need)) {
        pips.fillStyle(palette.danger, 1);
        pips.fillCircle(px, y + 7, 7);
      } else if (i < need) {
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
        const nameT = bodyText(this, -W / 2 + 12, 0, lab.toUpperCase(), 18, palette.text, { originY: 0.5 });
        const costT = bodyText(this, W / 2 - 12, 0, `FUEL ${first.fuel}${first.ammo ? ` · AMMO ${first.ammo}` : ''}`, 16, palette.textMuted, { originX: 1, originY: 0.5 });
        b.add([nameT, costT]);
        b.setSize(W, bh);
        b.setInteractive({ useHandCursor: true });
        b.on('pointerup', () => (on ? (this.clearSel(), this.refresh()) : this.select({ kind: 'gear', label: lab }, unit.id)));
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
      const t = bodyText(this, 22, y, text, size, palette.text, { wrap: W, lineSpacing: 4 });
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

    // Buttons. Confirm only exists when something is left to confirm: the optional second target or the discard picks.
    const confirmNow = !!this.sel && !!this.step && this.step.step === 'ready' && needsConfirm(this.step, this.sel);
    const bw = (W - 10) / 2;
    const by = PANEL.h - 14 - 46;
    p.add(
      new Button(this, {
        x: 22, y: by, w: bw, h: 46, label: confirmNow ? (this.sel?.item.kind === 'cycle' ? 'Discard' : 'Fire') : 'Cancel', size: 26,
        state: confirmNow || this.sel || this.chosenUnit !== null ? 'live' : 'offline', accent: confirmNow, signal,
        onClick: () => {
          if (confirmNow) this.confirm();
          else {
            this.chosenUnit = null;
            this.clearSel();
            this.refresh();
          }
        }
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
    if (g.result) {
      if (g.result === 'loss') return 'Two of your lanes fell. Retreat.';
      return g.how === 'cleared' ? 'The enemy has nobody left on the board. The fight is won.' : g.how === 'boss' ? 'The boss is down. The fight is won.' : g.how === 'held' ? 'The squad held. The fight is won.' : 'Two enemy lanes are captured. The fight is won.';
    }
    if (this.intro) return 'Rolling for initiative…';
    if (this.busy) return 'Enemy acting…';
    const s = this.step;
    if (!this.sel || !s) {
      if (inSetup(g)) {
        const empty = [0, 1, 2].filter((L) => !g.units.some((u) => u.side === 'P' && u.lane === L)).length;
        return `SETUP: click a unit card in your unit hand, then a lane, or drag the card onto a lane. ${empty} lane${empty === 1 ? '' : 's'} still empty.`;
      }
      if (this.chosenUnit !== null) return `${unitById(g, this.chosenUnit).name} is ready. Pick one of its abilities below, or a card from your hand.`;
      return 'Click a unit to act with it, play a card (1-7), or Cycle (E). Click a unit card in your unit hand to deploy it.';
    }
    if (this.sel.item.kind === 'cycle') {
      return `DISCARD & DRAW: click or press 1-7 to mark up to ${g.scenario.cycleLimit} cards (${this.cycleSet.length} marked), then Discard.`;
    }
    const aid = this.stepActor();
    const what =
      this.sel.item.kind === 'card' ? this.sel.item.name : this.sel.item.kind === 'gear' ? this.sel.item.label : `Deploy ${unitById(g, this.sel.item.unit).name}`;
    const head = `${what}${aid !== null && this.sel.item.kind !== 'deploy' ? ' · ' + unitById(g, aid).name : ''}`;
    const bits: string[] = [head];
    switch (s.step) {
      case 'actor':
        bits.push('WHO USES IT? Click a highlighted unit, or Tab and Enter.');
        break;
      case 'target':
        bits.push(opts.some((o) => o.k === 'target' && o.t.k === 'lane') ? 'PICK A TARGET: click an enemy, or click the lane itself.' : 'PICK A TARGET: click one, or Tab and Enter.');
        break;
      case 'lane':
        bits.push('PICK A LANE: click it, or press 1-3.');
        break;
      case 'variant':
        bits.push('CHOOSE ONE:');
        break;
      case 'ready':
        if (opts.length && focus) bits.push('Click a second target for a second hit, or Fire.');
        break;
      default:
        break;
    }
    const need = this.fuelNeed();
    if (need > 0) {
      const have = this.burnValue(this.burn);
      const names = this.burn.map((id) => g.hand.find((c) => c.iid === id)?.name ?? '?').join(', ');
      if (have >= need) bits.push(`BURNING ${names}.`);
      else {
        const more = need - have;
        bits.push(`BURN ${more} FUEL: click ${more > 1 ? 'cards' : 'a card'} in your hand. B picks for you.${names ? ` Marked: ${names}.` : ''}`);
      }
    }
    return bits.join('\n');
  }

  private drawCables(gfx: Phaser.GameObjects.Graphics, signal: number): void {
    const s = this.step;
    if (!s || !this.sel) return;
    const opts = this.options();
    if (!opts.length || s.step === 'variant' || s.step === 'lane') return;
    let from: { x: number; y: number } | null = null;
    if (this.sel.item.kind === 'card') {
      const iid = this.playIid();
      const b = iid !== undefined ? this.cardBox.get(iid) : undefined;
      if (b) from = { x: b.x + b.w / 2, y: b.y };
    } else if (this.sel.item.kind === 'deploy') {
      const tile = this.unitTiles.get(this.sel.item.unit);
      from = tile ? { x: tile.x + tile.w / 2, y: tile.y } : { x: HAND_X0 + 140, y: TRAY.y + 4 };
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
          const b = this.laneBoxes.get(`${o.t.side}${o.t.lane}`);
          if (b) to = { x: b.x + b.w / 2, y: b.y + 44 };
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
    rows.forEach((l, i) => p.add(bodyText(this, 36, 100 + i * 31, l.length > 80 ? l.slice(0, 77) + '…' : l, 18, i === rows.length - 1 ? palette.text : palette.textMuted)));
    p.add(bodyText(this, w - 36, h - 30, 'L or Esc to close', 16, palette.textMuted, { originX: 1 }));
  }

  // ---------- feedback
  // There is no sound, so every action has to read on screen: who acted, what it hit, how much it did.
  // Everything here draws on the effects layer, which a redraw of the screen does not clear.

  private later(ms: number, fn: () => void): void {
    if (ms <= 0) fn();
    else this.time.delayedCall(this.anim(ms), fn);
  }

  private sideColor(unitId: number | null): number {
    if (unitId === null) return palette.danger;
    const u = this.sim.units.find((x) => x.id === unitId);
    return u && u.side === 'P' ? this.signal : palette.danger;
  }

  private floater(text: string, x: number, y: number, color: number, size = 28, rise = 46, hold = 1100): void {
    const fx = this.fx;
    if (!fx) return;
    const t = bodyText(this, x, y, text, size, color, { originX: 0.5, originY: 0.5, weight: 'bold' });
    t.setStroke(toCss(palette.bg), 7);
    t.setScale(1.45);
    fx.add(t);
    this.tweens.add({ targets: t, scale: 1, duration: this.anim(140), ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - rise, alpha: 0, delay: this.anim(hold * 0.35), duration: this.anim(hold * 0.65), ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  /** A block of color over a box, fading out. `cx, cy` is the centre. */
  private flash(cx: number, cy: number, w: number, h: number, color: number, alpha = 0.5, ms = 380): void {
    const fx = this.fx;
    if (!fx) return;
    const r = this.add.rectangle(cx, cy, w, h, color, alpha);
    fx.add(r);
    this.tweens.add({ targets: r, alpha: 0, duration: this.anim(ms), onComplete: () => r.destroy() });
  }

  private ring(x: number, y: number, color: number, r1 = 64, ms = 340): void {
    const fx = this.fx;
    if (!fx) return;
    const c = this.add.circle(x, y, 10);
    c.setStrokeStyle(5, color, 1);
    fx.add(c);
    this.tweens.add({ targets: c, scale: r1 / 10, alpha: 0, duration: this.anim(ms), ease: 'Quad.easeOut', onComplete: () => c.destroy() });
  }

  private sparks(x: number, y: number, color: number, n: number): void {
    const fx = this.fx;
    if (!fx) return;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.3;
      const d = 34 + (i % 3) * 16;
      const sp = this.add.rectangle(x, y, 9, 4, color, 1);
      sp.setRotation(ang);
      fx.add(sp);
      this.tweens.add({
        targets: sp,
        x: x + Math.cos(ang) * d,
        y: y + Math.sin(ang) * d,
        alpha: 0,
        duration: this.anim(360),
        ease: 'Quad.easeOut',
        onComplete: () => sp.destroy()
      });
    }
  }

  /** Two quick slashes across a plate. */
  private slash(x: number, y: number, w: number, h: number, color: number): void {
    const fx = this.fx;
    if (!fx) return;
    const g = this.add.graphics();
    g.lineStyle(6, color, 1);
    g.lineBetween(x - w * 0.4, y - h * 0.4, x + w * 0.4, y + h * 0.4);
    g.lineBetween(x - w * 0.25, y - h * 0.45, x + w * 0.45, y + h * 0.25);
    fx.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: this.anim(420), onComplete: () => g.destroy() });
  }

  /** A shot: a muzzle ring at the attacker and a bolt that runs to the target. */
  private tracer(from: { x: number; y: number }, to: { x: number; y: number }, color: number, ms: number): void {
    const fx = this.fx;
    if (!fx) return;
    this.ring(from.x, from.y, color, 40, 240);
    const line = this.add.graphics();
    const dot = this.add.circle(from.x, from.y, 8, color, 1);
    fx.add([line, dot]);
    this.tweens.add({
      targets: dot,
      x: to.x,
      y: to.y,
      duration: this.anim(ms),
      ease: 'Quad.easeIn',
      onUpdate: () => {
        line.clear();
        line.lineStyle(5, color, 0.85);
        line.lineBetween(from.x, from.y, dot.x, dot.y);
      },
      onComplete: () => {
        dot.destroy();
        this.tweens.add({ targets: line, alpha: 0, duration: this.anim(160), onComplete: () => line.destroy() });
      }
    });
  }

  /** A melee blow: an outline of the attacker's plate rushes the target and snaps back. */
  private lunge(from: Box, to: { x: number; y: number }, color: number, ms: number): void {
    const fx = this.fx;
    if (!fx) return;
    const ghost = this.add.rectangle(from.x, from.y, from.w, from.h);
    ghost.setStrokeStyle(5, color, 1);
    ghost.setFillStyle(color, 0.18);
    fx.add(ghost);
    this.tweens.add({
      targets: ghost,
      x: from.x + (to.x - from.x) * 0.7,
      y: from.y + (to.y - from.y) * 0.7,
      duration: this.anim(ms * 0.55),
      ease: 'Quad.easeIn',
      yoyo: true,
      hold: this.anim(40),
      onComplete: () => ghost.destroy()
    });
  }

  /** Where an effect aimed at a target lands. */
  private targetPoint(t: Target): { x: number; y: number } | null {
    if (t.k === 'unit') {
      const b = this.pos.get(t.id);
      return b ? { x: b.x, y: b.y } : null;
    }
    const lb = this.laneBoxes.get(`${t.side}${t.lane}`);
    return lb ? { x: lb.x + lb.w / 2, y: lb.y + lb.h / 2 } : null;
  }

  private impact(b: Box, e: Extract<Ev, { t: 'damage' }>): void {
    const lost = e.hp > 0 || e.killed || e.downed;
    const col = lost ? palette.danger : palette.bone;
    this.flash(b.x, b.y, b.w, b.h, col, lost ? 0.6 : 0.35, 460);
    this.sparks(b.x, b.y, col, lost ? 12 : 6);
    if (lost) this.slash(b.x, b.y, b.w, b.h, palette.text);
    if (e.hp > 0) this.floater(`-${e.hp}`, b.x, b.y - 6, palette.danger, 44, 52, 1300);
    if (e.soaked > 0) this.floater(`SOAK ${e.soaked}`, b.x, b.y + (e.hp > 0 ? 30 : -4), palette.bone, 22, 36, 1100);
    if (e.exposed) this.floater('EXPOSED +1', b.x, b.y + 54, palette.danger, 18, 28, 1000);
    if (e.killed) this.floater('KILLED', b.x, b.y - 44, palette.danger, 30, 40, 1500);
    else if (e.downed) this.floater('DOWNED', b.x, b.y - 44, palette.danger, 30, 40, 1500);
    if (e.killed || e.downed) {
      // The plate leaves the board on the next redraw; leave its outline behind to fade.
      const fx = this.fx;
      if (fx) {
        const ghost = this.add.graphics();
        ghost.lineStyle(4, palette.danger, 1);
        ghost.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ghost.lineBetween(b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2);
        ghost.lineBetween(b.x + b.w / 2, b.y - b.h / 2, b.x - b.w / 2, b.y + b.h / 2);
        fx.add(ghost);
        this.tweens.add({ targets: ghost, alpha: 0, duration: this.anim(900), delay: this.anim(200), onComplete: () => ghost.destroy() });
      }
    }
    if (e.killed || e.downed || e.hp >= 3) this.cameras.main.shake(this.anim(170), 0.0045);
    else if (e.hp > 0) this.cameras.main.shake(this.anim(90), 0.0018);
  }

  private laneImpact(e: Extract<Ev, { t: 'laneDamage' }>): void {
    const box = this.laneBoxes.get(`${e.side}${e.lane}`);
    if (!box || e.amount <= 0) return;
    const col = e.side === 'E' ? this.signal : palette.danger;
    this.flash(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h, col, 0.28, 520);
    this.sparks(box.x + box.w / 2, box.y + box.h / 2, col, 10);
    this.floater(`-${e.amount} LANE HP`, box.x + box.w / 2, box.y + 90, col, 38, 46, 1400);
    if (e.captured) {
      this.floater('LANE CAPTURED', box.x + box.w / 2, box.y + 140, col, 30, 30, 1700);
      this.cameras.main.shake(this.anim(220), 0.005);
    }
  }

  /** Play the events since the last redraw, one after another, and note how long they take. */
  private playFx(): void {
    const q = this.fxQueue;
    this.fxQueue = [];
    if (!q.length) {
      this.fxMs = 0;
      return;
    }
    let t = 0;
    let end = 0;
    const at = (fn: () => void): void => {
      this.later(t, fn);
      end = Math.max(end, t);
    };
    for (const e of q) {
      if (e.t === 'played') {
        const b = e.actor !== null ? this.pos.get(e.actor) : undefined;
        if (b && e.card) {
          const name = e.card.toUpperCase();
          at(() => this.floater(name, b.x, b.y - 58, this.signal, 22, 26, 1500));
          t += 140;
        }
      } else if (e.t === 'strike') {
        const from = e.from !== null ? this.pos.get(e.from) : undefined;
        const to = this.targetPoint(e.to);
        if (from && to) {
          const col = this.sideColor(e.from);
          if (e.melee) {
            at(() => this.lunge(from, to, col, 300));
            t += 230;
          } else {
            at(() => this.tracer(from, to, col, 240));
            t += 250;
          }
        }
      } else if (e.t === 'damage') {
        const b = this.pos.get(e.unit);
        if (b) {
          at(() => this.impact(b, e));
          t += 110;
        }
      } else if (e.t === 'laneDamage') {
        at(() => this.laneImpact(e));
        t += 110;
      } else if (e.t === 'heal') {
        const b = this.pos.get(e.unit);
        if (b) at(() => {
          this.flash(b.x, b.y, b.w, b.h, palette.text, 0.3, 420);
          this.floater(`+${e.hp} HP${e.revived ? ' · UP' : ''}`, b.x, b.y, palette.text, 30, 40);
        });
      } else if (e.t === 'soakGain') {
        const b = this.pos.get(e.unit);
        if (b) at(() => this.floater(`+${e.amount} SOAK`, b.x, b.y, palette.bone, 26, 36));
      } else if (e.t === 'ammoGain') {
        const b = this.pos.get(e.unit);
        if (b) at(() => this.floater(`+${e.amount} AMMO`, b.x, b.y, palette.bone, 26, 36));
      } else if (e.t === 'status' && e.on) {
        const b = this.pos.get(e.unit);
        if (b) at(() => this.floater(e.status.toUpperCase(), b.x, b.y + 24, e.status === 'counter' || e.status === 'sight' ? this.signal : palette.danger, 22, 30));
      } else if (e.t === 'intentSkip') {
        const b = this.pos.get(e.unit);
        if (b) at(() => this.floater('LOSES ACTION', b.x, b.y, palette.text, 24, 30));
      } else if (e.t === 'deploy') {
        const b = this.pos.get(e.unit);
        if (b) {
          const col = this.sideColor(e.unit);
          at(() => {
            this.ring(b.x, b.y, col, 90, 420);
            this.flash(b.x, b.y, b.w, b.h, col, 0.35, 520);
            this.floater('DEPLOYED', b.x, b.y - 4, col, 24, 24);
          });
          t += 120;
        }
      } else if (e.t === 'results') {
        at(() => this.floater('RESULTS ' + e.cards.map((v) => `${v} ${band(v)}`).join(' → '), 720, 380, palette.text, 30));
      } else if (e.t === 'draw' && e.reshuffled) {
        at(() => this.floater('RESHUFFLED', 120, CARD_TOP - 10, palette.bone, 22));
      }
    }
    this.fxMs = end + 600;
  }

  // ---------- initiative roll

  private introLayer: Phaser.GameObjects.Container | null = null;

  /** Two results cards turn over: the higher one acts first. Click or press a key to move on. */
  private playIntro(): void {
    const ini = this.initiative;
    if (!this.intro) return;
    // With animation off the roll is just the chip in the top bar.
    if (!ini || session.settings.animSpeed === 0) {
      this.endIntro();
      return;
    }
    const fx = this.ensureFx();
    const layer = this.add.container(0, 0);
    fx.add(layer);
    this.introLayer = layer;
    const sig = this.signal;
    const dim = this.add.rectangle(960, 540, 1920, 1080, palette.bg, 0.9).setInteractive();
    dim.on('pointerup', () => this.endIntro());
    layer.add(dim);
    layer.add(stencilText(this, 960, 150, 'Rolling for initiative', 72, palette.text, { originX: 0.5, spacing: 0.06, fixed: true }));
    layer.add(bodyText(this, 960, 232, 'The higher card acts first. Suits only break a tie.', 22, palette.textMuted, { originX: 0.5 }));

    const W = 250;
    const H = 350;
    const rank = (v: number): string => (v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v));
    const sides = [
      { x: 640, label: 'YOUR SQUAD', d: ini.squad, win: ini.first === 'P' },
      { x: 1280, label: this.sim.scenario.enemyName.toUpperCase(), d: ini.enemy, win: ini.first === 'E' }
    ];
    const cardsAt: Array<{ face: Phaser.GameObjects.Container; back: Phaser.GameObjects.Container; win: boolean }> = [];
    sides.forEach((sd) => {
      layer.add(bodyText(this, sd.x, 300, sd.label, 24, palette.text, { originX: 0.5, spacing: 0.14 }));
      const back = this.add.container(sd.x, 520);
      const bg = this.add.graphics();
      bg.fillStyle(palette.panelDeep, 1);
      bg.fillRect(-W / 2, -H / 2, W, H);
      bg.lineStyle(4, palette.line, 1);
      bg.strokeRect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
      bg.lineStyle(2, palette.lineDim, 1);
      for (let i = -H; i < W; i += 28) bg.lineBetween(-W / 2 + Math.max(0, i), -H / 2 + Math.max(0, -i), -W / 2 + Math.min(W, i + H), -H / 2 + Math.min(H, -i + W));
      back.add(bg);
      const face = this.add.container(sd.x, 520);
      face.setScale(0, 1);
      const fg = this.add.graphics();
      fg.fillStyle(palette.panelRaised, 1);
      fg.fillRect(-W / 2, -H / 2, W, H);
      face.add(fg);
      face.add(stencilText(this, 0, -60, rank(sd.d.value), 150, palette.text, { originX: 0.5, originY: 0.5, fixed: true }));
      const sg = this.add.graphics();
      drawSuit(sg, sd.d.suit, 0, 80, 74, palette.text);
      face.add(sg);
      face.add(bodyText(this, 0, 142, band(sd.d.value), 22, palette.textMuted, { originX: 0.5, originY: 0.5, spacing: 0.18 }));
      layer.add([back, face]);
      cardsAt.push({ face, back, win: sd.win });
    });

    const flip = (i: number): void => {
      const c = cardsAt[i]!;
      this.tweens.add({
        targets: c.back,
        scaleX: 0,
        duration: this.anim(170),
        onComplete: () => {
          c.back.destroy();
          this.tweens.add({ targets: c.face, scaleX: 1, duration: this.anim(170), ease: 'Back.easeOut' });
        }
      });
    };
    const verdict = (): void => {
      cardsAt.forEach((c, i) => {
        const frame = this.add.graphics();
        frame.lineStyle(c.win ? 8 : 3, c.win ? sig : palette.line, 1);
        frame.strokeRect(sides[i]!.x - W / 2 - 4, 520 - H / 2 - 4, W + 8, H + 8);
        layer.add(frame);
        if (!c.win) c.face.setAlpha(0.55);
      });
      const first = ini.first === 'P' ? 'YOUR SQUAD' : this.sim.scenario.enemyName.toUpperCase();
      layer.add(stencilText(this, 960, 760, `${first} ACTS FIRST`, 64, sig, { originX: 0.5, spacing: 0.06, fixed: true }));
      if (ini.squad.value === ini.enemy.value) {
        layer.add(bodyText(this, 960, 860, 'Tied on value: the higher suit wins (spades, hearts, diamonds, clubs).', 22, palette.textMuted, { originX: 0.5 }));
      } else if (ini.first === 'E') {
        layer.add(bodyText(this, 960, 860, 'They get the first move: expect to take the first hit.', 22, palette.textMuted, { originX: 0.5 }));
      }
      layer.add(bodyText(this, 960, 960, 'Click or press any key to continue', 20, palette.textMuted, { originX: 0.5, spacing: 0.1 }));
    };
    // The roll can be skipped at any point, which tears the layer down: late steps must not touch it.
    this.later(450, () => this.intro && flip(0));
    this.later(1050, () => this.intro && flip(1));
    this.later(1650, () => this.intro && verdict());
    this.later(5200, () => this.endIntro());
  }

  private endIntro(): void {
    if (!this.intro) return;
    this.intro = false;
    const layer = this.introLayer;
    this.introLayer = null;
    if (layer) {
      this.tweens.add({ targets: layer, alpha: 0, duration: this.anim(220), onComplete: () => layer.destroy() });
    }
    if (this.sim.first === 'E') {
      this.rebuild();
      this.later(300, () => this.enemyTurn());
    } else {
      this.busy = false;
      this.derive();
      this.autoHand();
      this.rebuild();
    }
  }

  // ---------- drag a unit card onto a lane

  private laneAt(x: number, y: number): number | null {
    if (y < LANE_TOP || y > LANE_BOTTOM) return null;
    for (let L = 0; L < 3; L++) if (x >= LANE_X[L]! && x <= LANE_X[L]! + LANE_W) return L;
    return null;
  }

  private onPointerDown(): void {
    this.dragMoved = false;
  }

  private onPointerMove(ptr: Phaser.Input.Pointer): void {
    if (!this.dragCand || this.busy) return;
    if (!this.dragging) {
      if (!ptr.isDown || Math.hypot(ptr.x - this.dragCand.x, ptr.y - this.dragCand.y) < 12) return;
      this.startDrag(this.dragCand.unit);
      if (!this.dragging) return;
    }
    const d = this.dragging as NonNullable<Combat['dragging']>;
    const r = toRef(this.L, ptr.x, ptr.y);
    d.ghost.setPosition(r.x, r.y);
    d.hi.clear();
    const lane = this.laneAt(r.x, r.y);
    if (lane !== null && this.step?.step === 'lane' && this.step.lanes.includes(lane)) {
      d.hi.lineStyle(7, this.signal, 1);
      d.hi.strokeRect(LANE_X[lane]! + 2, LANE_TOP + 2, LANE_W - 4, LANE_BOTTOM - LANE_TOP - 4);
    }
  }

  private startDrag(unit: number): void {
    this.dragMoved = true;
    // Selecting the unit lights up the lanes it can go to.
    this.select({ kind: 'deploy', unit });
    if (this.busy || this.step?.step !== 'lane') {
      this.dragCand = null;
      return;
    }
    const fx = this.ensureFx();
    const u = unitById(this.sim, unit);
    const ghost = this.add.container(0, 0);
    const gg = this.add.graphics();
    gg.fillStyle(palette.panelRaised, 0.95);
    gg.fillRect(-100, -25, 200, 50);
    gg.lineStyle(4, this.signal, 1);
    gg.strokeRect(-99, -24, 198, 48);
    ghost.add(gg);
    ghost.add(stencilText(this, 0, 0, u.name, 26, palette.text, { originX: 0.5, originY: 0.5 }));
    const hi = this.add.graphics();
    fx.add([hi, ghost]);
    this.dragging = { unit, ghost, hi };
  }

  private onPointerUp(ptr: Phaser.Input.Pointer): void {
    this.dragCand = null;
    const d = this.dragging;
    if (!d) return;
    this.dragging = null;
    d.ghost.destroy();
    d.hi.destroy();
    const r = toRef(this.L, ptr.x, ptr.y);
    const lane = this.laneAt(r.x, r.y);
    // Dropped on a lane it can go to: deploy. Anywhere else the unit stays picked, so clicking a lane still works.
    if (lane !== null && this.step?.step === 'lane' && this.step.lanes.includes(lane)) this.pickOption({ k: 'lane', lane });
    else this.rebuild();
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
    if (this.force) {
      const f = this.force;
      const lines = [
        `${g.round} rounds · ${g.stats.played ?? 0} cards played · ${g.stats.burned ?? 0} burned · ${g.stats.cycled ?? 0} cycled.`,
        downed.length ? `Downed: ${downed.join(', ')}${won ? ' (they get up at 1 HP).' : ' (left behind).'}` : 'Nobody downed.',
        won ? `Reward: ${f.reward.loot} loot draw and ${f.reward.eagles} Eagles (tallied only).` : 'The expedition ends here.'
      ];
      this.modal = new Modal(this, root, {
        title: won ? 'Victory' : 'Retreat',
        body: lines.join('\n'),
        confirmLabel: won ? 'Back to the map' : 'See the summary',
        signal: this.signal,
        onConfirm: () => this.backToMap()
      });
      return;
    }
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
