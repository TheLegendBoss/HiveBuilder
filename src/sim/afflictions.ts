import { shuffleInPlace, type RngState } from './rng';

/**
 * The human side of the aftermath: double-faced injury cards, stress breaks, afflictions and virtues.
 * Droids have no stress track, so nothing here runs in a TSC campaign. It is built and tested ahead of the
 * Pressmen and Concord crews (see docs/design.md, "Affliction faces and virtues").
 */

export type AfflictionGroup = 'short-term' | 'lasting' | 'severe';
/** S stat penalty, C clog cards, T start-of-fight status, R rule twist. */
export type AfflictionType = 'S' | 'C' | 'T' | 'R' | 'S and C' | '-';

export interface Affliction {
  name: string;
  group: AfflictionGroup;
  type: AfflictionType;
  effect: string;
  /** a consumable can cure it */
  consumableCure: boolean;
}

export interface Virtue {
  name: string;
  type: string;
  effect: string;
}

export interface InjuryCard {
  name: string;
  /** copies in the deck */
  cards: number;
  group: AfflictionGroup;
  effect: string;
}

/** One physical card: the injury on one side, what a stress break reads on the other. */
export interface DualCard {
  injury: InjuryCard;
  /** Out Cold cards carry no affliction: Shaken (flee draw only) or Steeled (flee draw, and a virtue on a face card) */
  face: Affliction | 'shaken' | 'steeled';
}

export const FLEE_MAX = 5;
/** jack, queen and king */
export const VIRTUE_MIN = 11;

/**
 * Deal affliction faces onto a humanoid deck. Faces match by severity group; which card carries which face is random.
 * Out Cold splits evenly into Shaken and Steeled.
 */
export function dealDeck(injuries: InjuryCard[], afflictions: Affliction[], rng: RngState): DualCard[] {
  const out: DualCard[] = [];
  const pool = (g: AfflictionGroup): Affliction[] => {
    const p = afflictions.filter((a) => a.group === g);
    shuffleInPlace(p, rng);
    return p;
  };
  const faces: Record<AfflictionGroup, Affliction[]> = { 'short-term': pool('short-term'), lasting: pool('lasting'), severe: afflictions.filter((a) => a.group === 'severe') };
  for (const card of injuries) {
    for (let i = 0; i < card.cards; i++) {
      if (card.name === 'Out Cold') {
        out.push({ injury: card, face: i % 2 === 0 ? 'shaken' : 'steeled' });
      } else if (card.group === 'severe') {
        const want = card.name === 'Critical Injury' ? 'Broken' : 'Walks into the Dark';
        out.push({ injury: card, face: afflictions.find((a) => a.name === want)! });
      } else {
        // short-term and lasting faces are dealt once each; a deck with more cards than faces reuses them in a fresh shuffle
        const list = faces[card.group];
        if (list.length === 0) throw new Error(`no ${card.group} affliction faces`);
        out.push({ injury: card, face: list[out.filter((d) => d.injury.group === card.group).length % list.length]! });
      }
    }
  }
  shuffleInPlace(out, rng);
  return out;
}

export interface BreakResult {
  /** the affliction the unit gains, if the face carried one */
  affliction: Affliction | null;
  /** an ace to 5 on the flee draw: out of the lane for the rest of the fight, no injury */
  flees: boolean;
  /** a Steeled face with a jack, queen or king: two virtues offered, the player picks one */
  virtueOffer: [Virtue, Virtue] | null;
  /** the unit dies (Memorable Death's face) */
  dies: boolean;
}

/**
 * A unit fills its stress track: it reads the affliction face of a drawn card and draws a results card to see whether it flees.
 * Stress resets either way (the caller does that). `printed` is the virtue the Steeled face prints; a second is drawn at random.
 */
export function resolveBreak(card: DualCard, flee: number, virtues: Virtue[], rng: RngState): BreakResult {
  const face = card.face;
  const affliction = typeof face === 'string' ? null : face;
  const dies = affliction?.name === 'Walks into the Dark';
  let virtueOffer: BreakResult['virtueOffer'] = null;
  if (face === 'steeled' && flee >= VIRTUE_MIN && virtues.length >= 2) {
    const pick = [...virtues];
    shuffleInPlace(pick, rng);
    virtueOffer = [pick[0]!, pick[1]!];
  }
  return { affliction, flees: flee <= FLEE_MAX, virtueOffer, dies };
}

/** Short-term afflictions clear at a rest room or the end of the expedition; lasting ones need the new building or a consumable. */
export function cures(a: Affliction, how: 'rest' | 'consumable' | 'building'): boolean {
  if (how === 'building') return a.group !== 'severe' || a.name === 'Broken';
  if (a.group === 'short-term') return how === 'rest';
  return how === 'consumable' && a.consumableCure;
}
