import { hazardDefs, hazardNeeds } from './hazards';
import roomDeckCsv from '../../data/starter_room_deck.csv?raw';
import { parseCsv } from '../sim/csv';
import { ROOM_TYPES, finishFight, type Expedition, type ExpeditionConfig, type RoomType } from '../sim/expedition';
import { nextRandom } from '../sim/rng';
import { createGame } from '../sim/state';
import type { Game } from '../sim/types';
import { bosses, forces, type Force } from './forces';
import { controlRooms } from './control';
import { gambleDefs, gambleLadders } from './gambles';
import { lootPool } from './loot';
import { tscSquad, tscVsForce } from './scenarios';

/** The 21-card starter room deck, expanded to one entry per card. */
export const starterRoomDeck: RoomType[] = parseCsv(roomDeckCsv).flatMap((r) => {
  const type = r.room_type as RoomType;
  if (!ROOM_TYPES.includes(type)) throw new Error(`unknown room type ${r.room_type}`);
  return Array.from({ length: Number(r.cards) }, () => type);
});

/** Working numbers for the sandbox expedition; see decisions.md. */
export const expeditionDefaults = { sections: 3, rations: 24, clinicHeal: 3, restHeal: 2, startEagles: 10, packSize: 8, packPrice: 10, packDraws: 5, sellValue: 1 };

export function tscExpedition(seed: number, over: Partial<ExpeditionConfig> = {}): ExpeditionConfig {
  return {
    seed,
    controlRooms,
    fnOffset: Math.floor((seed % 5 + 5) % 5),
    squad: tscSquad,
    roomDeck: starterRoomDeck,
    forceIds: forces.map((f) => f.id),
    lootPool,
    gambles: gambleDefs,
    hazards: hazardDefs,
    hazardNeeds,
    ladders: gambleLadders,
    ...expeditionDefaults,
    ...over
  };
}

export const forceById = (id: string): Force => [...forces, ...bosses].find((f) => f.id === id) ?? forces[0]!;

/** Build the fight the expedition is waiting on: this room's force at this tier, with the squad's current HP. */
export function startFight(x: Expedition): { game: Game; force: Force } {
  const p = x.pending;
  if (!p || p.kind !== 'fight') throw new Error('no fight pending');
  const force = forceById(p.force);
  const seed = Math.floor(nextRandom(x) * 0x7fffffff);
  const squadFx = x.fx;
  x.fx = x.fx.map(() => null);
  return { game: createGame(tscVsForce(force, p.step, x.cfg.squad), seed, { squadHp: x.hp, squadFx }), force };
}

/** Carry a finished fight back into the expedition. */
export function settleFight(x: Expedition, game: Game, force: Force): void {
  const hp = game.units.filter((u) => u.side === 'P').map((u) => u.hp);
  finishFight(x, game.result === 'win', hp, force.reward);
}
