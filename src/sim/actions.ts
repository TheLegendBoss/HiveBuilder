import { cardDefs } from '../data/cards';
import { fallbackAction, gearActions, type GearAction } from '../data/gear';
import { applyGearAction, cardRules, gearTargets, needsActor, type Variant } from './cards';
import {
  bump,
  checkResult,
  deployUnit,
  drawUp,
  inLane,
  inSetup,
  isLive,
  laneHasRoom,
  targetKey,
  unitById
} from './state';
import { endPlayerTurn, finishDeployment } from './turn';
import type { Action, Ev, Game, Target, Unit } from './types';

function fuelFor(g: Game, actor: Unit | null, base: number, gear: string | null): { fuel: number; baseFuel: number } {
  let f = base;
  if (actor && gear === 'Autogun' && actor.sight) f = Math.max(0, f - 1);
  if (actor && actor.suppressed > 0) f += 1;
  const baseFuel = f;
  if (g.discount > 0 && f > 0) f -= 1;
  return { fuel: f, baseFuel };
}

function targetsKey(ts: Target[]): string {
  return ts.map(targetKey).join('+');
}

function actorsFor(g: Game): Unit[] {
  return g.units.filter((u) => u.side === 'P' && u.lane !== null && isLive(u) && !u.stunned);
}

/** Fuel the rest of the hand can supply if the given card is played. */
export function fuelAvailable(g: Game, exceptIid: number | undefined): number {
  return g.hand.filter((c) => c.iid !== exceptIid).reduce((s, c) => s + (cardDefs[c.name]?.fuelValue ?? 1), 0);
}

function basicGearActions(actor: Unit): GearAction[] {
  const own = gearActions.filter((a) => actor.gear.includes(a.gear) && (a.ammo === 0 || actor.ammo >= a.ammo));
  // A unit with nothing that hurts (no weapon, or the ammo is gone) can always use the armory pistol.
  return own.some((a) => a.dmg > 0) ? own : [...own, fallbackAction];
}

/** Everything the player can do right now. Empty on the enemy's turn or when the fight is over. */
export function listActions(g: Game): Action[] {
  if (g.result) return [];
  const out: Action[] = [];

  // Deployment: any unit, any lane, one at a time; Ready ends it. Nothing else happens until then.
  if (inSetup(g)) {
    const placed = g.units.some((x) => x.side === 'P' && x.lane !== null && !x.dead);
    for (const u of g.units.filter((x) => x.side === 'P' && x.lane === null && isLive(x))) {
      for (let L = 0; L < 3; L++) {
        if (!laneHasRoom(g, 'P', L)) continue;
        out.push({
          key: `deploy:${u.id}:${L}`,
          kind: 'deploy',
          label: `Deploy ${u.name} to lane ${L + 1}`,
          unit: u.id,
          lane: L,
          targets: [],
          fuel: 0,
          baseFuel: 0,
          ammo: 0
        });
      }
    }
    if (placed) out.push({ key: 'ready', kind: 'ready', label: 'Ready', targets: [], fuel: 0, baseFuel: 0, ammo: 0 });
    return out;
  }
  if (g.turn !== 'P') return [];

  const actors = actorsFor(g);
  const seen = new Set<string>();
  for (const c of g.hand) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    const def = cardDefs[c.name];
    const rule = cardRules[c.name];
    if (!def || !rule) continue;
    const pool: Array<Unit | null> = needsActor(c.name) ? actors.filter((u) => u.gear.includes(def.source)) : [null];
    for (const actor of pool) {
      if (actor && actor.ammo < def.ammoCost) continue;
      const { fuel, baseFuel } = fuelFor(g, actor, def.playFuel, actor && def.source === 'Autogun' ? 'Autogun' : null);
      if (fuel > fuelAvailable(g, c.iid)) continue;
      for (const v of rule.options(g, actor) as Variant[]) {
        const key = `play:${c.name}:${actor?.id ?? 0}:${targetsKey(v.targets)}:${v.variant ?? ''}`;
        out.push({
          key,
          kind: 'play',
          label: c.name,
          card: c.name,
          cardIid: c.iid,
          actor: actor?.id,
          targets: v.targets,
          variant: v.variant,
          fuel,
          baseFuel,
          ammo: def.ammoCost
        });
      }
    }
  }

  for (const actor of actors) {
    for (const ga of basicGearActions(actor)) {
      const { fuel, baseFuel } = fuelFor(g, actor, ga.fuel, ga.gear);
      if (fuel > fuelAvailable(g, undefined)) continue;
      for (const targets of gearTargets(g, actor, ga)) {
        out.push({
          key: `basic:${ga.gear}:${ga.name}:${actor.id}:${targetsKey(targets)}`,
          kind: 'basic',
          label: ga.name,
          gear: ga.gear,
          actor: actor.id,
          targets,
          fuel,
          baseFuel,
          ammo: ga.ammo
        });
      }
    }
  }

  // Put Out: any unit can spend an action on putting a fire out on a unit in its lane (itself included).
  for (const actor of actors) {
    const { fuel, baseFuel } = fuelFor(g, actor, 1, null);
    if (fuel > fuelAvailable(g, undefined)) continue;
    for (const t of inLane(g, 'P', actor.lane!, false)) {
      if (t.burning <= 0 || t.dead) continue;
      out.push({
        key: `putout:${actor.id}:${t.id}`,
        kind: 'putout',
        label: 'Put Out',
        actor: actor.id,
        targets: [{ k: 'unit', id: t.id }],
        fuel,
        baseFuel,
        ammo: 0
      });
    }
  }

  if (g.hand.length > 0 && g.scenario.cycleLimit > 0) {
    out.push({ key: 'cycle', kind: 'cycle', label: 'Discard and draw', targets: [], fuel: 0, baseFuel: 0, ammo: 0 });
  }
  out.push({ key: 'pass', kind: 'pass', label: 'End turn', targets: [], fuel: 0, baseFuel: 0, ammo: 0 });
  return out;
}

/** Cards whose names appear in no available play action: the natural ones to burn. */
export function deadCards(g: Game, actions: Action[]): Set<string> {
  const used = new Set(actions.filter((a) => a.kind === 'play').map((a) => a.card!));
  return new Set(g.hand.filter((c) => !used.has(c.name)).map((c) => c.name));
}

/**
 * Cards to burn for an action's fuel. Cards with no play right now go first, then the ones
 * that turn up in the fewest plays per fuel point.
 */
export function suggestBurn(g: Game, a: Action, actions: Action[] = listActions(g)): number[] {
  if (a.fuel <= 0) return [];
  const uses: Record<string, number> = {};
  for (const x of actions) if (x.kind === 'play') uses[x.card!] = (uses[x.card!] ?? 0) + 1;
  const pool = g.hand
    .filter((c) => c.iid !== a.cardIid)
    .sort((p, q) => {
      const fp = cardDefs[p.name]?.fuelValue ?? 1;
      const fq = cardDefs[q.name]?.fuelValue ?? 1;
      return (uses[p.name] ?? 0) / fp - (uses[q.name] ?? 0) / fq || fq - fp;
    });
  const picked: number[] = [];
  let need = a.fuel;
  for (const c of pool) {
    if (need <= 0) break;
    picked.push(c.iid);
    need -= cardDefs[c.name]?.fuelValue ?? 1;
  }
  return picked;
}

function moveToDiscard(g: Game, iid: number): string {
  const i = g.hand.findIndex((c) => c.iid === iid);
  if (i < 0) throw new Error(`card ${iid} is not in hand`);
  const [c] = g.hand.splice(i, 1);
  g.discard.push(c!);
  return c!.name;
}

/**
 * Do an action from listActions. `cards` are the cards to burn for fuel, or for a discard-and-draw
 * the cards to throw away. Leave it out to burn the suggested cards.
 */
export function perform(g: Game, action: Action, cards?: number[]): Ev[] {
  const actions = listActions(g);
  const a = actions.find((x) => x.key === action.key);
  if (!a) throw new Error(`action not available: ${action.key}`);
  const ev: Ev[] = [];

  if (a.kind === 'cycle') {
    const chosen = cards ?? [];
    if (chosen.length < 1 || chosen.length > g.scenario.cycleLimit) {
      throw new Error(`discard between 1 and ${g.scenario.cycleLimit} cards`);
    }
    const names = chosen.map((iid) => moveToDiscard(g, iid));
    bump(g, 'cycled', names.length);
    ev.push({ t: 'discard', names });
    ev.push({ t: 'log', text: `Discarded ${names.join(', ')}` });
  } else if (a.kind === 'deploy') {
    const u = unitById(g, a.unit!);
    deployUnit(g, u, a.lane!, ev);
    ev.push({ t: 'log', text: `${u.name} deploys to lane ${a.lane! + 1}` });
    return ev;
  } else if (a.kind === 'ready') {
    ev.push({ t: 'log', text: 'The squad is ready.' });
    finishDeployment(g, ev);
    return ev;
  } else if (a.kind === 'pass') {
    ev.push({ t: 'log', text: 'The squad ends its turn.' });
    endPlayerTurn(g, ev);
    return ev;
  } else {
    const burn = a.fuel > 0 ? (cards ?? suggestBurn(g, a, actions)) : [];
    const have = burn.reduce((s, iid) => {
      const c = g.hand.find((x) => x.iid === iid);
      if (!c || iid === a.cardIid) throw new Error('cannot burn that card');
      return s + (cardDefs[c.name]?.fuelValue ?? 1);
    }, 0);
    if (have < a.fuel) throw new Error(`need ${a.fuel} fuel, burning ${have}`);
    const actor = a.actor ? unitById(g, a.actor) : null;

    if (a.cardIid !== undefined) {
      moveToDiscard(g, a.cardIid);
      bump(g, 'played');
      bump(g, `play_${a.card}`);
    }
    const burned = burn.map((iid) => moveToDiscard(g, iid));
    bump(g, 'burned', burned.length);
    for (const n of burned) bump(g, `burn_${n}`);
    ev.push({ t: 'played', card: a.card ?? null, actor: a.actor ?? null, burned });
    if (burned.length) ev.push({ t: 'log', text: `Burned ${burned.join(', ')} for fuel` });

    if (actor) actor.ammo -= a.ammo;
    if (g.discount > 0 && a.baseFuel > 0) g.discount -= 1;

    if (a.kind === 'play') {
      cardRules[a.card!]!.apply(g, actor, { targets: a.targets, variant: a.variant }, ev);
    } else if (a.kind === 'putout') {
      const t = unitById(g, (a.targets[0] as { id: number }).id);
      t.burning = 0;
      ev.push({ t: 'status', unit: t.id, status: 'burning', on: false });
      ev.push({ t: 'log', text: `${actor!.name} puts out the fire on ${t.name === actor!.name ? 'themself' : t.name}` });
    } else {
      const ga = [...gearActions, fallbackAction].find((x) => x.gear === a.gear && x.name === a.label)!;
      applyGearAction(g, actor!, ga, a.targets, ev);
    }
  }

  checkResult(g, ev);
  if (!g.result) {
    // One action spent. The hand refills before the next one; an empty pool ends the turn.
    g.pool -= 1;
    drawUp(g, ev);
    if (g.pool <= 0) endPlayerTurn(g, ev);
  }
  return ev;
}
