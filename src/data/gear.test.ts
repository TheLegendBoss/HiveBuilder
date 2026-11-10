import { describe, expect, it } from 'vitest';
import { gearInfo, isSlotted, starterItems } from './gear';

describe('gear registry', () => {
  it('reads weapon classes into slots and hands', () => {
    expect(gearInfo('Hive revolver')).toMatchObject({ slot: 'weapon', hands: 1, ammo: 6 });
    expect(gearInfo('Hand cannon')?.hands).toBe(2);
    expect(gearInfo('Scrap cleaver')?.hands).toBe(1);
    expect(gearInfo('Power maul')?.hands).toBe(2);
    expect(gearInfo('Surplus autogun')?.hands).toBe(2);
    expect(gearInfo('Riot shield')).toMatchObject({ slot: 'weapon', hands: 1, maxSoak: 3 });
    expect(gearInfo('Composite vest')).toMatchObject({ slot: 'armor', maxSoak: 3 });
    expect(gearInfo('Field medkit')?.slot).toBe('tool');
    expect(gearInfo('Red-dot sight')?.slot).toBe('other');
    expect(gearInfo('Smoke canister')?.slot).toBe('other');
    expect(gearInfo('Frag grenade')?.slot).toBe('other');
    expect(gearInfo('Hive rations')?.slot).toBe('other');
    expect(gearInfo('Adrenal injector')?.slot).toBe('tool');
  });

  it('reads damage, ranges, areas and riders', () => {
    const shotgun = gearInfo('Pump shotgun')!.actions;
    expect(shotgun.map((a) => [a.name, a.fuel, a.dmg, a.dmgMax])).toEqual([['Blast', 1, 1, 3], ['Slug', 2, 3, undefined]]);
    expect(gearInfo('Arc blade')!.actions[1]).toMatchObject({ riders: ['stunned'], riderSolo: true });
    expect(gearInfo('Lasrifle')!.actions[1]).toMatchObject({ dmg: 3, targets: 2 });
    expect(gearInfo('Long-las')!.actions[0]).toMatchObject({ dmg: 4, pierce: 2, fuel: 3 });
    expect(gearInfo('Heavy stubber')!.actions[0]).toMatchObject({ area: true, dmg: 1, riders: ['suppressed'] });
    expect(gearInfo('Grenade belt')!.actions[0]).toMatchObject({ area: true, dmg: 2, ammo: 1 });
    expect(gearInfo('Composite vest')!.actions[0]).toMatchObject({ soak: 2, fuel: 0 });
    expect(gearInfo('Field medkit')!.actions[0]).toMatchObject({ heal: 2, fuel: 1 });
  });

  it('keeps what it cannot run in the unsupported list', () => {
    expect(gearInfo('Riot shield')!.actions).toHaveLength(0);
    expect(gearInfo('Riot shield')!.unsupported[0]).toMatch(/Block/);
    expect(gearInfo('Hive carapace')!.unsupported.some((l) => /Heavy Frame/.test(l))).toBe(true);
  });

  it('turns the starter kit into slotted items', () => {
    expect(starterItems.map((i) => i.name)).toEqual(['Autogun', 'Heavy autofire', 'Combat shield', 'Light plating', 'Repair kit']);
    expect(isSlotted('Autogun')).toBe(true);
    expect(isSlotted('Line droid skill')).toBe(false);
    expect(isSlotted('Laser Sight')).toBe(false);
  });
});
