import { targetKey } from '../sim/state';
import type { Action, Target } from '../sim/types';

/**
 * What the player has picked so far. A pick starts with an item (a card, a gear action,
 * a reserve unit to deploy, or discard-and-draw) and then narrows by actor, targets and variant.
 * Pure logic, no phaser, so the click and keyboard flows share one rule set.
 */
export interface Sel {
  item: { kind: 'card'; name: string } | { kind: 'gear'; label: string } | { kind: 'deploy'; unit: number } | { kind: 'cycle' };
  actor?: number;
  targets: Target[];
  variant?: string;
  lane?: number;
}

export type Step =
  | { step: 'actor'; actors: number[] }
  | { step: 'target'; targets: Target[] }
  | { step: 'lane'; lanes: number[] }
  | { step: 'variant'; variants: string[] }
  | { step: 'ready'; action: Action; moreTargets: Target[] }
  | { step: 'none' };

export function matches(a: Action, sel: Sel): boolean {
  const it = sel.item;
  if (it.kind === 'card' && !(a.kind === 'play' && a.card === it.name)) return false;
  if (it.kind === 'gear' && !(a.kind === 'basic' && a.label === it.label)) return false;
  if (it.kind === 'deploy' && !(a.kind === 'deploy' && a.unit === it.unit)) return false;
  if (it.kind === 'cycle' && a.kind !== 'cycle') return false;
  if (sel.actor !== undefined && a.actor !== sel.actor) return false;
  if (sel.lane !== undefined && a.lane !== sel.lane) return false;
  if (sel.variant !== undefined && a.variant !== sel.variant) return false;
  for (let i = 0; i < sel.targets.length; i++) {
    const t = a.targets[i];
    if (!t || targetKey(t) !== targetKey(sel.targets[i]!)) return false;
  }
  return true;
}

export function candidates(actions: Action[], sel: Sel): Action[] {
  return actions.filter((a) => matches(a, sel));
}

function uniqueTargets(list: Target[]): Target[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const k = targetKey(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** What the player needs to do next. */
export function nextStep(actions: Action[], sel: Sel): Step {
  const c = candidates(actions, sel);
  if (!c.length) return { step: 'none' };

  if (sel.item.kind === 'deploy') {
    if (sel.lane === undefined) return { step: 'lane', lanes: [...new Set(c.map((a) => a.lane!))].sort() };
    return { step: 'ready', action: c[0]!, moreTargets: [] };
  }

  const actors = [...new Set(c.map((a) => a.actor).filter((x): x is number => x !== undefined))];
  if (sel.actor === undefined && actors.length > 1) return { step: 'actor', actors };

  const n = sel.targets.length;
  const exact = c.filter((a) => a.targets.length === n);
  const more = uniqueTargets(c.filter((a) => a.targets.length > n).map((a) => a.targets[n]!));
  if (!exact.length) return { step: 'target', targets: more };

  const variants = [...new Set(exact.map((a) => a.variant).filter((v): v is string => v !== undefined))];
  if (sel.variant === undefined && variants.length > 1) return { step: 'variant', variants };
  return { step: 'ready', action: exact[0]!, moreTargets: more };
}

/**
 * Take every choice that has only one answer. A lone target, a lone open lane: nobody needs to click
 * them. Stops at the first step with a real choice (or when the action is fully specified).
 */
export function resolve(actions: Action[], sel: Sel): { sel: Sel; step: Step } {
  let cur = sel;
  for (let i = 0; i < 8; i++) {
    const step = nextStep(actions, cur);
    if (step.step === 'target' && step.targets.length === 1) cur = pickTarget(cur, step.targets[0]!);
    else if (step.step === 'lane' && step.lanes.length === 1) cur = pickLane(cur, step.lanes[0]!);
    else if (step.step === 'actor' && step.actors.length === 1) cur = pickActor(cur, step.actors[0]!);
    else return { sel: cur, step };
  }
  return { sel: cur, step: nextStep(actions, cur) };
}

/**
 * Does this finished pick still want a button press? Only when the player may add another target
 * (the optional second shot) or must name the cards to throw away.
 */
export function needsConfirm(step: Step, sel: Sel): boolean {
  if (sel.item.kind === 'cycle') return true;
  return step.step === 'ready' && step.moreTargets.length > 0;
}

/** Add a pick to the selection when it is a legal next choice; otherwise leave it as it was. */
export function pickActor(sel: Sel, id: number): Sel {
  return { ...sel, actor: id };
}

export function pickTarget(sel: Sel, t: Target): Sel {
  return { ...sel, targets: [...sel.targets, t] };
}

/** Picking a lane never clashes with the card flow: only deploy uses it. */
export function pickLane(sel: Sel, lane: number): Sel {
  return { ...sel, lane };
}

export function pickVariant(sel: Sel, variant: string): Sel {
  return { ...sel, variant };
}

/** Why a card cannot be played right now, in a few words. */
export function unplayableReason(args: {
  cardName: string;
  needsActor: boolean;
  source: string;
  hasReadyCarrier: boolean;
  carrierHasAmmo: boolean;
  fuelOk: boolean;
  setup: boolean;
}): string {
  if (args.setup) return 'Setup: deploy squad members first';
  if (args.needsActor && !args.hasReadyCarrier) return `No ready unit carries ${args.source}`;
  if (args.needsActor && !args.carrierHasAmmo) return 'Out of ammo';
  if (!args.fuelOk) return 'Not enough fuel in hand';
  return 'Nothing for it to do right now';
}
