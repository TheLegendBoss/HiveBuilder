import { nextRandom, shuffleInPlace } from './rng';
import type { UnitTemplate } from './types';

export type RoomType = 'Fight' | 'Scavenge' | 'Gamble' | 'Hazard' | 'Market' | 'Rest' | 'Clinic' | 'Gate';
export const ROOM_TYPES: RoomType[] = ['Fight', 'Scavenge', 'Gamble', 'Hazard', 'Market', 'Rest', 'Clinic', 'Gate'];

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
  rations: number;
  /** HP a Clinic restores across the squad */
  clinicHeal: number;
}

export type ExpStatus = 'running' | 'done' | 'retreated' | 'wiped';

export type Pending =
  | { kind: 'fight'; room: number; force: string; step: number }
  | { kind: 'gate'; room: number };

export interface ExpStats {
  moves: number;
  fights: number;
  rooms: number;
  sections: number;
  eagles: number;
  loot: number;
  starved: number;
}

export interface Expedition {
  cfg: ExpeditionConfig;
  rng: number;
  /** current HP per squad slot, never below 1 between fights */
  hp: number[];
  rations: number;
  section: number;
  rooms: Room[];
  at: number;
  /** room cards left for this section */
  deck: RoomType[];
  /** the results deck the exit draws come off, top at the end */
  results: number[];
  status: ExpStatus;
  /** a retreat that was not made from a checkpoint */
  groundLost: boolean;
  pending: Pending | null;
  log: string[];
  stats: ExpStats;
}

export const MAX_DOORS = 3;
const DIRS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/** chance a door aimed at an existing, unconnected room joins up with it */
const CONNECT_CHANCE = 0.5;

/** Two sections per tier step, capped at tier 8. Sections count from 0. */
export const tierOf = (section: number): number => Math.min(8, 1 + Math.floor(section / 2));

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
    section: 0,
    rooms: [],
    at: 0,
    deck: [],
    results: Array.from({ length: 52 }, (_, i) => (i % 13) + 1),
    status: 'running',
    groundLost: false,
    pending: null,
    log: [],
    stats: { moves: 0, fights: 0, rooms: 0, sections: 0, eagles: 0, loot: 0, starved: 0 }
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
  const origin: Room = {
    id: 0, x: 0, y: 0, type: 'Gate', links: [], entered: true, cleared: true, entrance: true, force: null, exits: null
  };
  x.rooms.push(origin);
  x.at = 0;
  x.pending = null;
  say(x, `Section ${x.section + 1} of ${x.cfg.sections}, tier ${tierOf(x.section)}`);
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
    id: x.rooms.length, x: room.x + dx, y: room.y + dy, type, links: [], entered: false, cleared: false, entrance: false, force: null, exits: null
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
  // The roll may have gone nowhere (every door joined an old room or was declined). Still no way onward: build one.
  if (!x.rooms.some((r) => !r.entered) && !x.rooms.some(isExitGate) && room.links.length < MAX_DOORS) {
    for (const [dx, dy] of dirs) {
      if (roomAt(x, room.x + dx, room.y + dy)) continue;
      if (spawn(x, room, dx, dy)) {
        forced = true;
        break;
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
      x.pending = { kind: 'fight', room: room.id, force: room.force, step: tierOf(x.section) - 1 };
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
    case 'Rest':
      room.cleared = true;
      return 'Rest room: no exhausted cards to restore yet (stub)';
    case 'Scavenge':
      room.cleared = true;
      x.stats.loot += 1;
      return 'Scavenge: counted one loot draw (loot deck stub)';
    case 'Gamble':
      room.cleared = true;
      return 'Gamble: nothing offered yet (stub)';
    case 'Hazard':
      room.cleared = true;
      return 'Hazard: no attribute test yet, waved through (stub)';
    case 'Market':
      room.cleared = true;
      return 'Market: nothing for sale yet (stub)';
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
  x.stats.loot += reward.loot;
  say(x, `Fight won: ${reward.eagles} Eagles, ${reward.loot} loot draw`);
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
