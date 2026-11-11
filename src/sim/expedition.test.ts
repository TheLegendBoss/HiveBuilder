import { describe, expect, it } from 'vitest';
import { starterRoomDeck, tscExpedition } from '../data/rooms';
import {
  fightEagles,
  MAX_DOORS, bandOf, canAffordGamble, cashOutGamble, closeGamble, commitGamble, createExpedition, currentRoom, declineGamble, doorsFor,
  dropItem, finishFight, healSquad, leaveControl, leaveGate, leaveLoot, move, moves, pushGamble, queueLoot, retreat, takeGate, takeLoot, tierOf,
  useItem, buyPack, canBuyPack, sellItem, leaveMarket, hasKey, openStorehouse, sectionFn, closeHazard, pushHazard, testHazard, hazardRating, canPushHazard,
  MAX_PUSH, type Expedition, type GamblePending, type HazardPending
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

/** Answer whatever the room asked: win fights, skip loot, decline gambles and gates. */
function settle(x: Expedition): void {
  for (let i = 0; i < 4 && (x as Expedition).pending; i++) {
    const p = (x as Expedition).pending!;
    if (p.kind === 'fight') finishFight(x, true, x.hp, { eagles: 1, loot: 1 });
    else if (p.kind === 'loot') leaveLoot(x);
    else if (p.kind === 'market') leaveMarket(x);
    else if (p.kind === 'gamble') declineGamble(x);
    else if (p.kind === 'control') leaveControl(x);
    else if (p.kind === 'hazard') {
      p.need = 0;
      if (p.stage === 'offer') testHazard(x);
      while (x.pending?.kind === 'hazard' && canPushHazard(x, x.pending)) pushHazard(x);
      closeHazard(x);
    } else leaveGate(x);
  }
}

/** Step to a room and settle it. */
function walk(x: Expedition, id: number): void {
  move(x, id);
  settle(x);
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
    for (let seed = 1; seed <= 1500; seed++) {
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
    expect(Math.max(...sizes)).toBeLessThanOrEqual(23);
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
      const purse = x.eagles;
      finishFight(x, true, x.hp, { eagles: 2, loot: 1 });
      expect(x.rations).toBe(start - 1);
      expect(x.stats.eagles).toBe(2);
      expect(x.eagles).toBe(purse + 2);
      expect(x.pending?.kind).toBe('loot');
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
          while ((x as Expedition).pending && (x as Expedition).pending!.kind !== 'gate') settle(x);
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

/** A fresh expedition with a room-free pending slot, for testing loot and gambles directly. */
const fresh = (seed = 4): Expedition => createExpedition(tscExpedition(seed));

describe('loot', () => {
  it('deals the whole loot deck before repeating', () => {
    const x = fresh();
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) {
      queueLoot(x, 1, 'test');
      const p = x.pending as { kind: 'loot'; offers: { id: number }[] };
      seen.add(p.offers[0]!.id);
      leaveLoot(x);
    }
    expect(seen.size).toBe(30);
  });

  it('caps the pack and lets the player drop to make room', () => {
    const x = fresh();
    for (let i = 0; i < 8; i++) {
      queueLoot(x, 1, 'test');
      takeLoot(x, 0);
    }
    expect(x.pack).toHaveLength(8);
    queueLoot(x, 2, 'test');
    expect(() => takeLoot(x, 0)).toThrow(/full/);
    dropItem(x, 0);
    takeLoot(x, 0);
    expect(x.pack).toHaveLength(8);
    expect(x.pending?.kind).toBe('loot');
    expect(() => takeLoot(x, 0)).toThrow(/full/);
    dropItem(x, 0);
    takeLoot(x, 0);
    expect(x.pack).toHaveLength(8);
    expect(x.pending).toBeNull();
  });

  it('uses rations and healing, and keeps a heal that would do nothing', () => {
    const x = fresh();
    const ration = x.cfg.lootPool.find((i) => i.name === 'Hive rations')!;
    const heal = x.cfg.lootPool.find((i) => i.name === 'Healing supplies')!;
    x.pack.push(ration, heal);
    const before = x.rations;
    expect(useItem(x, 0)).toMatch(/rations/);
    expect(x.rations).toBe(before + 4);
    expect(useItem(x, 0)).toBeNull();
    expect(x.pack).toHaveLength(1);
    x.hp = [1, 1, 1, 1, 1];
    expect(useItem(x, 0)).toMatch(/4 HP/);
    expect(x.pack).toHaveLength(0);
    x.pack.push(x.cfg.lootPool.find((i) => i.name === 'Riot shield')!);
    expect(() => useItem(x, 0)).toThrow();
  });

  it('a Scavenge room offers one draw', () => {
    for (let seed = 1; seed < 80; seed++) {
      const x = fresh(seed);
      const r = x.rooms.find((q) => q.type === 'Scavenge' && q.links.includes(0));
      if (!r) continue;
      move(x, r.id);
      expect(x.pending?.kind).toBe('loot');
      return;
    }
    throw new Error('no seed put a Scavenge next to the entrance');
  });
});

describe('gambles', () => {
  const start = (id: number, tier = 1): { x: Expedition; p: GamblePending } => {
    const x = fresh(9);
    const def = x.cfg.gambles.find((g) => g.id === id)!;
    const room = x.rooms[x.rooms.length - 1]!;
    x.pending = { kind: 'gamble', room: room.id, def, ladder: x.cfg.ladders[id]![tier - 1]!, stage: 'offer', rung: 0, last: null, outcome: null, owedLoot: 0 };
    return { x, p: x.pending };
  };
  const stack = (x: Expedition, ...cards: number[]): void => {
    x.results = [...cards].reverse();
  };

  it('maps cards to bands', () => {
    expect([1, 5, 6, 9, 10, 13].map(bandOf)).toEqual(['low', 'low', 'mid', 'mid', 'high', 'high']);
  });

  it('prints the Eagle ladder from the table', () => {
    const { p } = start(1, 1);
    expect(p.ladder).toEqual({ stake: 5, rungs: [15, 34, 76] });
    expect(start(1, 8).p.ladder).toEqual({ stake: 25, rungs: [75, 169, 380] });
    expect(start(2, 1).p.ladder).toEqual({ stake: 1, rungs: [1, 2, 4] });
    expect(start(2, 7).p.ladder).toEqual({ stake: 3, rungs: [2, 3, 6] });
    expect(start(5, 2).p.ladder).toEqual({ stake: 8, rungs: [2, 4, 8] });
  });

  it('pays the stake once, climbs on high, holds on mid and cashes out', () => {
    const { x, p } = start(1);
    const purse = x.eagles;
    commitGamble(x);
    expect(x.eagles).toBe(purse - 5);
    stack(x, 12, 7, 13);
    pushGamble(x);
    expect(p.rung).toBe(1);
    pushGamble(x);
    expect(p.rung).toBe(1);
    expect(p.last?.band).toBe('mid');
    pushGamble(x);
    expect(p.rung).toBe(2);
    cashOutGamble(x);
    expect(p.stage).toBe('over');
    expect(x.eagles).toBe(purse - 5 + 34);
    closeGamble(x);
    expect(x.pending).toBeNull();
    expect(x.rooms[p.room]!.cleared).toBe(true);
  });

  it('busts on a low card and loses the winnings', () => {
    const { x, p } = start(1);
    const purse = x.eagles;
    commitGamble(x);
    stack(x, 11, 3);
    pushGamble(x);
    pushGamble(x);
    expect(p.stage).toBe('over');
    expect(p.outcome).toMatch(/Bust/);
    expect(x.eagles).toBe(purse - 5);
  });

  it('the top rung pays on its own', () => {
    const { x, p } = start(1);
    const purse = x.eagles;
    commitGamble(x);
    stack(x, 10, 11, 12);
    pushGamble(x);
    pushGamble(x);
    pushGamble(x);
    expect(p.stage).toBe('over');
    expect(x.eagles).toBe(purse - 5 + 76);
  });

  it('loot rewards become an offer when the result is closed', () => {
    const { x } = start(2);
    commitGamble(x);
    expect(x.rations).toBe(x.cfg.rations - 1);
    stack(x, 11, 12);
    pushGamble(x);
    pushGamble(x);
    cashOutGamble(x);
    closeGamble(x);
    const next = x.pending as unknown as { kind: string; offers: unknown[] };
    expect(next.kind).toBe('loot');
    expect(next.offers).toHaveLength(2);
  });

  it('refuses a stake the squad cannot cover and lets them decline', () => {
    const { x, p } = start(1);
    x.eagles = 4;
    expect(canAffordGamble(x, p)).toBe(false);
    expect(() => commitGamble(x)).toThrow();
    declineGamble(x);
    expect(x.pending).toBeNull();
    expect(x.rooms[p.room]!.cleared).toBe(false);
  });

  it('walking away at rung 0 loses the stake', () => {
    const { x, p } = start(6);
    commitGamble(x);
    cashOutGamble(x);
    expect(p.stage).toBe('over');
    expect(x.rations).toBe(x.cfg.rations - 1);
  });
});

describe('market', () => {
  const atMarket = (): Expedition => {
    const x = fresh(12);
    x.pending = { kind: 'market', room: 0 };
    return x;
  };

  it('sells a spare item for its value', () => {
    const x = atMarket();
    x.pack.push(x.cfg.lootPool[0]!);
    const purse = x.eagles;
    sellItem(x, 0);
    expect(x.pack).toHaveLength(0);
    expect(x.eagles).toBe(purse + x.cfg.sellValue);
  });

  it('buys a pack of draws and comes back to the market', () => {
    const x = atMarket();
    const purse = x.eagles;
    expect(canBuyPack(x)).toBe(true);
    buyPack(x);
    expect(x.eagles).toBe(purse - x.cfg.packPrice);
    const p = x.pending as { kind: string; offers: unknown[] };
    expect(p.kind).toBe('loot');
    expect(p.offers).toHaveLength(x.cfg.packDraws);
    leaveLoot(x);
    expect(x.pending?.kind).toBe('market');
  });

  it('gives the pack a rarity per card and returns the same cards it offers', () => {
    const x = atMarket();
    const cards = buyPack(x);
    expect(cards).toHaveLength(x.cfg.packDraws);
    const p = x.pending as { kind: string; offers: Array<{ rarity?: string }> };
    expect(p.offers.map((o) => o.rarity)).toEqual(cards.map((c) => c.rarity));
    expect(cards.every((c) => c.rarity)).toBe(true);
  });

  it('keeps room and fight loot white', () => {
    const x = fresh(12);
    const pick = (x.cfg.lootPool[0]!);
    expect(pick.rarity).toBeUndefined();
  });

  it('cannot buy without the Eagles', () => {
    const x = atMarket();
    x.eagles = x.cfg.packPrice - 1;
    expect(canBuyPack(x)).toBe(false);
    expect(() => buyPack(x)).toThrow();
  });
});

describe('control rooms', () => {
  /** Walk to the first room matching `want`, settling everything on the way. Fights are won, so control fights capture. */
  const find = (x: Expedition, want: (r: Expedition['rooms'][number]) => boolean): boolean => {
    for (let guard = 0; guard < 80; guard++) {
      if (x.rooms.some((r) => want(r) && r.entered)) return true;
      const p = pathTo(x, (id) => want(x.rooms[id]!) || !x.rooms[id]!.entered);
      if (!p) return false;
      for (const id of p) {
        if (x.pending) return false;
        move(x, id);
        if (x.rooms[id]!.type === 'Control') return true;
        settle(x);
      }
    }
    return false;
  };

  it('every section function cycles through the five, from a seeded start', () => {
    const fns = [0, 1, 2, 3, 4, 5].map((s) => sectionFn({ fnOffset: 2 }, s));
    expect(fns.slice(0, 5)).toEqual(['supply', 'secure', 'medical', 'power', 'industrial']);
    expect(fns[5]).toBe(fns[0]);
  });

  it('a section holds one control room, reachable by exploring, and the rest of the deck is untouched', () => {
    let found = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999 }));
      exploreAll(x);
      const controls = x.rooms.filter((r) => r.type === 'Control');
      expect(controls.length).toBeLessThanOrEqual(1);
      found += controls.length;
    }
    expect(found).toBeGreaterThan(40);
  });

  it('winning a boss room takes the section, once, and pays the force loot plus the first-capture draw', () => {
    let done = 0;
    for (let seed = 1; seed <= 80 && done < 5; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999 }));
      const fn = sectionFn(x.cfg, 0);
      if (fn === 'supply') continue;
      if (!find(x, (r) => r.type === 'Control')) continue;
      const p = x.pending;
      if (!p || p.kind !== 'fight' || !p.control) continue;
      expect(p.control).toBe(fn);
      finishFight(x, true, x.hp, { eagles: 5, loot: 1 });
      expect(x.captures).toEqual([{ fn, section: 0, tier: 1, rooms: x.rooms.length }]);
      const loot = x.pending as Extract<NonNullable<Expedition['pending']>, { kind: 'loot' }>;
      expect(loot.kind).toBe('loot');
      expect(loot.offers.length).toBeGreaterThanOrEqual(2);
      leaveLoot(x);
      expect(x.rooms.filter((r) => r.type === 'Control').every((r) => r.cleared)).toBe(true);
      done++;
    }
    expect(done).toBeGreaterThan(0);
  });

  it('a fight in a control room that is lost wipes the squad and takes nothing', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999 }));
      if (sectionFn(x.cfg, 0) === 'supply' || !find(x, (r) => r.type === 'Control')) continue;
      finishFight(x, false, x.hp.map(() => 0), { eagles: 0, loot: 0 });
      expect(x.status).toBe('wiped');
      expect(x.captures).toHaveLength(0);
      return;
    }
    throw new Error('no control fight found');
  });

  it('a function that is already held has no control room', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999, skipFns: ['power', 'industrial', 'supply', 'secure', 'medical'] }));
      exploreAll(x);
      expect(x.rooms.some((r) => r.type === 'Control')).toBe(false);
    }
  });

  it('the Storehouse needs the key: a first guarded room or scavenge drops it, and using it takes the section', () => {
    let tried = 0;
    for (let seed = 1; seed <= 200 && tried < 3; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999, fnOffset: 2 }));
      expect(sectionFn(x.cfg, 0)).toBe('supply');
      // explore everything but the control room, taking all loot on offer
      for (let guard = 0; guard < 80; guard++) {
        const p = pathTo(x, (id) => !x.rooms[id]!.entered && x.rooms[id]!.type !== 'Control');
        if (!p) break;
        for (const id of p) {
          move(x, id);
          while (x.pending?.kind === 'loot' && x.pending.offers.length && x.pack.length < x.cfg.packSize) takeLoot(x, 0);
          settle(x);
        }
      }
      const door = x.rooms.find((r) => r.type === 'Control');
      if (!door || !hasKey(x)) continue;
      const p = pathTo(x, (id) => id === door.id)!;
      for (const id of p) {
        move(x, id);
        if (x.pending?.kind === 'control') break;
        settle(x);
      }
      expect(x.pending?.kind).toBe('control');
      const packBefore = x.pack.length;
      openStorehouse(x);
      expect(x.pack.length).toBe(packBefore - 1);
      expect(hasKey(x)).toBe(false);
      expect(x.captures.map((c) => c.fn)).toEqual(['supply']);
      tried++;
    }
    expect(tried).toBeGreaterThan(0);
  });

  it('without the key the Storehouse stays locked', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const x = createExpedition(tscExpedition(seed, { rations: 999, fnOffset: 2 }));
      let guard = 0;
      while (!x.rooms.some((r) => r.type === 'Control' && r.entered) && guard++ < 60) {
        const p = pathTo(x, (id) => !x.rooms[id]!.entered);
        if (!p) break;
        for (const id of p) {
          move(x, id);
          if (x.pending?.kind === 'control') break;
          settle(x);
        }
      }
      if (x.pending?.kind !== 'control' || hasKey(x)) continue;
      expect(() => openStorehouse(x)).toThrow();
      leaveControl(x);
      expect(x.pending).toBeNull();
      expect(x.captures).toHaveLength(0);
      return;
    }
    throw new Error('never reached the locked door without a key');
  });
});

describe('hazard rooms', () => {
  const atHazard = (seed = 12): Expedition => {
    const x = fresh(seed);
    x.at = 0;
    x.rooms.length = 1;
    const room = x.rooms[0]!;
    room.links = [];
    const h = { ...room, id: 1, x: 1, type: 'Hazard' as const, links: [0], entered: false, cleared: false, entrance: false, hazard: null };
    room.links.push(1);
    x.rooms.push(h);
    move(x, 1);
    return x;
  };

  it('opens a test with a rating and a threshold from the tier table', () => {
    const x = atHazard();
    const p = x.pending as HazardPending;
    expect(p.kind).toBe('hazard');
    expect(p.stage).toBe('offer');
    expect(p.need).toBeGreaterThanOrEqual(5);
    expect(p.need).toBeLessThanOrEqual(6);
    expect(p.rating).toBe(hazardRating(x, p.def.attr));
  });

  it('adds the results band to the rating and passes when it reaches the number', () => {
    const x = atHazard();
    const p = x.pending as HazardPending;
    p.need = 4;
    p.rating = 4;
    testHazard(x);
    expect(p.passed).toBe(true);
    closeHazard(x);
    expect(x.rooms[1]!.cleared).toBe(true);
    expect(x.pending === null || x.pending.kind === 'loot').toBe(true);
  });

  it('falls short, then each ration pushes the test by one', () => {
    const x = atHazard();
    const p = x.pending as HazardPending;
    p.need = 20;
    p.rating = 2;
    testHazard(x);
    expect(p.stage).toBe('short');
    const rations = x.rations;
    pushHazard(x);
    expect(x.rations).toBe(rations - 1);
    expect(p.pushed).toBe(1);
    p.need = 2 + p.roll!.bonus + 2;
    pushHazard(x);
    expect(p.passed).toBe(true);
  });

  it('cannot push without rations or past the hand limit', () => {
    const x = atHazard();
    const p = x.pending as HazardPending;
    p.need = 99;
    testHazard(x);
    x.rations = 0;
    expect(canPushHazard(x, p)).toBe(false);
    expect(() => pushHazard(x)).toThrow();
    x.rations = 50;
    for (let i = 0; i < MAX_PUSH; i++) pushHazard(x);
    expect(canPushHazard(x, p)).toBe(false);
  });

  it('turning back steps the squad out of the room and leaves it to try again', () => {
    const x = atHazard();
    closeHazard(x);
    expect(x.at).toBe(0);
    expect(x.rooms[1]!.cleared).toBe(false);
    move(x, 1);
    expect(x.pending?.kind).toBe('hazard');
  });

  it('a guarded room pays a loot draw when passed', () => {
    const x = atHazard();
    const p = x.pending as HazardPending;
    p.def = { ...p.def, kind: 'guarded' };
    p.need = 1;
    testHazard(x);
    closeHazard(x);
    expect(x.pending?.kind).toBe('loot');
  });

  it('a Rest room heals the squad', () => {
    const x = fresh(12);
    x.hp = x.hp.map(() => 1);
    x.rooms.length = 1;
    x.rooms[0]!.links = [1];
    x.rooms.push({ ...x.rooms[0]!, id: 1, x: 1, type: 'Rest', links: [0], entered: false, cleared: false, entrance: false });
    move(x, 1);
    expect(x.hp.some((h) => h > 1)).toBe(true);
    expect(x.rooms[1]!.cleared).toBe(true);
  });
});

describe('fight Eagles by tier', () => {
  it('pays the printed reward at tier 1 and grows with the room income table', () => {
    const cfg = { income: [10, 16, 21, 27, 33, 39, 44, 50] };
    expect(fightEagles(cfg, 0, 2)).toBe(2);
    expect(fightEagles(cfg, 2, 2)).toBe(4);
    expect(fightEagles(cfg, 6, 2)).toBe(9);
    expect(fightEagles({}, 5, 2)).toBe(2);
  });
});
