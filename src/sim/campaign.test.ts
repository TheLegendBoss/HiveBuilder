import { describe, expect, it } from 'vitest';
import { newTscCampaign, launchTsc } from '../data/campaign';
import {
  abandon, buyPack, canPromote, claimFoothold, claimProblem, launch, launchProblem, maxPurse, promote, readyCrew, repair, repairCost, returnHome, sellStash, templateOf,
  type Campaign
} from './campaign';
import { fightXp, type Expedition } from './expedition';

const go = (c: Campaign, purse = 10, pack: number[] = [], seed = 5): Expedition => launchTsc(c, { purse, pack }, seed);

function fillStash(c: Campaign, n: number): void {
  c.eagles += 100;
  while (c.stash.length < n) buyPack(c);
}

describe('campaign start', () => {
  it('begins with the five TSC droids at tier 1 and some Eagles', () => {
    const c = newTscCampaign(1);
    expect(c.crew.map((m) => m.name)).toEqual(['Line A', 'Line B', 'Vanguard', 'Heavy', 'Repair']);
    expect(c.crew.every((m) => m.tier === 1 && m.xp === 0 && m.damage === null)).toBe(true);
    expect(c.eagles).toBe(30);
    expect(c.power).toBe(0);
  });
});

describe('market and stash', () => {
  it('a pack costs 10 and adds 5 items to the stash; spares sell for 1', () => {
    const c = newTscCampaign(2);
    const r = buyPack(c);
    expect(r.got).toHaveLength(5);
    expect(c.eagles).toBe(20);
    expect(c.stash).toHaveLength(5);
    sellStash(c, 0);
    expect(c.eagles).toBe(21);
    expect(c.stash).toHaveLength(4);
  });

  it('items that do not fit the stash are sold on the spot', () => {
    const c = newTscCampaign(3);
    fillStash(c, c.cfg.stashCap);
    const before = c.eagles;
    const r = buyPack(c);
    expect(r.sold).toHaveLength(5);
    expect(c.stash).toHaveLength(c.cfg.stashCap);
    expect(c.eagles).toBe(before - 10 + 5);
  });

  it('cannot buy without the Eagles', () => {
    const c = newTscCampaign(4);
    c.eagles = 9;
    expect(() => buyPack(c)).toThrow();
  });
});

describe('launching', () => {
  it('takes the purse and the chosen pack out of the bank and the stash', () => {
    const c = newTscCampaign(5);
    buyPack(c);
    const picked = [c.stash[1]!, c.stash[3]!];
    const x = go(c, 10, [1, 3]);
    expect(c.eagles).toBe(30 - 10 - 10);
    expect(c.stash).toHaveLength(3);
    expect(x.eagles).toBe(10);
    expect(x.pack).toEqual(picked);
    expect(x.cfg.squad).toHaveLength(5);
    expect(c.run).not.toBeNull();
  });

  it('refuses a bad loadout', () => {
    const c = newTscCampaign(6);
    expect(launchProblem(c, { purse: 31, pack: [] })).not.toBeNull();
    expect(launchProblem(c, { purse: 0, pack: [0] })).not.toBeNull();
    fillStash(c, 12);
    expect(launchProblem(c, { purse: 0, pack: [0, 1, 2, 3, 4, 5, 6, 7, 8] })).toMatch(/full/);
    expect(launchProblem(c, { purse: 0, pack: [0, 0] })).not.toBeNull();
    expect(maxPurse(c) % 5).toBe(0);
  });

  it('cannot launch twice or spend while a run is out', () => {
    const c = newTscCampaign(7);
    go(c);
    expect(() => launch(c, { purse: 0, pack: [] })).toThrow();
    expect(() => buyPack(c)).toThrow();
  });
});

describe('coming home', () => {
  it('banks the purse and the pack when the floor is done, and shares out XP', () => {
    const c = newTscCampaign(8);
    buyPack(c);
    const x = go(c, 10, [0, 1]);
    x.eagles += 7;
    x.pack.push(c.cfg.lootPool[0]!);
    x.xpEach = 6;
    x.stats.sections = 3;
    x.status = 'done';
    const d = returnHome(c, x);
    expect(c.eagles).toBe(30 - 10 - 10 + 17);
    expect(c.stash).toHaveLength(3 + 3);
    expect(c.crew.every((m) => m.xp === 6 + 5)).toBe(true);
    expect(c.power).toBe(3);
    expect(c.run).toBeNull();
    expect(c.expeditions).toBe(1);
    expect(d.lines.length).toBeGreaterThan(0);
  });

  it('a retreat banks everything but gives no floor bonus', () => {
    const c = newTscCampaign(9);
    const x = go(c, 10);
    x.xpEach = 2;
    x.status = 'retreated';
    returnHome(c, x);
    expect(c.eagles).toBe(30);
    expect(c.crew.every((m) => m.xp === 2)).toBe(true);
  });

  it('a wipe loses the purse and the pack but keeps the XP from fights won', () => {
    const c = newTscCampaign(10);
    buyPack(c);
    const x = go(c, 10, [0, 1, 2]);
    x.xpEach = 3;
    x.status = 'wiped';
    returnHome(c, x);
    expect(c.eagles).toBe(30 - 10 - 10);
    expect(c.stash).toHaveLength(2);
    expect(c.wipes).toBe(1);
    expect(c.crew.every((m) => m.xp === 3)).toBe(true);
    expect(c.power).toBe(0);
  });

  it('cannot come home from a running expedition', () => {
    const c = newTscCampaign(11);
    const x = go(c);
    expect(() => returnHome(c, x)).toThrow();
  });

  it('fight XP climbs with the fight tier', () => {
    expect([0, 1, 2, 3].map(fightXp)).toEqual([1, 2, 3, 4]);
  });
});

describe('abandoning', () => {
  it('loses the purse and pack but is not a wipe', () => {
    const c = newTscCampaign(30);
    buyPack(c);
    go(c, 10, [0]);
    abandon(c);
    expect(c.run).toBeNull();
    expect(c.eagles).toBe(10);
    expect(c.wipes).toBe(0);
    expect(c.expeditions).toBe(0);
  });
});

describe('promotion', () => {
  it('costs XP and Eagles (20, 40, 80, 160), adds a tier and max HP', () => {
    const c = newTscCampaign(12);
    const m = c.crew[0]!;
    expect(canPromote(c, m)).toBe(false);
    m.xp = 25;
    c.eagles = 25;
    const hp = templateOf(c, m).hp;
    expect(canPromote(c, m)).toBe(true);
    promote(c, m);
    expect(m.tier).toBe(2);
    expect(m.xp).toBe(5);
    expect(c.eagles).toBe(5);
    expect(templateOf(c, m).hp).toBe(hp + 1);
    expect(() => promote(c, m)).toThrow();
  });

  it('stops at tier 5 and cannot happen while a run is out', () => {
    const c = newTscCampaign(13);
    const m = c.crew[1]!;
    m.xp = 9999;
    c.eagles = 9999;
    for (let i = 0; i < 4; i++) promote(c, m);
    expect(m.tier).toBe(5);
    expect(canPromote(c, m)).toBe(false);
    go(c, 0);
    expect(canPromote(c, c.crew[2]!)).toBe(false);
  });

  it('promoted HP goes into the next expedition squad', () => {
    const c = newTscCampaign(14);
    const m = c.crew[3]!;
    m.xp = 20;
    c.eagles = 40;
    promote(c, m);
    const x = go(c, 0);
    expect(x.cfg.squad[3]!.hp).toBe(m.base.hp + 1);
    expect(x.hp[3]).toBe(m.base.hp + 1);
  });
});

describe('aftermath and repairs', () => {
  const card = (name: string, kind: 'short-term' | 'lasting' | 'severe', repair: 'free reboot' | 'minor' | 'major' | 'none') =>
    ({ name, cards: 1, kind, repair, effect: '' });

  it('a downed droid draws a lasting result; a minor repair is instant and costs 1', () => {
    const c = newTscCampaign(15);
    const x = go(c, 0);
    x.downs[2] = 1;
    x.status = 'retreated';
    c.aftermath = [card('Optics Damaged', 'lasting', 'minor')];
    returnHome(c, x);
    const m = c.crew[2]!;
    expect(m.damage).toEqual({ name: 'Optics Damaged', severity: 'minor' });
    expect(readyCrew(c)).toHaveLength(4);
    expect(repairCost(c, m)).toBe(1);
    const before = c.eagles;
    repair(c, m);
    expect(m.damage).toBeNull();
    expect(c.eagles).toBe(before - 1);
    expect(readyCrew(c)).toHaveLength(5);
  });

  it('a major repair costs 3 and keeps the droid out for one expedition', () => {
    const c = newTscCampaign(16);
    let x = go(c, 0);
    x.downs[0] = 1;
    x.status = 'retreated';
    c.aftermath = [card('Frame Damage', 'lasting', 'major')];
    returnHome(c, x);
    const m = c.crew[0]!;
    expect(repairCost(c, m)).toBe(3);
    repair(c, m);
    expect(m.repairing).toBe(true);
    expect(readyCrew(c)).toHaveLength(4);
    x = go(c, 0);
    expect(x.cfg.squad).toHaveLength(4);
    x.status = 'retreated';
    returnHome(c, x);
    expect(m.damage).toBeNull();
    expect(m.repairing).toBe(false);
    expect(readyCrew(c)).toHaveLength(5);
  });

  it('unrepaired damage sits out the next expedition', () => {
    const c = newTscCampaign(17);
    let x = go(c, 0);
    x.downs[4] = 1;
    x.status = 'retreated';
    c.aftermath = [card('Manipulator Damaged', 'lasting', 'minor')];
    returnHome(c, x);
    x = go(c, 0);
    expect(x.cfg.squad.map((u) => u.name)).not.toContain('Repair');
  });

  it('Head Destroyed removes the droid for good', () => {
    const c = newTscCampaign(18);
    const x = go(c, 0);
    x.downs[1] = 1;
    x.status = 'wiped';
    c.aftermath = [card('Head Destroyed', 'severe', 'none')];
    const d = returnHome(c, x);
    expect(c.crew.map((m) => m.name)).not.toContain('Line B');
    expect(c.fallen).toEqual(['Line B']);
    expect(d.lines.join(' ')).toMatch(/Lost for good/);
  });

  it('short-term results are free; Firmware Patch pays bonus XP', () => {
    const c = newTscCampaign(19);
    const x = go(c, 0);
    x.downs[0] = 2;
    x.status = 'retreated';
    c.aftermath = [card('Firmware Patch', 'short-term', 'free reboot'), card('System Shutdown', 'short-term', 'free reboot')];
    returnHome(c, x);
    expect(c.crew[0]!.damage).toBeNull();
    expect(c.crew[0]!.xp).toBe(3);
  });

  it('the real deck has 35 cards and refills when it runs dry', () => {
    const c = newTscCampaign(20);
    expect(c.cfg.aftermath.reduce((n, a) => n + a.cards, 0)).toBe(35);
    const x = go(c, 0);
    x.downs[0] = 40;
    x.status = 'retreated';
    returnHome(c, x);
    expect(c.crew.length).toBeLessThanOrEqual(5);
  });

  it('a droid can only get worse until repaired', () => {
    const c = newTscCampaign(21);
    const x = go(c, 0);
    x.downs[0] = 2;
    x.status = 'retreated';
    c.aftermath = [card('Optics Damaged', 'lasting', 'minor'), card('Frame Damage', 'lasting', 'major')];
    returnHome(c, x);
    expect(c.crew[0]!.damage!.severity).toBe('major');
  });
});

describe('short-term results that ride into the next fight', () => {
  const card = (name: string) => ({ name, cards: 1, kind: 'short-term' as const, repair: 'free reboot' as const, effect: '' });

  it('Glitching starts the next fight Suppressed and Rebooting starts it Stunned, then they are used up', () => {
    const c = newTscCampaign(31);
    const x = go(c, 0);
    x.downs[0] = 1;
    x.downs[1] = 1;
    x.status = 'retreated';
    c.aftermath = [card('Glitching'), card('Rebooting')];
    const d = returnHome(c, x);
    expect(d.lines.join(' ')).toMatch(/Glitching.*Suppressed for 2 rounds/);
    expect(c.crew[0]!.nextFight).toEqual({ stunned: true });
    expect(c.crew[1]!.nextFight).toEqual({ suppressed: 2 });
    const y = go(c, 0);
    expect(y.cfg.startFx).toEqual([{ stunned: true }, { suppressed: 2 }, null, null, null]);
    expect(y.fx).toEqual([{ stunned: true }, { suppressed: 2 }, null, null, null]);
    expect(c.crew[0]!.nextFight).toBeNull();
    expect(c.crew[1]!.nextFight).toBeNull();
  });
});

describe('footholds', () => {
  const take = (c: Campaign, fn: 'power' | 'supply', tier = 1, rooms = 9, status: Expedition['status'] = 'retreated'): void => {
    const x = go(c, 0);
    x.captures.push({ fn, section: 0, tier, rooms });
    x.status = status;
    returnHome(c, x);
  };

  it('a control room won and brought home is recorded and costs power to claim', () => {
    const c = newTscCampaign(40);
    take(c, 'power', 3, 9);
    expect(c.footholds).toEqual([{ fn: 'power', tier: 3, rooms: 9, cost: 3, claimed: false }]);
    expect(claimProblem(c, 'power')).toBe('Needs 3 power');
    c.power = 5;
    claimFoothold(c, 'power');
    expect(c.power).toBe(2);
    expect(c.footholds[0]!.claimed).toBe(true);
    expect(claimProblem(c, 'power')).toBe('Already claimed');
  });

  it('a wipe loses the capture', () => {
    const c = newTscCampaign(41);
    take(c, 'power', 1, 9, 'wiped');
    expect(c.footholds).toHaveLength(0);
  });

  it('a claimed foothold pays power every expedition, scaled by its tier', () => {
    const c = newTscCampaign(42);
    take(c, 'supply', 7, 6);
    c.power = 10;
    claimFoothold(c, 'supply');
    const before = c.power;
    const x = go(c, 0);
    x.status = 'retreated';
    returnHome(c, x);
    expect(c.power).toBe(before + 4);
  });

  it('claimed and unclaimed functions do not spawn control rooms again', () => {
    const c = newTscCampaign(43);
    take(c, 'power');
    const x = go(c, 0);
    expect(x.cfg.skipFns).toEqual(['power']);
  });

  it('cannot claim a foothold you do not hold, or while the crew are out', () => {
    const c = newTscCampaign(44);
    expect(claimProblem(c, 'secure')).toBe('Not taken yet');
    take(c, 'power');
    c.power = 9;
    go(c, 0);
    expect(claimProblem(c, 'power')).toBe('The crew are out');
  });
});
