import { describe, expect, it } from 'vitest';
import { afflictions, humanoidInjuries, virtues } from '../data/afflictions';
import { FLEE_MAX, cures, dealDeck, resolveBreak } from './afflictions';

const rng = (seed: number) => ({ rng: seed });

describe('aftermath data', () => {
  it('loads the drafted lists: 8 short-term, 13 lasting and 2 severe afflictions, 8 virtues, a 35-card deck', () => {
    expect(afflictions.filter((a) => a.group === 'short-term')).toHaveLength(8);
    expect(afflictions.filter((a) => a.group === 'lasting')).toHaveLength(13);
    expect(afflictions.filter((a) => a.group === 'severe')).toHaveLength(2);
    expect(virtues).toHaveLength(8);
    expect(humanoidInjuries.reduce((n, c) => n + c.cards, 0)).toBe(35);
  });
});

describe('the double-faced deck', () => {
  it('pairs faces by severity: every short-term card reads a short-term affliction, lasting reads lasting', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const deck = dealDeck(humanoidInjuries, afflictions, rng(seed));
      expect(deck).toHaveLength(35);
      for (const d of deck) {
        if (typeof d.face === 'string') expect(d.injury.name).toBe('Out Cold');
        else expect(d.face.group).toBe(d.injury.group);
      }
      expect(deck.filter((d) => d.face === 'shaken')).toHaveLength(6);
      expect(deck.filter((d) => d.face === 'steeled')).toHaveLength(6);
      // each of the 13 lasting afflictions appears once, and each of the 8 short-term ones once
      const lasting = deck.filter((d) => typeof d.face !== 'string' && d.face.group === 'lasting').map((d) => (d.face as { name: string }).name);
      expect(new Set(lasting).size).toBe(13);
      const short = deck.filter((d) => typeof d.face !== 'string' && d.face.group === 'short-term').map((d) => (d.face as { name: string }).name);
      expect(new Set(short).size).toBe(8);
    }
  });

  it('Critical Injury reads Broken and Memorable Death reads Walks into the Dark', () => {
    const deck = dealDeck(humanoidInjuries, afflictions, rng(3));
    const crit = deck.find((d) => d.injury.name === 'Critical Injury')!;
    const dead = deck.find((d) => d.injury.name === 'Memorable Death')!;
    expect((crit.face as { name: string }).name).toBe('Broken');
    expect((dead.face as { name: string }).name).toBe('Walks into the Dark');
  });
});

describe('stress breaks', () => {
  const deck = dealDeck(humanoidInjuries, afflictions, rng(5));
  const steeled = deck.find((d) => d.face === 'steeled')!;
  const shaken = deck.find((d) => d.face === 'shaken')!;
  const lasting = deck.find((d) => d.injury.group === 'lasting')!;

  it('ace to 5 flees, 6 and up holds', () => {
    expect(resolveBreak(lasting, FLEE_MAX, virtues, rng(1)).flees).toBe(true);
    expect(resolveBreak(lasting, FLEE_MAX + 1, virtues, rng(1)).flees).toBe(false);
  });

  it('a lasting card hands out its affliction', () => {
    const r = resolveBreak(lasting, 7, virtues, rng(1));
    expect(r.affliction?.group).toBe('lasting');
    expect(r.dies).toBe(false);
  });

  it('only a Steeled face with a jack, queen or king offers a choice of two different virtues', () => {
    expect(resolveBreak(steeled, 10, virtues, rng(1)).virtueOffer).toBeNull();
    expect(resolveBreak(shaken, 13, virtues, rng(1)).virtueOffer).toBeNull();
    const r = resolveBreak(steeled, 12, virtues, rng(1));
    expect(r.virtueOffer).not.toBeNull();
    expect(r.virtueOffer![0].name).not.toBe(r.virtueOffer![1].name);
    expect(r.affliction).toBeNull();
  });

  it('Memorable Death kills', () => {
    const dead = deck.find((d) => d.injury.name === 'Memorable Death')!;
    expect(resolveBreak(dead, 9, virtues, rng(1)).dies).toBe(true);
  });
});

describe('cures', () => {
  it('rest clears short-term, a consumable only the marked lasting ones, the building any but Walks into the Dark', () => {
    const by = (n: string) => afflictions.find((a) => a.name === n)!;
    expect(cures(by('Tremors'), 'rest')).toBe(true);
    expect(cures(by('Hopeless'), 'rest')).toBe(false);
    expect(cures(by('Hopeless'), 'consumable')).toBe(true);
    expect(cures(by('Fearful'), 'consumable')).toBe(false);
    expect(cures(by('Fearful'), 'building')).toBe(true);
    expect(cures(by('Broken'), 'building')).toBe(true);
    expect(cures(by('Broken'), 'consumable')).toBe(false);
  });
});
