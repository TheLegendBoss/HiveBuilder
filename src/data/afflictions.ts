import afflictionsCsv from '../../data/afflictions.csv?raw';
import humanoidCsv from '../../data/aftermath_deck_humanoid.csv?raw';
import virtuesCsv from '../../data/virtues.csv?raw';
import type { Affliction, AfflictionGroup, InjuryCard, Virtue } from '../sim/afflictions';
import { parseCsv } from '../sim/csv';

export const afflictions: Affliction[] = parseCsv(afflictionsCsv).map((r) => ({
  name: r.name!,
  group: r.group as AfflictionGroup,
  type: r.type as Affliction['type'],
  effect: r.effect!,
  consumableCure: r.consumable_cure === 'yes'
}));

export const virtues: Virtue[] = parseCsv(virtuesCsv).map((r) => ({ name: r.name!, type: r.type!, effect: r.effect! }));

/** The 35-card humanoid aftermath deck (injury faces). */
export const humanoidInjuries: InjuryCard[] = parseCsv(humanoidCsv).map((r) => ({
  name: r.result!,
  cards: Number(r.cards),
  group: r.type as AfflictionGroup,
  effect: r.effect!
}));
