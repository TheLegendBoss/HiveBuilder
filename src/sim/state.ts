import { shuffleInPlace } from './rng';
import type { CardInst, Ev, Game, Scenario, Side, Target, Unit, UnitTemplate } from './types';

export const RESULT_VALUES = Array.from({ length: 52 }, (_, i) => (i % 13) + 1);

export function makeUnit(g: Game, side: Side, t: UnitTemplate): Unit {
  const ammo = t.ammo ?? 0;
  const u: Unit = {
    id: g.nextId++,
    name: t.name,
    side,
    hp: t.hp,
    maxHp: t.hp,
    builtin: t.builtin,
    armor: t.armor,
    armorMax: t.armor,
    gear: [...t.gear],
    lane: null,
    arrived: 0,
    downed: false,
    dead: false,
    stunned: false,
    exposed: false,
    suppressed: 0,
    burning: 0,
    stunWait: 0,
    charging: null,
    counter: false,
    sight: false,
    ammo,
    ammoMax: ammo,
    pattern: [...(t.pattern ?? [])],
    pi: 0,
    tags: [...(t.tags ?? [])]
  };
  g.units.push(u);
  return u;
}

export interface GameOptions {
  /** squad hit points carried in from the expedition, in squad order; armor, built-in soak and ammo start full */
  squadHp?: number[];
  /** statuses a squad slot starts this fight with (from the aftermath deck) */
  squadFx?: Array<{ suppressed?: number; stunned?: boolean } | null | undefined>;
}

export function createGame(scenario: Scenario, seed: number, opts: GameOptions = {}): Game {
  const g: Game = {
    scenario,
    rng: seed | 0,
    round: 0,
    turn: 'P',
    laneHP: { P: [...scenario.battlefield.laneHp], E: [...scenario.battlefield.laneHp] },
    units: [],
    hand: [],
    deck: [],
    discard: [],
    focus: null,
    sync: [null, null, null],
    bulwark: [null, null, null],
    discount: 0,
    enemyDeck: [],
    enemyStart: [],
    enemyAlso: [],
    eptr: 0,
    results: [...RESULT_VALUES],
    result: null,
    how: null,
    first: 'P',
    nextId: 1,
    nextIid: 1,
    arrivals: 0,
    stats: {}
  };
  scenario.squad.forEach((t, i) => {
    const u = makeUnit(g, 'P', t);
    const hp = opts.squadHp?.[i];
    if (hp !== undefined) u.hp = Math.max(1, Math.min(u.maxHp, hp));
    const fx = opts.squadFx?.[i];
    if (fx?.suppressed) u.suppressed = fx.suppressed;
    if (fx?.stunned) u.stunned = true;
  });
  g.enemyStart = scenario.enemyStart.map((t) => makeUnit(g, 'E', t).id);
  g.enemyAlso = (scenario.enemyAlso ?? []).map((a) => ({ id: makeUnit(g, 'E', a.unit).id, lane: a.lane }));
  g.enemyDeck = scenario.enemyDeck.map((t) => makeUnit(g, 'E', t).id);
  for (const d of scenario.deck) {
    for (let i = 0; i < d.count; i++) g.deck.push({ iid: g.nextIid++, name: d.name });
  }
  shuffleInPlace(g.deck, g);
  shuffleInPlace(g.results, g);
  return g;
}

export function bump(g: Game, key: string, n = 1): void {
  g.stats[key] = (g.stats[key] ?? 0) + n;
}

export function unitById(g: Game, id: number): Unit {
  const u = g.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
}

export const isLive = (u: Unit): boolean => !u.downed && !u.dead;

/** Units standing in a lane in the order they arrived. Live only unless told otherwise. */
export function inLane(g: Game, side: Side, lane: number, liveOnly = true): Unit[] {
  return g.units
    .filter((u) => u.side === side && u.lane === lane && !u.dead && (!liveOnly || !u.downed))
    .sort((a, b) => a.arrived - b.arrived);
}

/** Bodies that count against the lane cap (downed bodies stay). */
export function bodiesInLane(g: Game, side: Side, lane: number): number {
  return g.units.filter((u) => u.side === side && u.lane === lane && !u.dead).length;
}

export function laneHasRoom(g: Game, side: Side, lane: number): boolean {
  const cap = g.scenario.laneCap;
  return cap === null || bodiesInLane(g, side, lane) < cap;
}

export function adjacent(lane: number): number[] {
  return lane === 1 ? [0, 2] : [1];
}

export function capturedCount(g: Game, side: Side): number {
  return g.laneHP[side].filter((h) => h === 0).length;
}

/** Lanes a unit of this side can attack: its own, plus neighbours once the opposing lane is captured. */
export function attackLanes(g: Game, u: Unit): number[] {
  const lane = u.lane!;
  const foe: Side = u.side === 'P' ? 'E' : 'P';
  return g.laneHP[foe][lane] === 0 ? [lane, ...adjacent(lane)] : [lane];
}

export function totalSoakHp(u: Unit): number {
  return u.hp + u.armor + u.builtin;
}

export function unitTarget(u: Unit): Target {
  return { k: 'unit', id: u.id };
}

export function laneTarget(side: Side, lane: number): Target {
  return { k: 'lane', side, lane };
}

export function targetKey(t: Target): string {
  return t.k === 'unit' ? `u${t.id}` : `l${t.side}${t.lane}`;
}

/** Soak order: armor, then built-in soak, then HP. Exposed adds 1 to the hit. */
export function hitUnit(u: Unit, damage: number, ev: Ev[]): void {
  let d = damage;
  let exposed = false;
  if (u.exposed && d > 0) {
    d += 1;
    u.exposed = false;
    exposed = true;
    ev.push({ t: 'status', unit: u.id, status: 'exposed', on: false });
  }
  const a = Math.min(u.armor, d);
  u.armor -= a;
  d -= a;
  const b = Math.min(u.builtin, d);
  u.builtin -= b;
  d -= b;
  const hpLost = Math.min(u.hp, d);
  u.hp -= hpLost;
  let downed = false;
  let killed = false;
  if (u.hp <= 0 && !u.downed && !u.dead) {
    u.hp = 0;
    if (u.side === 'P') {
      u.downed = true;
      downed = true;
    } else {
      u.dead = true;
      killed = true;
    }
  }
  ev.push({ t: 'damage', unit: u.id, hp: hpLost, soaked: a + b, downed, killed, exposed });
}

export function hitLane(g: Game, side: Side, lane: number, damage: number, ev: Ev[]): void {
  const before = g.laneHP[side][lane]!;
  const after = Math.max(0, before - damage);
  g.laneHP[side][lane] = after;
  ev.push({ t: 'laneDamage', side, lane, amount: before - after, captured: before > 0 && after === 0 });
}

export function deployUnit(g: Game, u: Unit, lane: number, ev: Ev[]): void {
  u.lane = lane;
  u.arrived = ++g.arrivals;
  ev.push({ t: 'deploy', unit: u.id, lane });
}

/** Draw up to hand size, reshuffling the discard pile into the deck when it runs out. */
export function drawUp(g: Game, ev: Ev[]): void {
  let drawn = 0;
  let reshuffled = false;
  while (g.hand.length < g.scenario.handSize) {
    if (g.deck.length === 0) {
      if (g.discard.length === 0) break;
      g.deck = g.discard;
      g.discard = [];
      shuffleInPlace(g.deck, g);
      reshuffled = true;
      bump(g, 'reshuffles');
    }
    g.hand.push(g.deck.pop() as CardInst);
    drawn++;
  }
  if (drawn > 0 || reshuffled) ev.push({ t: 'draw', count: drawn, reshuffled });
}

/** A leader dying takes its followers with it (the Brood Queen and her Rats). */
function reapLinked(g: Game, ev: Ev[]): void {
  for (const link of g.scenario.linked ?? []) {
    const leaders = g.units.filter((u) => u.side === 'E' && u.tags.includes(link.leader));
    if (leaders.length === 0 || leaders.some((u) => !u.dead)) continue;
    for (const f of g.units.filter((u) => u.side === 'E' && !u.dead && u.tags.includes(link.followers))) {
      f.dead = true;
      f.hp = 0;
      ev.push({ t: 'damage', unit: f.id, hp: 0, soaked: 0, downed: false, killed: true, exposed: false });
    }
  }
}

/** Is any enemy on the board, or still due to take its setup deployment? Reserve units only come in through a rally, so they do not count. */
export function enemyHasForces(g: Game): boolean {
  const startIds = new Set([...g.enemyStart, ...g.enemyAlso.map((a) => a.id)]);
  return g.units.some((u) => u.side === 'E' && !u.dead && (u.lane !== null || startIds.has(u.id)));
}

export function checkResult(g: Game, ev: Ev[]): void {
  if (g.result) return;
  reapLinked(g, ev);
  let result: 'win' | 'loss' | null = null;
  let how: Game['how'] = null;
  if (capturedCount(g, 'E') >= 2) {
    result = 'win';
    how = 'lanes';
  } else if (capturedCount(g, 'P') >= 2) result = 'loss';
  const boss = g.scenario.bossTag;
  if (!result && boss) {
    const mine = g.units.filter((u) => u.side === 'E' && u.tags.includes(boss));
    if (mine.length > 0 && mine.every((u) => u.dead)) {
      result = 'win';
      how = 'boss';
    }
  }
  // Nobody left on their side and nobody due to arrive: the fight is over. Lane HP only matters while someone stands in the way.
  if (!result && !inSetup(g) && !enemyHasForces(g)) {
    result = 'win';
    how = 'cleared';
  }
  if (result) {
    g.result = result;
    g.how = how;
    ev.push({ t: 'result', result });
  }
}

/** Close a full round: timers count down, burning ticks, and a hold-out scenario may end. */
export function closeRound(g: Game, ev: Ev[]): void {
  endRound(g, ev);
  checkResult(g, ev);
  const hold = g.scenario.surviveRounds;
  if (!g.result && hold !== undefined && g.round >= g.scenario.setupRounds + hold) {
    g.result = 'win';
    g.how = 'held';
    ev.push({ t: 'log', text: 'The reactor shuts down. The squad held.' });
    ev.push({ t: 'result', result: 'win' });
  }
}

/** End of a full round: timers count down, Counter wears off. */
export function endRound(g: Game, ev: Ev[]): void {
  for (const u of g.units) {
    if (u.burning > 0 && !u.dead && !u.downed) {
      ev.push({ t: 'log', text: `${u.name} burns for 1` });
      hitUnit(u, 1, ev);
      u.burning -= 1;
      if (u.burning === 0 || u.dead || u.downed) {
        u.burning = 0;
        ev.push({ t: 'status', unit: u.id, status: 'burning', on: false });
      }
    }
    if (u.side === 'P' && u.stunned) {
      if (u.stunWait > 0) u.stunWait -= 1;
      else {
        u.stunned = false;
        ev.push({ t: 'status', unit: u.id, status: 'stunned', on: false });
      }
    }
    if (u.suppressed > 0) {
      u.suppressed -= 1;
      if (u.suppressed === 0) ev.push({ t: 'status', unit: u.id, status: 'suppressed', on: false });
    }
    if (u.counter) {
      u.counter = false;
      ev.push({ t: 'status', unit: u.id, status: 'counter', on: false });
    }
  }
}

export function inSetup(g: Game): boolean {
  return g.round <= g.scenario.setupRounds;
}
