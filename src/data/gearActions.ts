/** Basic gear actions: what a unit can do without playing a card. Fuel is paid by burning cards. */
export type Rider = 'stunned' | 'exposed' | 'suppressed';

export interface GearAction {
  gear: string;
  name: string;
  fuel: number;
  /** damage; with `dmgMax` set it is the low end of a results-deck range */
  dmg: number;
  /** most units hit (the player picks up to this many) */
  targets: number;
  ammo: number;
  /** top of a damage range: a results card picks low (A to 5), mid (6 to 9) or high (10 to K) */
  dmgMax?: number;
  /** hits every enemy in one lane instead of picking targets */
  area?: boolean;
  /** this much soak is ignored by the hit */
  pierce?: number;
  /** statuses put on a unit that is hit */
  riders?: Rider[];
  /** the riders only land when the action has a single target */
  riderSolo?: boolean;
  /** restores this much soak to the user (no target) */
  soak?: number;
  /** restores this much HP to one unit in the user's lane */
  heal?: number;
}

export const gearActions: GearAction[] = [
  { gear: 'Autogun', name: 'Single shot', fuel: 1, dmg: 2, targets: 1, ammo: 0 },
  { gear: 'Heavy autofire', name: 'Autofire', fuel: 2, dmg: 2, targets: 2, ammo: 1 }
];

/** Every unit can fall back on the free armory weapon. It is the floor, not the scale. */
export const fallbackAction: GearAction = { gear: 'Armory', name: 'Stub pistol', fuel: 1, dmg: 1, targets: 1, ammo: 0 };
