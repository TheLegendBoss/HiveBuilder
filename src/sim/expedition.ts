import type { RarityId } from '../data/palette';
import { rollRarities } from './packs';
import { nextRandom, shuffleInPlace } from './rng';
import type { Attr, UnitTemplate } from './types';

export type RoomType = 'Fight' | 'Scavenge' | 'Gamble' | 'Hazard' | 'Market' | 'Rest' | 'Clinic' | 'Gate' | 'Control';
export const ROOM_TYPES: RoomType[] = ['Fight', 'Scavenge', 'Gamble', 'Hazard', 'Market', 'Rest', 'Clinic', 'Gate', 'Control'];

/** What a section is for. Each function has one control room, and winning it is how a section is taken. */
export type SectionFn = 'power' | 'industrial' | 'supply' | 'secure' | 'medical';
export const SECTION_FNS: SectionFn[] = ['power', 'industrial', 'supply', 'secure', 'medical'];

/** What a first capture pays: loot draws, optionally from one kind of item. */
export type LootPick = 'any' | 'gear' | 'supply' | 'medical';

export interface ControlDef {
  fn: SectionFn;
  /** the room's name */
  room: string;
  /** a boss fight, or a locked door that needs the Storehouse key */
  challenge: 'fight' | 'key';
  forceId?: string;
  reward: { loot: number; pick: LootPick; note: string };
}

/** A control room the squad has won this run. It only counts if the squad gets home. */
export interface Capture {
  fn: SectionFn;
  section: number;
  tier: number;
  /** rooms in the section when it fell: sets the power cost to claim it */
  rooms: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  type: RoomType;
  /** ids of the rooms this one has a door to */
  links: number[];
  /** the player has stood here, so its own exits are known */
  entered: boolean;
  /** nothing left to do here (fought, looted, used) */
  cleared: boolean;
  /** the section's way in; a free checkpoint */
  entrance: boolean;
  /** Fight rooms: the force drawn on first entry */
  force: string | null;
  /** how many doors the exit draw gave this room (known once entered) */
  exits: number | null;
  /** Gamble rooms: the card drawn on first entry */
  gamble: number | null;
  /** Control rooms: which section function this is the control room of */
  control?: SectionFn | null;
  /** Hazard rooms: the card drawn on first entry */
  hazard?: number | null;
}

/** A Hazard card: one attribute test, either a guarded room with a reward or an obstacle that blocks the way. */
export interface HazardDef {
  id: number;
  name: string;
  attr: Attr;
  kind: 'obstacle' | 'guarded';
  blurb: string;
}

/** A loot card. `use` marks a consumable that works on the map. */
export interface LootItem {
  id: number;
  name: string;
  cls: string;
  text: string;
  use: { kind: 'rations' | 'heal'; amount: number } | null;
  /** from a pack roll; missing means Basic (white). Rarity is shown but does not change the stats yet. */
  rarity?: RarityId;
}

export type StakeKind = 'eagles' | 'rations';
export type RewardKind = 'eagles' | 'loot' | 'rations' | 'xp';

export interface GambleDef {
  id: number;
  name: string;
  stake: StakeKind;
  reward: RewardKind;
  blurb: string;
}

/** What a gamble card prints at one tier: the stake and the three rungs. */
export interface Ladder {
  stake: number;
  rungs: [number, number, number];
}

export interface ExpeditionConfig {
  seed: number;
  squad: UnitTemplate[];
  /** one card per entry; shuffled fresh for each section */
  roomDeck: RoomType[];
  /** ids of the forces a Fight room can draw */
  forceIds: string[];
  /** sections in this floor */
  sections: number;
  /** the depth dial: the tier of section 0 (default 1) and sections per tier step (default 2) */
  startTier?: number;
  ramp?: number;
  rations: number;
  /** HP a Clinic restores across the squad */
  clinicHeal: number;
  startEagles: number;
  /** the loot deck is this pool, shuffled; drawn without replacement */
  lootPool: LootItem[];
  /** most items the squad can carry */
  packSize: number;
  /** items already in the pack when the squad leaves (from the HQ stash) */
  startPack?: LootItem[];
  gambles: GambleDef[];
  hazards?: HazardDef[];
  /** the test threshold at each tier as a low and a high end */
  hazardNeeds?: Array<[number, number]>;
  /** HP a Rest room restores across the squad */
  restHeal?: number;
  /** ladders[gamble id][tier - 1] */
  ladders: Record<number, Ladder[]>;
  /** Market: Eagles for a pack of loot draws, and what a spare item sells for */
  packPrice: number;
  packDraws: number;
  sellValue: number;
  /** the control rooms this floor can hold, and where the section functions start in the cycle */
  controlRooms?: ControlDef[];
  fnOffset?: number;
  /** functions already taken in earlier runs: their sections have no control room */
  skipFns?: SectionFn[];
  /** statuses each squad slot starts its first fight with */
  startFx?: Array<FightFx | null>;
}

export interface FightFx {
  suppressed?: number;
  stunned?: boolean;
}

export type ExpStatus = 'running' | 'done' | 'retreated' | 'wiped';

export type Band = 'low' | 'mid' | 'high';

export interface GamblePending {
  kind: 'gamble';
  room: number;
  def: GambleDef;
  ladder: Ladder;
  /** offer: not committed; live: stake paid, drawing; over: result shown, waiting to close */
  stage: 'offer' | 'live' | 'over';
  /** rungs climbed so far, 0 to 3 */
  rung: number;
  last: { card: number; band: Band } | null;
  outcome: string | null;
  owedLoot: number;
}

export interface HazardPending {
  kind: 'hazard';
  room: number;
  def: HazardDef;
  /** the number to reach */
  need: number;
  /** the squad's best rating in this attribute */
  rating: number;
  /** offer: not tried; short: tried and fell short, can push; over: finished */
  stage: 'offer' | 'short' | 'over';
  /** the results card drawn and the bonus it gave (low +0, mid +1, high +2) */
  roll: { card: number; bonus: number } | null;
  /** rations spent pushing */
  pushed: number;
  passed: boolean;
  outcome: string | null;
}

export type Pending =
  | { kind: 'fight'; room: number; force: string; step: number; control?: SectionFn }
  | { kind: 'control'; room: number; fn: SectionFn }
  | { kind: 'gate'; room: number }
  | { kind: 'loot'; offers: LootItem[]; from: string; back?: Pending }
  | { kind: 'market'; room: number }
  | GamblePending
  | HazardPending;

export interface ExpStats {
  moves: number;
  fights: number;
  rooms: number;
  sections: number;
  /** Eagles earned over the run (the purse is `Expedition.eagles`) */
  eagles: number;
  /** loot draws made */
  loot: number;
  starved: number;
  xp: number;
}

export interface Expedition {
  cfg: ExpeditionConfig;
  rng: number;
  /** current HP per squad slot, never below 1 between fights */
  hp: number[];
  rations: number;
  /** the purse */
  eagles: number;
  pack: LootItem[];
  /** XP every squad member has earned so far, from fights won */
  xpEach: number;
  /** per squad slot: fights that slot ended downed (each one draws from the aftermath deck at home) */
  downs: number[];
  lootDeck: LootItem[];
  section: number;
  rooms: Room[];
  at: number;
  /** the room the squad stood in before the last move (a turned-back test steps back here) */
  prev?: number;
  /** room cards left for this section */
  deck: RoomType[];
  /** the results deck the exit draws come off, top at the end */
  results: number[];
  status: ExpStatus;
  /** control rooms won so far */
  captures: Capture[];
  /** this section has already dropped its Storehouse key */
  keyDropped: boolean;
  /** statuses each squad slot still owes its first fight; cleared once that fight starts */
  fx: Array<FightFx | null>;
  /** a retreat that was not made from a checkpoint */
  groundLost: boolean;
  pending: Pending | null;
  log: string[];
  stats: ExpStats;
}

/** XP each member earns for a won fight: threat 1 (every force so far is a patrol) times the fight's tier. Working. */
export const fightXp = (step: number): number => step + 1;

export const MAX_DOORS = 3;
const DIRS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/** chance a door aimed at an existing, unconnected room joins up with it */
const CONNECT_CHANCE = 0.5;

/** Two sections per tier step, capped at tier 8. Sections count from 0. */
export const tierOf = (section: number): number => Math.min(8, 1 + Math.floor(section / 2));

/** The tier of a section under this expedition's depth dial. */
export const tierAt = (cfg: Pick<ExpeditionConfig, 'startTier' | 'ramp'>, section: number): number =>
  Math.min(8, Math.max(1, (cfg.startTier ?? 1) + Math.floor(section / Math.max(1, cfg.ramp ?? 2))));

/** The function of a section: the five cycle in order from a seeded starting point. */
export const sectionFn = (cfg: Pick<ExpeditionConfig, 'fnOffset'>, section: number): SectionFn =>
  SECTION_FNS[(section + (cfg.fnOffset ?? 0)) % SECTION_FNS.length]!;

const controlOf = (x: Expedition, fn: SectionFn): ControlDef | undefined => x.cfg.controlRooms?.find((c) => c.fn === fn);

/** Low (ace to 5) gives 1 door, mid (6 to 9) gives 2, high (10 to king) gives 3. */
export const doorsFor = (card: number): number => (card <= 5 ? 1 : card <= 9 ? 2 : 3);

const say = (x: Expedition, text: string): void => {
  x.log.push(text);
};

export function createExpedition(cfg: ExpeditionConfig): Expedition {
  const x: Expedition = {
    cfg,
    rng: cfg.seed | 0,
    hp: cfg.squad.map((u) => u.hp),
    rations: cfg.rations,
    eagles: cfg.startEagles,
    pack: (cfg.startPack ?? []).slice(0, cfg.packSize),
    xpEach: 0,
    downs: cfg.squad.map(() => 0),
    lootDeck: [],
    section: 0,
    rooms: [],
    at: 0,
    deck: [],
    results: Array.from({ length: 52 }, (_, i) => (i % 13) + 1),
    status: 'running',
    captures: [],
    keyDropped: false,
    fx: cfg.squad.map((_, i) => cfg.startFx?.[i] ?? null),
    groundLost: false,
    pending: null,
    log: [],
    stats: { moves: 0, fights: 0, rooms: 0, sections: 0, eagles: 0, loot: 0, starved: 0, xp: 0 }
  };
  shuffleInPlace(x.results, x);
  startSection(x);
  return x;
}

function drawResult(x: Expedition): number {
  if (x.results.length === 0) {
    x.results = Array.from({ length: 52 }, (_, i) => (i % 13) + 1);
    shuffleInPlace(x.results, x);
  }
  return x.results.pop() as number;
}

function startSection(x: Expedition): void {
  x.rooms = [];
  x.deck = [...x.cfg.roomDeck];
  shuffleInPlace(x.deck, x);
  x.keyDropped = false;
  // The section's control room is one card shuffled into the next few draws, so it is findable without being on the first door.
  const fn = sectionFn(x.cfg, x.section);
  if (controlOf(x, fn) && !x.cfg.skipFns?.includes(fn) && !x.captures.some((c) => c.fn === fn)) {
    const from = Math.min(x.deck.length, 3 + Math.floor(nextRandom(x) * 6));
    x.deck.splice(x.deck.length - from, 0, 'Control');
  }
  const origin: Room = {
    id: 0, x: 0, y: 0, type: 'Gate', links: [], entered: true, cleared: true, entrance: true, force: null, exits: null, gamble: null, control: null, hazard: null
  };
  x.rooms.push(origin);
  x.at = 0;
  x.pending = null;
  say(x, `Section ${x.section + 1} of ${x.cfg.sections}, tier ${tierAt(x.cfg, x.section)}`);
  openExits(x, origin);
}

const roomAt = (x: Expedition, px: number, py: number): Room | undefined => x.rooms.find((r) => r.x === px && r.y === py);

const isExitGate = (r: Room): boolean => r.type === 'Gate' && !r.entrance;

function link(a: Room, b: Room): void {
  a.links.push(b.id);
  b.links.push(a.id);
}

/** Draw the next room card into the cell beside `room`. False when the deck is empty (the door is sealed). */
function spawn(x: Expedition, room: Room, dx: number, dy: number): boolean {
  const type = x.deck.pop();
  if (type === undefined) return false;
  const next: Room = {
    id: x.rooms.length, x: room.x + dx, y: room.y + dy, type, links: [], entered: false, cleared: false, entrance: false, force: null, exits: null, gamble: null, hazard: null,
    control: type === 'Control' ? sectionFn(x.cfg, x.section) : null
  };
  x.rooms.push(next);
  link(room, next);
  return true;
}

/** Roll a room's doors and build whatever the roll asks for. Runs once, when the squad first enters. */
function openExits(x: Expedition, room: Room): void {
  const card = drawResult(x);
  let want = Math.max(doorsFor(card), room.links.length);
  want = Math.min(want, MAX_DOORS);
  let need = want - room.links.length;
  // A section must not seal itself before it shows a way onward.
  const starved = !x.rooms.some((r) => !r.entered) && !x.rooms.some(isExitGate);
  let forced = starved && need < 1 && room.links.length < MAX_DOORS;
  if (forced) need = 1;
  const dirs = [...DIRS];
  shuffleInPlace(dirs, x);
  for (const [dx, dy] of dirs) {
    if (need <= 0) break;
    const there = roomAt(x, room.x + dx, room.y + dy);
    if (there) {
      if (room.links.includes(there.id) || there.links.length >= MAX_DOORS || starved) continue;
      if (nextRandom(x) < CONNECT_CHANCE) {
        link(room, there);
        need--;
      }
      continue;
    }
    if (!spawn(x, room, dx, dy)) break;
    need--;
  }
  // The roll may have gone nowhere (every door joined an old room or was declined). Still no way onward: build one,
  // from this room if it has a free side, otherwise from the nearest earlier room that does.
  if (!x.rooms.some((r) => !r.entered) && !x.rooms.some(isExitGate)) {
    const hosts = [room, ...x.rooms.filter((r) => r.entered && r.id !== room.id).reverse()];
    outer: for (const host of hosts) {
      if (host.links.length >= MAX_DOORS) continue;
      for (const [dx, dy] of dirs) {
        if (roomAt(x, host.x + dx, host.y + dy)) continue;
        if (spawn(x, host, dx, dy)) {
          forced = true;
          break outer;
        }
      }
    }
  }
  room.exits = room.links.length;
  say(x, `Exit draw ${card}: ${room.links.length} door${room.links.length === 1 ? '' : 's'}${forced ? ' (one forced, no way onward yet)' : ''}`);
}

export const currentRoom = (x: Expedition): Room => x.rooms[x.at]!;

/** Rooms the squad can walk to from here. Nothing while a fight or gate choice is waiting. */
export function moves(x: Expedition): Room[] {
  if (x.status !== 'running' || x.pending) return [];
  return currentRoom(x).links.map((id) => x.rooms[id]!);
}

export interface MoveResult {
  room: Room;
  pending: Pending | null;
  note: string;
}

/** Spread healing a point at a time onto whoever is lowest compared with their maximum. */
export function healSquad(x: Expedition, amount: number): number {
  let healed = 0;
  for (let i = 0; i < amount; i++) {
    let best = -1;
    let bestRatio = 2;
    x.hp.forEach((h, k) => {
      const max = x.cfg.squad[k]!.hp;
      if (h >= max) return;
      const ratio = h / max;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = k;
      }
    });
    if (best < 0) break;
    x.hp[best] = x.hp[best]! + 1;
    healed++;
  }
  return healed;
}

/** Walk to a neighbouring room. Costs a ration; at zero rations every squad member loses 1 HP instead (never below 1). */
export function move(x: Expedition, id: number): MoveResult {
  if (x.status !== 'running') throw new Error('expedition is over');
  if (x.pending) throw new Error('resolve the pending room first');
  const here = currentRoom(x);
  if (!here.links.includes(id)) throw new Error(`room ${id} is not next to room ${here.id}`);
  x.stats.moves++;
  if (x.rations > 0) x.rations--;
  else {
    x.stats.starved++;
    x.hp = x.hp.map((h) => Math.max(1, h - 1));
    say(x, 'Out of rations: the squad loses 1 HP each');
  }
  x.prev = x.at;
  x.at = id;
  const room = currentRoom(x);
  if (!room.entered) {
    room.entered = true;
    x.stats.rooms++;
    openExits(x, room);
  }
  return { room, pending: x.pending, note: resolveRoom(x, room) };
}

function resolveRoom(x: Expedition, room: Room): string {
  if (room.entrance) return 'Back at the section entrance';
  if (room.cleared) return `${room.type} room, already dealt with`;
  switch (room.type) {
    case 'Fight': {
      if (room.force === null) {
        const ids = x.cfg.forceIds;
        room.force = ids[Math.floor(nextRandom(x) * ids.length)]!;
      }
      x.pending = { kind: 'fight', room: room.id, force: room.force, step: tierAt(x.cfg, x.section) - 1 };
      return 'Contact';
    }
    case 'Gate':
      x.pending = { kind: 'gate', room: room.id };
      return x.section + 1 >= x.cfg.sections ? 'The way out of the floor' : 'A way on to the next section';
    case 'Clinic': {
      const n = healSquad(x, x.cfg.clinicHeal);
      room.cleared = true;
      say(x, `Clinic restores ${n} HP across the squad`);
      return `Clinic: ${n} HP restored`;
    }
    case 'Scavenge':
      room.cleared = true;
      queueLoot(x, 1, 'Scavenge');
      dropKey(x);
      return 'Scavenge: one loot draw';
    case 'Control': {
      const def = controlOf(x, room.control ?? sectionFn(x.cfg, x.section));
      if (!def) {
        room.cleared = true;
        return 'An empty control room';
      }
      if (def.challenge === 'fight') {
        x.pending = { kind: 'fight', room: room.id, force: def.forceId!, step: tierAt(x.cfg, x.section) - 1, control: def.fn };
        return `${def.room}: contact`;
      }
      x.pending = { kind: 'control', room: room.id, fn: def.fn };
      return `${def.room}: the door is locked`;
    }
    case 'Gamble': {
      if (room.gamble === null) room.gamble = x.cfg.gambles[Math.floor(nextRandom(x) * x.cfg.gambles.length)]!.id;
      const def = x.cfg.gambles.find((g) => g.id === room.gamble)!;
      const ladder = x.cfg.ladders[def.id]![tierAt(x.cfg, x.section) - 1]!;
      x.pending = { kind: 'gamble', room: room.id, def, ladder, stage: 'offer', rung: 0, last: null, outcome: null, owedLoot: 0 };
      return def.name;
    }
    case 'Hazard': {
      const defs = x.cfg.hazards;
      if (!defs?.length) {
        room.cleared = true;
        return 'Hazard: nothing to test here';
      }
      if (room.hazard == null) room.hazard = defs[Math.floor(nextRandom(x) * defs.length)]!.id;
      const def = defs.find((h) => h.id === room.hazard)!;
      const [lo, hi] = x.cfg.hazardNeeds?.[tierAt(x.cfg, x.section) - 1] ?? [5, 6];
      const need = lo + (hi > lo && nextRandom(x) < 0.5 ? 1 : 0);
      x.pending = {
        kind: 'hazard', room: room.id, def, need, rating: hazardRating(x, def.attr), stage: 'offer', roll: null, pushed: 0, passed: false, outcome: null
      };
      return def.name;
    }
    case 'Rest': {
      room.cleared = true;
      const n = healSquad(x, x.cfg.restHeal ?? 2);
      say(x, `Rest: the squad recovers ${n} HP`);
      return `Rest: ${n} HP recovered`;
    }
    case 'Market':
      x.pending = { kind: 'market', room: room.id };
      return 'Market';
  }
}

/**
 * Close a fight. `hpAfter` is each squad slot's HP at the end of the fight; downed members rise at 1.
 * A loss ends the expedition: the squad retreats and the downed are left behind.
 */
export function finishFight(x: Expedition, won: boolean, hpAfter: number[], reward: { eagles: number; loot: number }): void {
  const p = x.pending;
  if (!p || p.kind !== 'fight') throw new Error('no fight pending');
  x.stats.fights++;
  x.pending = null;
  hpAfter.forEach((h, i) => {
    if (h <= 0) x.downs[i] = (x.downs[i] ?? 0) + 1;
  });
  if (!won) {
    x.status = 'wiped';
    x.groundLost = true;
    x.hp = hpAfter.map((h) => Math.max(0, h));
    say(x, 'The enemy overwhelmed two lanes: the squad retreats and the downed are left behind');
    return;
  }
  x.hp = hpAfter.map((h, i) => Math.max(1, Math.min(x.cfg.squad[i]!.hp, h)));
  const room = x.rooms[p.room]!;
  room.cleared = true;
  x.stats.eagles += reward.eagles;
  x.eagles += reward.eagles;
  x.xpEach += fightXp(p.step);
  say(x, `Fight won: ${reward.eagles} Eagles, ${fightXp(p.step)} XP each`);
  const def = p.control ? controlOf(x, p.control) : undefined;
  if (def) {
    capture(x, def, p.room, reward.loot);
    return;
  }
  queueLoot(x, reward.loot, 'Fight');
  dropKey(x);
}

// ---------- control rooms

export const STOREHOUSE_KEY: LootItem = { id: 99, name: 'Storehouse key', cls: 'Key', text: 'Opens the Storehouse in this section. Used up.', use: null };
export const hasKey = (x: Expedition): boolean => x.pack.some((i) => i.id === STOREHOUSE_KEY.id);

/** In a Supply section the first guarded room or scavenge drops the Storehouse key as one more offer. (Working rule.) */
function dropKey(x: Expedition): void {
  if (x.keyDropped || sectionFn(x.cfg, x.section) !== 'supply') return;
  const def = controlOf(x, 'supply');
  if (!def || x.cfg.skipFns?.includes('supply') || x.captures.some((c) => c.fn === 'supply')) return;
  if (x.pending?.kind !== 'loot') {
    x.pending = { kind: 'loot', offers: [], from: 'Key' };
  }
  x.pending.offers.push({ ...STOREHOUSE_KEY });
  x.keyDropped = true;
  say(x, 'A Storehouse key turns up');
}

const lootFits = (item: LootItem, pick: LootPick): boolean => {
  switch (pick) {
    case 'gear':
      return /^(Melee|Sidearm|Close|Line|Precision|Support|Explosive|Armor|Defense)/.test(item.cls);
    case 'supply':
      return item.cls === 'Supply';
    case 'medical':
      return item.name === 'Healing supplies' || item.name === 'Combat stim' || item.name === 'Field medkit';
    default:
      return true;
  }
};

/** A control room falls: mark it, record the capture, pay the first-capture reward on top of the fight's own loot. */
function capture(x: Expedition, def: ControlDef, roomId: number, fightLoot: number): void {
  const room = x.rooms[roomId]!;
  room.cleared = true;
  x.captures.push({ fn: def.fn, section: x.section, tier: tierAt(x.cfg, x.section), rooms: x.rooms.length });
  say(x, `${def.room} taken. First capture: ${def.reward.note}`);
  queueLoot(x, fightLoot, def.room, undefined, { n: def.reward.loot, pick: def.reward.pick });
}

/** Open the Storehouse with the key. */
export function openStorehouse(x: Expedition): void {
  const p = x.pending;
  if (!p || p.kind !== 'control') throw new Error('no locked door');
  const i = x.pack.findIndex((it) => it.id === STOREHOUSE_KEY.id);
  if (i < 0) throw new Error('no key in the pack');
  x.pack.splice(i, 1);
  x.pending = null;
  const def = controlOf(x, p.fn)!;
  capture(x, def, p.room, 0);
}

/** Walk away from the locked door; it stays locked. */
export function leaveControl(x: Expedition): void {
  if (x.pending?.kind === 'control') x.pending = null;
}

// ---------- loot

function drawLootCard(x: Expedition): LootItem {
  if (x.lootDeck.length === 0) {
    x.lootDeck = [...x.cfg.lootPool];
    shuffleInPlace(x.lootDeck, x);
  }
  return x.lootDeck.pop() as LootItem;
}

/** Draw `n` loot cards into an offer the squad can pick from. `extra` adds draws taken only from one kind of item. */
export function queueLoot(x: Expedition, n: number, from: string, back?: Pending, extra?: { n: number; pick: LootPick }): void {
  const offers = Array.from({ length: Math.max(0, n) }, () => drawLootCard(x));
  if (extra) {
    const pool = x.cfg.lootPool.filter((i) => lootFits(i, extra.pick));
    for (let k = 0; k < extra.n && pool.length; k++) offers.push(pool[Math.floor(nextRandom(x) * pool.length)]!);
  }
  if (offers.length === 0) return;
  x.stats.loot += offers.length;
  x.pending = { kind: 'loot', offers, from, back };
  say(x, `${from}: ${offers.length} loot draw${offers.length === 1 ? '' : 's'}`);
}

/** Put one offered item in the pack. */
export function takeLoot(x: Expedition, index: number): void {
  const p = x.pending;
  if (!p || p.kind !== 'loot') throw new Error('no loot offered');
  if (x.pack.length >= x.cfg.packSize) throw new Error('pack is full');
  const item = p.offers[index];
  if (!item) throw new Error('no such offer');
  p.offers.splice(index, 1);
  x.pack.push(item);
  say(x, `Took ${item.name}`);
  if (p.offers.length === 0) x.pending = p.back ?? null;
}

/** Walk away from whatever offers are left. */
export function leaveLoot(x: Expedition): void {
  if (x.pending?.kind === 'loot') x.pending = x.pending.back ?? null;
}

export function dropItem(x: Expedition, index: number): LootItem {
  if (x.status !== 'running') throw new Error('expedition is over');
  const [item] = x.pack.splice(index, 1);
  if (!item) throw new Error('no such item');
  say(x, `Dropped ${item.name}`);
  return item;
}

/** Use a consumable from the pack on the map. Returns what it did, or null when it would do nothing (the item is kept). */
export function useItem(x: Expedition, index: number): string | null {
  if (x.status !== 'running' || (x.pending && x.pending.kind !== 'loot' && x.pending.kind !== 'market')) throw new Error('cannot use items now');
  const item = x.pack[index];
  if (!item?.use) throw new Error('that item has no map use');
  let text: string;
  if (item.use.kind === 'rations') {
    x.rations += item.use.amount;
    text = `${item.name}: +${item.use.amount} rations`;
  } else {
    const n = healSquad(x, item.use.amount);
    if (n === 0) return null;
    text = `${item.name}: ${n} HP restored`;
  }
  x.pack.splice(index, 1);
  say(x, text);
  return text;
}

// ---------- market

export const canBuyPack = (x: Expedition): boolean => x.eagles >= x.cfg.packPrice;

/** Buy a pack: its loot draws open as an offer, and the market is still there afterward. */
export function buyPack(x: Expedition): LootItem[] {
  const p = x.pending;
  if (!p || p.kind !== 'market') throw new Error('not at a market');
  if (!canBuyPack(x)) throw new Error('not enough Eagles');
  x.eagles -= x.cfg.packPrice;
  queueLoot(x, x.cfg.packDraws, 'Basic pack', p);
  // The market's packs roll rarity on the pack ramp; loot from rooms and fights stays Basic.
  const open = x.pending;
  if (open && open.kind === 'loot') {
    const rarities = rollRarities(x, 'Basic', open.offers.length);
    open.offers = open.offers.map((o, i) => ({ ...o, rarity: rarities[i]! }));
    return open.offers.map((o) => ({ ...o }));
  }
  return [];
}

/** Sell a spare item from the pack. */
export function sellItem(x: Expedition, index: number): number {
  if (x.pending?.kind !== 'market') throw new Error('not at a market');
  const item = x.pack[index];
  if (!item) throw new Error('no such item');
  x.pack.splice(index, 1);
  x.eagles += x.cfg.sellValue;
  say(x, `Sold ${item.name} for ${x.cfg.sellValue}`);
  return x.cfg.sellValue;
}

export function leaveMarket(x: Expedition): void {
  if (x.pending?.kind === 'market') x.pending = null;
}

// ---------- gambles

export const bandOf = (card: number): Band => (card <= 5 ? 'low' : card <= 9 ? 'mid' : 'high');

function gamblePending(x: Expedition): GamblePending {
  const p = x.pending;
  if (!p || p.kind !== 'gamble') throw new Error('no gamble pending');
  return p;
}

export function canAffordGamble(x: Expedition, p: GamblePending): boolean {
  return p.def.stake === 'eagles' ? x.eagles >= p.ladder.stake : x.rations >= p.ladder.stake;
}

/** Pay the stake and start drawing. */
export function commitGamble(x: Expedition): void {
  const p = gamblePending(x);
  if (p.stage !== 'offer') throw new Error('already committed');
  if (!canAffordGamble(x, p)) throw new Error('cannot cover the stake');
  if (p.def.stake === 'eagles') x.eagles -= p.ladder.stake;
  else x.rations -= p.ladder.stake;
  p.stage = 'live';
  say(x, `${p.def.name}: staked ${p.ladder.stake} ${p.def.stake}`);
}

/** Decline before committing. The room stays open to come back to. */
export function declineGamble(x: Expedition): void {
  const p = gamblePending(x);
  if (p.stage !== 'offer') throw new Error('stake already paid');
  x.pending = null;
}

function payout(x: Expedition, p: GamblePending): void {
  const n = p.ladder.rungs[p.rung - 1]!;
  switch (p.def.reward) {
    case 'eagles':
      x.eagles += n;
      x.stats.eagles += n;
      break;
    case 'rations':
      x.rations += n;
      break;
    case 'xp':
      x.stats.xp += n;
      break;
    case 'loot':
      p.owedLoot = n;
      break;
  }
  p.outcome = `Paid out: ${n} ${p.def.reward === 'loot' ? 'loot draws' : p.def.reward === 'xp' ? 'XP' : p.def.reward}`;
  say(x, `${p.def.name}: ${p.outcome}`);
  p.stage = 'over';
}

/** Draw the top results card: high climbs a rung, mid holds, low busts. The last rung pays out on its own. */
export function pushGamble(x: Expedition): void {
  const p = gamblePending(x);
  if (p.stage !== 'live') throw new Error('not in play');
  const card = drawResult(x);
  const band = bandOf(card);
  p.last = { card, band };
  if (band === 'low') {
    p.stage = 'over';
    p.outcome = p.rung > 0 ? 'Bust: the stake and the winnings so far are lost' : 'Bust: the stake is lost';
    p.rung = 0;
    say(x, `${p.def.name}: drew ${card}, bust`);
  } else if (band === 'high') {
    p.rung++;
    say(x, `${p.def.name}: drew ${card}, up to rung ${p.rung}`);
    if (p.rung === 3) payout(x, p);
  } else say(x, `${p.def.name}: drew ${card}, holds`);
}

/** Stop and take the current rung. At rung 0 this is walking away with the stake gone. */
export function cashOutGamble(x: Expedition): void {
  const p = gamblePending(x);
  if (p.stage !== 'live') throw new Error('not in play');
  if (p.rung === 0) {
    p.stage = 'over';
    p.outcome = 'You walk away. The stake is gone';
    return;
  }
  payout(x, p);
}

/** Close the result screen. Any loot owed goes into an offer. */
export function closeGamble(x: Expedition): void {
  const p = gamblePending(x);
  if (p.stage !== 'over') throw new Error('gamble still running');
  x.rooms[p.room]!.cleared = true;
  x.pending = null;
  if (p.owedLoot > 0) queueLoot(x, p.owedLoot, p.def.name);
}

/** Take the gate: on to the next section, or out of the floor from the last one. */
export function takeGate(x: Expedition): void {
  if (!x.pending || x.pending.kind !== 'gate') throw new Error('no gate pending');
  x.stats.sections++;
  if (x.section + 1 >= x.cfg.sections) {
    x.pending = null;
    x.status = 'done';
    say(x, 'Floor complete');
    return;
  }
  x.section++;
  startSection(x);
}

/** Decline the gate and stay in the section. */
export function leaveGate(x: Expedition): void {
  if (x.pending?.kind === 'gate') x.pending = null;
}

export const atCheckpoint = (x: Expedition): boolean => currentRoom(x).entrance;

/** Call it off. Free from a section entrance, otherwise the normal retreat penalty (ground lost). */
export function retreat(x: Expedition): void {
  if (x.status !== 'running') return;
  if (x.pending?.kind === 'fight') throw new Error('cannot retreat out of a fight');
  x.groundLost = !atCheckpoint(x);
  x.status = 'retreated';
  x.pending = null;
  say(x, x.groundLost ? 'Retreat: ground is lost' : 'Retreat from the checkpoint');
}

// ---------- hazards

/** Most rations a test can be pushed with: the hand size, the same limit as exhausting cards. */
export const MAX_PUSH = 7;

/** The best rating any squad member has in this attribute. */
export function hazardRating(x: Expedition, attr: Attr): number {
  return Math.max(...x.cfg.squad.map((u) => u.attrs?.[attr] ?? 2));
}

const hazardPending = (x: Expedition): HazardPending => {
  if (x.pending?.kind !== 'hazard') throw new Error('no hazard pending');
  return x.pending;
};

function settleHazard(p: HazardPending): void {
  const total = p.rating + (p.roll?.bonus ?? 0) + p.pushed;
  if (total >= p.need) {
    p.stage = 'over';
    p.passed = true;
    p.outcome = `${total} against ${p.need}: through. ${p.def.kind === 'guarded' ? 'The room beyond is open.' : 'The way is clear.'}`;
  } else p.stage = 'short';
}

/** Try the test: the squad's best rating plus the band of a card off the results deck (low +0, mid +1, high +2). */
export function testHazard(x: Expedition): void {
  const p = hazardPending(x);
  if (p.stage !== 'offer') throw new Error('already tried');
  const card = drawResult(x);
  p.roll = { card, bonus: card <= 5 ? 0 : card <= 9 ? 1 : 2 };
  settleHazard(p);
}

/** Spend a ration for +1 on a test that fell short. */
export function pushHazard(x: Expedition): void {
  const p = hazardPending(x);
  if (p.stage !== 'short') throw new Error('nothing to push');
  if (x.rations <= 0) throw new Error('no rations to spend');
  if (p.pushed >= MAX_PUSH) throw new Error('cannot push further');
  x.rations--;
  p.pushed++;
  settleHazard(p);
}

export const canPushHazard = (x: Expedition, p: HazardPending): boolean => p.stage === 'short' && x.rations > 0 && p.pushed < MAX_PUSH;

/** Close the hazard. Passed: the room is cleared and a guarded one pays a loot draw. Not passed: the squad steps back. */
export function closeHazard(x: Expedition): void {
  const p = hazardPending(x);
  x.pending = null;
  if (p.passed) {
    const room = x.rooms[p.room]!;
    room.cleared = true;
    say(x, `${p.def.name}: passed${p.pushed ? `, spending ${p.pushed} ration${p.pushed === 1 ? '' : 's'}` : ''}`);
    if (p.def.kind === 'guarded') queueLoot(x, 1, p.def.name);
  } else {
    x.at = x.prev ?? x.at;
    say(x, `${p.def.name}: turned back`);
  }
}
