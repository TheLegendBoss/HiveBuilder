import tiersCsv from '../../data/hazard_gamble_tiers.csv?raw';
import { parseCsv } from '../sim/csv';
import type { HazardDef } from '../sim/expedition';

/** The six Hazard cards from the design doc. */
export const hazardDefs: HazardDef[] = [
  { id: 1, name: 'Collapsed gantry', attr: 'force', kind: 'obstacle', blurb: 'A fallen gantry blocks the way. Shift it or find another route.' },
  { id: 2, name: 'Sealed pressure door', attr: 'tech', kind: 'guarded', blurb: 'A pressure door seals a room. Whatever is inside has been kept dry.' },
  { id: 3, name: 'Choking haze', attr: 'nerve', kind: 'guarded', blurb: 'Fumes fill the room ahead. Holding your nerve means going in.' },
  { id: 4, name: 'Rotting catwalk', attr: 'wits', kind: 'obstacle', blurb: 'A rotted catwalk spans the gap. Pick your steps.' },
  { id: 5, name: 'Arcing cables', attr: 'tech', kind: 'guarded', blurb: 'Live cables whip across the doorway to a store room.' },
  { id: 6, name: 'Cult wards', attr: 'nerve', kind: 'guarded', blurb: 'Painted wards crowd a small shrine. The paint is still wet.' }
];

/** Threshold per tier as a low and high end, from the design table ("5 to 6" at tier 1 up to "13 to 14" at tier 8). */
export const hazardNeeds: Array<[number, number]> = parseCsv(tiersCsv).map((r) => {
  const [lo, hi] = r.hazard_threshold!.split(' to ').map(Number);
  return [lo!, hi!] as [number, number];
});

/** Room income in Eagles at each tier, from the same design table. */
export const roomIncome: number[] = parseCsv(tiersCsv).map((r) => Number(r.room_income_eagles));
