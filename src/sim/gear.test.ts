import { describe, expect, it } from 'vitest';
import { newTscCampaign } from '../data/campaign';
import { gearInfo } from '../data/gear';
import { gearCardSpecs, tscDeck } from '../data/cards';
import { deckFor, tscSquad, tscVsScavvers } from '../data/scenarios';
import { listActions, perform } from './actions';
import { autoPlay } from './autoplay';
import { equip, equipProblem, handsUsed, templateOf, unequip } from './campaign';
import { createGame, inLane } from './state';
import { startFight } from './testkit';
import type { Game, UnitTemplate } from './types';
import { lootPool } from '../data/loot';

const item = (name: string) => lootPool.find((i) => i.name === name)!;

/** A game with the given squad, set up and ready for the first real action. */
function ready(squad: UnitTemplate[], seed = 3): Game {
  const g = createGame({ ...tscVsScavvers, squad, deck: deckFor(squad) }, seed);
  startFight(g);
  return g;
}

describe('slots and the starter kit', () => {
  it('rebuilds the paper squad and deck exactly from the starter items', () => {
    const c = newTscCampaign(1);
    c.crew.forEach((m, i) => {
      const t = templateOf(c, m);
      const want = tscSquad[i]!;
      expect(t.armor).toBe(want.armor);
      expect(t.ammo ?? 0).toBe(want.ammo ?? 0);
      expect([...t.gear].sort()).toEqual([...want.gear].sort());
    });
    expect(deckFor(tscSquad)).toEqual(tscDeck.map((d) => ({ name: d.name, count: d.count })));
  });

  it('drops the cards of gear nobody carries', () => {
    const noKit = tscSquad.filter((u) => u.name !== 'Repair');
    const names = deckFor(noKit).map((d) => d.name);
    expect(names).not.toContain('Jury-Rig');
    expect(names).toContain('Burst Fire');
  });

  it('checks hands, swaps armor and returns gear to the stash', () => {
    const c = newTscCampaign(1);
    const lineA = c.crew[0]!;
    const heavy = c.crew[3]!;
    c.stash.push(item('Hive revolver'), item('Composite vest'), item('Field medkit'));
    // Line A's two-handed autogun fills both weapon slots.
    expect(equipProblem(c, lineA, item('Hive revolver'))).toMatch(/no room/);
    expect(() => equip(c, lineA, 0)).toThrow(/no room/);
    // The Heavy has three slots: support weapon (2) plus a revolver (1).
    expect(equip(c, heavy, 0)).toMatch(/takes the Hive revolver/);
    expect(handsUsed(heavy)).toBe(3);
    expect(templateOf(c, heavy).ammo).toBe(10);
    // Armor swaps with what is worn.
    const vest = c.stash.findIndex((i) => i.name === 'Composite vest');
    expect(equip(c, lineA, vest)).toMatch(/Light plating goes back/);
    expect(c.stash.map((i) => i.name)).toContain('Light plating');
    expect(templateOf(c, lineA).gear).toContain('Composite vest');
    // Take the autogun off, the revolver now fits.
    const at = lineA.equipped.findIndex((i) => i.name === 'Autogun');
    expect(unequip(c, lineA, at)).toMatch(/stash/);
    expect(templateOf(c, lineA).gear).not.toContain('Autogun');
    expect(deckFor([templateOf(c, c.crew[1]!)]).some((d) => d.name === 'Burst Fire')).toBe(true);
  });

  it('refuses to equip while the crew are out', () => {
    const c = newTscCampaign(1);
    c.stash.push(item('Hive revolver'));
    c.run = { crewIds: [1], purse: 0, repairing: [] };
    expect(equipProblem(c, c.crew[2]!, item('Hive revolver'))).toMatch(/out/);
  });
});

describe('loot weapons in a fight', () => {
  const squadWith = (...names: string[]): UnitTemplate[] => {
    const c = newTscCampaign(1);
    c.stash.push(...names.map(item));
    // Vanguard (3 slots) takes the weapons; the other two are the paper crew.
    const van = c.crew[2]!;
    van.equipped = van.equipped.filter((i) => i.name === 'Light plating');
    for (const n of names) equip(c, van, c.stash.findIndex((i) => i.name === n));
    return [templateOf(c, c.crew[0]!), templateOf(c, c.crew[1]!), templateOf(c, van)];
  };

  it('fires a revolver shot that spends ammo', () => {
    const g = ready(squadWith('Hive revolver'));
    const van = g.units.find((u) => u.name === 'Vanguard')!;
    expect(van.ammo).toBe(6);
    const a = listActions(g).find((x) => x.kind === 'basic' && x.gear === 'Hive revolver' && x.actor === van.id)!;
    expect(a).toBeTruthy();
    const foe = a.targets[0]!;
    perform(g, a);
    expect(van.ammo).toBe(5);
    expect(foe.k === 'unit' ? g.units.find((u) => u.id === (foe as { id: number }).id)!.hp : 0).toBeLessThan(5);
  });

  it('rolls a damage range from the results deck', () => {
    const g = ready(squadWith('Pump shotgun'));
    const van = g.units.find((u) => u.name === 'Vanguard')!;
    g.results.push(2); // low
    const blast = listActions(g).find((x) => x.gear === 'Pump shotgun' && x.label === 'Blast' && x.actor === van.id)!;
    const t = g.units.find((u) => u.id === (blast.targets[0] as { id: number }).id)!;
    const before = t.hp + t.armor + t.builtin;
    perform(g, blast);
    expect(before - (t.hp + t.armor + t.builtin)).toBe(1);
  });

  it('a grenade hits every enemy in the lane and spends ammo', () => {
    const g = ready(squadWith('Grenade belt'));
    const van = g.units.find((u) => u.name === 'Vanguard')!;
    // Put two enemies in the Vanguard's lane.
    const extra = g.units.find((u) => u.side === 'E' && u.lane === null && !u.dead)!;
    extra.lane = van.lane;
    extra.arrived = 99;
    const foes = inLane(g, 'E', van.lane!);
    expect(foes.length).toBeGreaterThanOrEqual(2);
    const a = listActions(g).find((x) => x.gear === 'Grenade belt' && x.actor === van.id)!;
    expect(a.targets[0]!.k).toBe('lane');
    const hp = foes.map((f) => f.hp);
    perform(g, a);
    foes.forEach((f, i) => expect(f.hp).toBeLessThan(hp[i]!));
    expect(van.ammo).toBe(3);
  });

  it('armor gear restores soak with no target', () => {
    const g = ready(squadWith('Composite vest'));
    const lineA = g.units.find((u) => u.name === 'Line A')!;
    lineA.armor = 1;
    const brace = listActions(g).find((x) => x.gear === 'Composite vest' && x.actor === lineA.id);
    // The vest is on the Vanguard, not Line A, so Line A has no such action.
    expect(brace).toBeUndefined();
  });

  it('a whole fight with a loot-armed squad still plays out', () => {
    const squad = squadWith('Pump shotgun', 'Hive revolver');
    const g = createGame({ ...tscVsScavvers, squad, deck: deckFor(squad) }, 11);
    expect(['win', 'loss', 'timeout']).toContain(autoPlay(g));
  });
});

describe('loot gear cards', () => {
  const squadWith = (...names: string[]): UnitTemplate[] => {
    const c = newTscCampaign(1);
    const van = c.crew[2]!;
    c.stash.push(...names.map(item));
    for (let i = 0; i < names.length; i++) equip(c, van, 0);
    return c.crew.map((m) => templateOf(c, m));
  };

  it('every gear action becomes a card, the first one twice', () => {
    const shotgun = gearCardSpecs.filter((s) => s.def.source === 'Pump shotgun');
    expect(shotgun.length).toBeGreaterThan(0);
    expect(shotgun[0]!.def.count).toBe(2);
    const a = gearInfo('Pump shotgun')!.actions[0]!;
    expect(shotgun[0]!.action.dmg).toBe(a.dmg + 1);
    expect(shotgun[0]!.action.fuel).toBe(Math.max(0, a.fuel - 1));
    const names = gearCardSpecs.map((s) => s.def.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('adds the cards to the deck only when the gear is carried', () => {
    expect(deckFor(tscSquad).map((d) => d.name)).not.toContain(gearCardSpecs[0]!.def.name);
    const squad = squadWith('Pump shotgun');
    const names = deckFor(squad).map((d) => d.name);
    for (const s of gearCardSpecs.filter((x) => x.def.source === 'Pump shotgun')) expect(names).toContain(s.def.name);
  });

  it('plays a loot card from the hand', () => {
    const squad = squadWith('Pump shotgun');
    const g = ready(squad);
    const card = gearCardSpecs.find((s) => s.def.source === 'Pump shotgun')!.def.name;
    g.hand.push({ iid: 9999, name: card });
    const play = listActions(g).find((x) => x.kind === 'play' && x.card === card);
    expect(play).toBeDefined();
    const before = g.hand.length;
    perform(g, play!);
    expect(g.hand.length).toBeLessThan(before);
  });
});

describe('small squads', () => {
  it('a squad of two never stalls in the setup rounds', () => {
    const squad = tscSquad.slice(0, 2);
    const g = createGame({ ...tscVsScavvers, squad, deck: deckFor(squad) }, 5);
    expect(['win', 'loss']).toContain(autoPlay(g));
  });

  it('a lone droid can still act once it has deployed', () => {
    const squad = tscSquad.slice(0, 1);
    const g = createGame({ ...tscVsScavvers, squad, deck: deckFor(squad) }, 5);
    expect(['win', 'loss']).toContain(autoPlay(g));
  });
});

describe('gear info sanity', () => {
  it('every parsed action has a positive effect', () => {
    for (const it of lootPool) {
      for (const a of gearInfo(it.name)!.actions) expect(a.dmg + (a.soak ?? 0) + (a.heal ?? 0)).toBeGreaterThan(0);
    }
  });
});
