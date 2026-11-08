import { describe, expect, it } from 'vitest';
import { starterRoomDeck, tscExpedition } from '../data/rooms';
import {
  MAX_DOORS, createExpedition, currentRoom, doorsFor, finishFight, healSquad, leaveGate, move, moves, retreat, takeGate, tierOf,
  type Expedition
} from './expedition';

/** Path of room ids from here to the nearest room matching `want`, over doors. */
function pathTo(x: Expedition, want: (id: number) => boolean): number[] | null {
  const prev = new Map<number, number>();
  const queue = [x.at];
  const seen = new Set([x.at]);
  while (queue.length) {
    const id = queue.shift()!;
    if (id !== x.at && want(id)) {
      const path = [id];
      let cur = id;
      while (prev.get(cur) !== x.at) {
        cur = prev.get(cur)!;
        path.unshift(cur);
      }
      return path;
    }
    for (const n of x.rooms[id]!.links) {
      if (seen.has(n)) continue;
      seen.add(n);
      prev.set(n, id);
      queue.push(n);
    }
  }
  return null;
}

/** Step to a room, winning any fight and declining any gate. */
function walk(x: Expedition, id: number): void {
  move(x, id);
  if (x.pending?.kind === 'fight') finishFight(x, true, x.hp, { eagles: 1, loot: 1 });
  else if (x.pending?.kind === 'gate') leaveGate(x);
}

function exploreAll(x: Expedition): void {
  for (let guard = 0; guard < 200; guard++) {
    const p = pathTo(x, (id) => !x.rooms[id]!.entered);
    if (!p) return;
    for (const id of p) walk(x, id);
  }
  throw new Error('exploration never finished');
}

describe('room deck data', () => {
  it('is the 21-card starter deck', () => {
    expect(starterRoomDeck).toHaveLength(21);
    expect(starterRoomDeck.filter((t) => t === 'Fight')).toHaveLength(8);
    expect(starterRoomDeck.filter((t) => t === 'Gate')).toHaveLength(2);
  });
  it('maps exit draws to doors', () => {
    expect([1, 5, 6, 9, 10, 13].map(doorsFor)).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('ramps two sections per tier step', () => {
    expect([0, 1, 2, 3, 13, 14, 30].map(tierOf)).toEqual([1, 1, 2, 2, 7, 8, 8]);
  });
});

describe('section generation', () => {
  it('is deterministic for a seed', () => {
    const a = createExpedition(tscExpedition(11));
    const b = createExpedition(tscExpedition(11));
    exploreAll(a);
    exploreAll(b);
    expect(a.rooms.map((r) => [r.x, r.y, r.type])).toEqual(b.rooms.map((r) => [r.x, r.y, r.type]));
  });

  it('always builds a connected grid with a way onward', () => {
    const sizes: number[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      const x = createExpedition(tscExpedition(seed));
      exploreAll(x);
      const keys = new Set(x.rooms.map((r) => `${r.x},${r.y}`));
      expect(keys.size, `seed ${seed} overlap`).toBe(x.rooms.length);
      for (const r of x.rooms) {
        expect(r.entered, `seed ${seed} room ${r.id} unvisited`).toBe(true);
        expect(r.links.length).toBeLessThanOrEqual(MAX_DOORS);
        for (const n of r.links) {
          const o = x.rooms[n]!;
          expect(o.links).toContain(r.id);
          expect(Math.abs(o.x - r.x) + Math.abs(o.y - r.y)).toBe(1);
        }
      }
      expect(x.rooms.some((r) => r.type === 'Gate' && !r.entrance), `seed ${seed} has no gate`).toBe(true);
      sizes.push(x.rooms.length);
    }
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    expect(avg).toBeGreaterThan(6);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(22);
  });
});

describe('expedition rules', () => {
  it('ticks rations on movement only', () => {
    const x = createExpedition(tscExpedition(3));
    const start = x.rations;
    const first = moves(x)[0]!;
    move(x, first.id);
    expect(x.rations).toBe(start - 1);
    if (x.pending?.kind === 'fight') {
      finishFight(x, true, x.hp, { eagles: 2, loot: 1 });
      expect(x.rations).toBe(start - 1);
      expect(x.stats.eagles).toBe(2);
    }
  });

  it('blocks movement while a fight is waiting', () => {
    for (let seed = 1; seed < 60; seed++) {
      const x = createExpedition(tscExpedition(seed));
      const fightRoom = x.rooms.find((r) => r.type === 'Fight' && r.links.includes(0));
      if (!fightRoom) continue;
      move(x, fightRoom.id);
      expect(x.pending?.kind).toBe('fight');
      expect(moves(x)).toEqual([]);
      expect(() => move(x, 0)).toThrow();
      return;
    }
    throw new Error('no seed put a fight next to the entrance');
  });

  it('starves the squad at zero rations but never below 1 HP', () => {
    const x = createExpedition(tscExpedition(5, { rations: 1 }));
    x.rooms[0]!.links.forEach(() => undefined);
    const hop = (): void => {
      const to = currentRoom(x).links[0]!;
      walk(x, to);
    };
    hop();
    expect(x.rations).toBe(0);
    const before = [...x.hp];
    hop();
    expect(x.stats.starved).toBe(1);
    expect(x.hp.every((h, i) => h === Math.max(1, before[i]! - 1))).toBe(true);
    for (let i = 0; i < 12 && x.status === 'running'; i++) hop();
    expect(Math.min(...x.hp)).toBeGreaterThanOrEqual(1);
  });

  it('raises the downed to 1 HP after a win and ends the run on a loss', () => {
    const x = createExpedition(tscExpedition(8));
    x.pending = { kind: 'fight', room: 1, force: 'rats', step: 0 };
    finishFight(x, true, [0, 3, 5, 0, 2], { eagles: 1, loot: 1 });
    expect(x.hp).toEqual([1, 3, 5, 1, 2]);
    x.pending = { kind: 'fight', room: 1, force: 'rats', step: 0 };
    finishFight(x, false, [0, 0, 1, 0, 0], { eagles: 0, loot: 0 });
    expect(x.status).toBe('wiped');
  });

  it('heals the most hurt first, capped at max HP', () => {
    const x = createExpedition(tscExpedition(9));
    x.hp = [1, 5, 6, 6, 5];
    expect(healSquad(x, 3)).toBe(3);
    expect(x.hp).toEqual([4, 5, 6, 6, 5]);
    expect(healSquad(x, 9)).toBe(1);
  });

  it('walks through every section and finishes the floor', () => {
    const x = createExpedition(tscExpedition(21, { sections: 3, rations: 99 }));
    for (let s = 0; s < 3; s++) {
      expect(x.section).toBe(s);
      const gate = (id: number): boolean => x.rooms[id]!.type === 'Gate' && !x.rooms[id]!.entrance;
      for (let guard = 0; guard < 100 && !x.pending; guard++) {
        const p = pathTo(x, gate) ?? pathTo(x, (id) => !x.rooms[id]!.entered)!;
        for (const id of p) {
          if ((x as Expedition).pending) break;
          move(x, id);
          if ((x as Expedition).pending?.kind === 'fight') finishFight(x, true, x.hp, { eagles: 1, loot: 1 });
        }
        if (x.rooms[x.at]!.type === 'Gate' && !x.rooms[x.at]!.entrance) break;
      }
      expect((x as Expedition).pending?.kind).toBe('gate');
      takeGate(x);
    }
    expect(x.status).toBe('done');
    expect(x.stats.sections).toBe(3);
  });

  it('retreat is free at the entrance and costs ground elsewhere', () => {
    const a = createExpedition(tscExpedition(2));
    retreat(a);
    expect(a.status).toBe('retreated');
    expect(a.groundLost).toBe(false);
    const b = createExpedition(tscExpedition(2));
    walk(b, currentRoom(b).links[0]!);
    if (b.status === 'running') {
      retreat(b);
      expect(b.groundLost).toBe(true);
    }
  });
});
