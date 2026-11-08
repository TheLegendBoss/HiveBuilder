/** Basic gear actions: what a unit can do without playing a card. Fuel is paid by burning cards. */
export interface GearAction {
  gear: string;
  name: string;
  fuel: number;
  dmg: number;
  /** most units hit (the player picks up to this many) */
  targets: number;
  ammo: number;
}

export const gearActions: GearAction[] = [
  { gear: 'Autogun', name: 'Single shot', fuel: 1, dmg: 2, targets: 1, ammo: 0 },
  { gear: 'Heavy autofire', name: 'Autofire', fuel: 2, dmg: 2, targets: 2, ammo: 1 }
];

/** Every unit can fall back on the free armory weapon. It is the floor, not the scale. */
export const fallbackAction: GearAction = { gear: 'Armory', name: 'Stub pistol', fuel: 1, dmg: 1, targets: 1, ammo: 0 };
