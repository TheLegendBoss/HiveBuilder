import { describe, expect, it } from 'vitest';
import { tscSquad } from '../data/scenarios';
import { loadoutOf } from './loadout';

describe('loadoutOf', () => {
  it('lists gear in order with its action and cards', () => {
    const line = loadoutOf(tscSquad[0]!.gear);
    expect(line.map((e) => e.gear)).toEqual(['Autogun', 'Light plating', 'Line droid skill', 'Laser Sight']);
    const gun = line[0]!;
    expect(gun.actions.map((a) => a.name)).toEqual(['Single shot']);
    expect(gun.cards.map((c) => c.name)).toEqual(['Burst Fire', 'Suppressing Fire']);
    expect(gun.type).toBe('weapon');
  });

  it('shows the armory pistol for a unit with no gear action', () => {
    const van = loadoutOf(tscSquad[2]!.gear);
    expect(van[van.length - 1]!.actions[0]!.name).toBe('Stub pistol');
  });

  it('does not add the pistol when the unit has a weapon', () => {
    const heavy = loadoutOf(tscSquad[3]!.gear);
    expect(heavy.some((e) => e.gear === 'Armory')).toBe(false);
  });
});
