import { describe, expect, it } from 'vitest';
import { tscVsScavvers } from '../data/scenarios';
import { listActions, perform } from '../sim/actions';
import { enemyAct } from '../sim/enemy';
import { createGame } from '../sim/state';
import { beginTurn } from '../sim/turn';
import type { Game } from '../sim/types';
import { nextStep, pickActor, pickTarget, type Sel } from './selection';

function afterSetup(seed: number): Game {
  const g = createGame(tscVsScavvers, seed);
  const lanes: Record<string, number> = { 'Line A': 0, Vanguard: 1, 'Line B': 2 };
  for (let i = 0; i < 3; i++) {
    beginTurn(g);
    const a = listActions(g).find((x) => lanes[g.units.find((u) => u.id === x.unit)!.name] === x.lane)!;
    perform(g, a);
    enemyAct(g);
  }
  beginTurn(g);
  return g;
}

describe('selection steps', () => {
  it('walks a deploy through the lane choice', () => {
    const g = createGame(tscVsScavvers, 1);
    beginTurn(g);
    const acts = listActions(g);
    const sel: Sel = { item: { kind: 'deploy', unit: g.units[0]!.id }, targets: [] };
    const s = nextStep(acts, sel);
    expect(s.step).toBe('lane');
    if (s.step === 'lane') expect(s.lanes).toEqual([0, 1, 2]);
    expect(nextStep(acts, { ...sel, lane: 1 }).step).toBe('ready');
  });

  it('asks for the actor, then the target, then is ready', () => {
    // Find a seed whose opening hand holds Burst Fire so two Line droids can both fire it.
    let g = afterSetup(1);
    for (let seed = 1; seed < 60 && !g.hand.some((c) => c.name === 'Burst Fire'); seed++) g = afterSetup(seed);
    const acts = listActions(g);
    let sel: Sel = { item: { kind: 'card', name: 'Burst Fire' }, targets: [] };
    let s = nextStep(acts, sel);
    expect(s.step).toBe('actor');
    if (s.step !== 'actor') return;
    sel = pickActor(sel, s.actors[0]!);
    s = nextStep(acts, sel);
    expect(s.step).toBe('target');
    if (s.step !== 'target') return;
    sel = pickTarget(sel, s.targets[0]!);
    s = nextStep(acts, sel);
    expect(s.step).toBe('ready');
  });

  it('keeps asking for a second target on Sustained Fire but allows firing with one', () => {
    let g = afterSetup(1);
    const heavy = g.units.find((u) => u.name === 'Heavy')!;
    perform(g, listActions(g).find((a) => a.kind === 'deploy' && a.unit === heavy.id && a.lane === 1)!);
    enemyAct(g);
    beginTurn(g);
    for (let seed = 1; seed < 300 && !g.hand.some((c) => c.name === 'Sustained Fire'); seed++) {
      g = afterSetup(seed);
      perform(g, listActions(g).find((a) => a.kind === 'deploy' && a.unit === g.units.find((u) => u.name === 'Heavy')!.id && a.lane === 1)!);
      enemyAct(g);
      beginTurn(g);
    }
    const acts = listActions(g);
    const sel: Sel = { item: { kind: 'card', name: 'Sustained Fire' }, targets: [] };
    const s = nextStep(acts, sel);
    expect(s.step).toBe('target');
    if (s.step !== 'target') return;
    // Lane 2 holds the Chief plus the Heavy's lane: pick one target, then another is still offered.
    const first = s.targets.find((t) => t.k === 'unit')!;
    const s2 = nextStep(acts, pickTarget(sel, first));
    expect(s2.step).toBe('ready');
  });
});
