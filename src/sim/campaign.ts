import { nextRandom, shuffleInPlace } from './rng';
import type { Expedition, ExpeditionConfig, LootItem } from './expedition';
import type { UnitTemplate } from './types';

/** One result in the aftermath deck. Droids only for now (data/aftermath_deck_droid.csv). */
export interface AftermathCard {
  name: string;
  /** how many copies sit in the deck */
  cards: number;
  kind: 'short-term' | 'lasting' | 'severe';
  /** short-term results are free reboots; lasting ones are fixed at the charging station */
  repair: 'free reboot' | 'minor' | 'major' | 'none';
  effect: string;
}

export interface CampaignConfig {
  faction: string;
  crew: UnitTemplate[];
  lootPool: LootItem[];
  aftermath: AftermathCard[];
  startEagles: number;
  stashCap: number;
  packSize: number;
  /** HQ market: Eagles for a pack of loot draws, and what a spare sells for */
  packPrice: number;
  packDraws: number;
  sellValue: number;
  /** promotion to tier n+1 costs promoCosts[n-1] XP and the same in Eagles */
  promoCosts: number[];
  maxTier: number;
  /** extra max HP per tier above 1 */
  hpPerTier: number;
  /** repairs cost this times the chassis tier */
  minorRepair: number;
  majorRepair: number;
  /** XP every crew member on the run earns for a completed floor */
  floorBonusXp: number;
  /** bonus XP from a Firmware Patch result */
  patchXp: number;
  /** power earned per section cleared (working) */
  powerPerSection: number;
  /** Eagles a run may start with, in steps of this */
  purseStep: number;
}

export interface Damage {
  name: string;
  severity: 'minor' | 'major';
}

export interface CrewMember {
  id: number;
  name: string;
  /** the tier 1 template: HP and soak before promotions */
  base: UnitTemplate;
  tier: number;
  xp: number;
  damage: Damage | null;
  /** a major repair has been paid for and finishes when the next expedition ends */
  repairing: boolean;
}

export interface Run {
  /** crew ids in squad order */
  crewIds: number[];
  purse: number;
  /** ids of the crew that were mid-repair when the run left */
  repairing: number[];
}

export interface Campaign {
  cfg: CampaignConfig;
  rng: number;
  eagles: number;
  /** the spendable pool: counted now, nothing to spend it on until the passive tree */
  power: number;
  stash: LootItem[];
  crew: CrewMember[];
  /** names of crew lost for good */
  fallen: string[];
  aftermath: AftermathCard[];
  expeditions: number;
  wipes: number;
  run: Run | null;
  nextId: number;
}

export interface Debrief {
  status: Expedition['status'];
  lines: string[];
}

export function createCampaign(cfg: CampaignConfig, seed: number): Campaign {
  const c: Campaign = {
    cfg,
    rng: seed | 0,
    eagles: cfg.startEagles,
    power: 0,
    stash: [],
    crew: [],
    fallen: [],
    aftermath: [],
    expeditions: 0,
    wipes: 0,
    run: null,
    nextId: 1
  };
  cfg.crew.forEach((t) => c.crew.push({ id: c.nextId++, name: t.name, base: t, tier: 1, xp: 0, damage: null, repairing: false }));
  return c;
}

// ---------- crew

/** The template a crew member goes on the road as: promotions add max HP. */
export function templateOf(c: Campaign, m: CrewMember): UnitTemplate {
  return { ...m.base, gear: [...m.base.gear], hp: m.base.hp + (m.tier - 1) * c.cfg.hpPerTier };
}

/** Crew who can go: no damage, nothing waiting on a repair. */
export const isReady = (m: CrewMember): boolean => m.damage === null && !m.repairing;

export const readyCrew = (c: Campaign): CrewMember[] => c.crew.filter(isReady);

/** Perk slots are recorded but nothing uses them yet. */
export const perkSlots = (m: CrewMember): number => m.tier - 1;

export function promoCost(c: Campaign, m: CrewMember): number | null {
  return m.tier >= c.cfg.maxTier ? null : (c.cfg.promoCosts[m.tier - 1] ?? null);
}

export function canPromote(c: Campaign, m: CrewMember): boolean {
  const cost = promoCost(c, m);
  return cost !== null && m.xp >= cost && c.eagles >= cost && !c.run;
}

/** Spend XP and Eagles for the next tier. */
export function promote(c: Campaign, m: CrewMember): void {
  const cost = promoCost(c, m);
  if (cost === null) throw new Error(`${m.name} is at the top tier`);
  if (!canPromote(c, m)) throw new Error(`${m.name} cannot be promoted yet`);
  m.xp -= cost;
  c.eagles -= cost;
  m.tier++;
}

/** Charging station price: 1 Eagle for a minor repair, 3 for a major, times the chassis tier (all chassis are tier 1 for now). */
export function repairCost(c: Campaign, m: CrewMember): number | null {
  if (!m.damage || m.repairing) return null;
  return (m.damage.severity === 'minor' ? c.cfg.minorRepair : c.cfg.majorRepair) * 1;
}

export function canRepair(c: Campaign, m: CrewMember): boolean {
  const cost = repairCost(c, m);
  return cost !== null && c.eagles >= cost && !c.run;
}

/** Minor repairs are instant. Major repairs are paid now and finish when the next expedition ends. */
export function repair(c: Campaign, m: CrewMember): string {
  const cost = repairCost(c, m);
  if (cost === null || !canRepair(c, m)) throw new Error(`cannot repair ${m.name}`);
  c.eagles -= cost;
  if (m.damage!.severity === 'minor') {
    const was = m.damage!.name;
    m.damage = null;
    return `${m.name}: ${was} repaired for ${cost} Eagles`;
  }
  m.repairing = true;
  return `${m.name}: ${m.damage!.name} sent to the bench for ${cost} Eagles; back after the next expedition`;
}

// ---------- market and stash

export const canBuyPack = (c: Campaign): boolean => c.eagles >= c.cfg.packPrice && !c.run;

/** Buy a pack: loot draws from the pool (with replacement) go to the stash; any that do not fit are sold on the spot. */
export function buyPack(c: Campaign): { got: LootItem[]; sold: LootItem[] } {
  if (!canBuyPack(c)) throw new Error('cannot buy a pack');
  c.eagles -= c.cfg.packPrice;
  const got: LootItem[] = [];
  const sold: LootItem[] = [];
  for (let i = 0; i < c.cfg.packDraws; i++) {
    const item = c.cfg.lootPool[Math.floor(nextRandom(c) * c.cfg.lootPool.length)]!;
    if (c.stash.length < c.cfg.stashCap) {
      c.stash.push(item);
      got.push(item);
    } else {
      c.eagles += c.cfg.sellValue;
      sold.push(item);
    }
  }
  return { got, sold };
}

export function sellStash(c: Campaign, index: number): LootItem {
  if (c.run) throw new Error('crew are out on a run');
  const item = c.stash[index];
  if (!item) throw new Error('no such stash slot');
  c.stash.splice(index, 1);
  c.eagles += c.cfg.sellValue;
  return item;
}

// ---------- the road

export const maxPurse = (c: Campaign): number => Math.floor(c.eagles / c.cfg.purseStep) * c.cfg.purseStep;

export interface Loadout {
  /** Eagles carried onto the floor */
  purse: number;
  /** stash indexes going in the pack */
  pack: number[];
}

/** Why the squad cannot leave, or null when it can. */
export function launchProblem(c: Campaign, l: Loadout): string | null {
  if (c.run) return 'A run is already out';
  if (readyCrew(c).length === 0) return 'Nobody is fit to go';
  if (l.purse < 0 || l.purse > c.eagles) return 'Not enough Eagles for that purse';
  if (l.pack.length > c.cfg.packSize) return 'The pack is full';
  if (new Set(l.pack).size !== l.pack.length || l.pack.some((i) => !c.stash[i])) return 'Bad pack choice';
  return null;
}

/**
 * Take the purse and the pack out of the bank and the stash, and say who goes.
 * Returns the squad, the starting pack and the purse for `createExpedition`.
 */
export function launch(c: Campaign, l: Loadout): Pick<ExpeditionConfig, 'squad' | 'startEagles' | 'startPack'> {
  const problem = launchProblem(c, l);
  if (problem) throw new Error(problem);
  const crew = readyCrew(c);
  const startPack = l.pack.map((i) => c.stash[i]!);
  const gone = new Set(l.pack);
  c.stash = c.stash.filter((_, i) => !gone.has(i));
  c.eagles -= l.purse;
  c.run = { crewIds: crew.map((m) => m.id), purse: l.purse, repairing: c.crew.filter((m) => m.repairing).map((m) => m.id) };
  return { squad: crew.map((m) => templateOf(c, m)), startEagles: l.purse, startPack };
}

/** Walk away from a run in progress: the purse and pack are gone, nothing else happens. */
export function abandon(c: Campaign): string {
  if (!c.run) throw new Error('no run is out');
  const purse = c.run.purse;
  c.run = null;
  return `Abandoned the run: the purse (${purse} Eagles) and the pack are gone.`;
}

/** Draw one aftermath card, reshuffling a fresh deck when it runs out. */
function drawAftermath(c: Campaign): AftermathCard {
  if (c.aftermath.length === 0) {
    c.aftermath = c.cfg.aftermath.flatMap((a) => Array.from({ length: a.cards }, () => a));
    shuffleInPlace(c.aftermath, c);
  }
  return c.aftermath.pop()!;
}

const rank = (d: Damage | null): number => (d === null ? 0 : d.severity === 'minor' ? 1 : 2);

/**
 * Bring a finished run home: purse and pack come back (unless the squad was wiped), XP is shared out,
 * downed crew draw from the aftermath deck, power is counted and finished repairs come off the bench.
 */
export function returnHome(c: Campaign, x: Expedition): Debrief {
  const run = c.run;
  if (!run) throw new Error('no run is out');
  if (x.status === 'running') throw new Error('the expedition is still running');
  const lines: string[] = [];
  c.expeditions++;
  const going = run.crewIds.map((id) => c.crew.find((m) => m.id === id)!);

  // repairs that were on the bench when the squad left are done
  for (const id of run.repairing) {
    const m = c.crew.find((q) => q.id === id);
    if (m && m.repairing) {
      lines.push(`${m.name}: ${m.damage?.name ?? 'damage'} repaired`);
      m.repairing = false;
      m.damage = null;
    }
  }

  // purse and pack
  if (x.status === 'wiped') {
    c.wipes++;
    lines.push(`The squad was overwhelmed. The purse (${x.eagles} Eagles) and the pack (${x.pack.length} items) are lost.`);
  } else {
    c.eagles += x.eagles;
    let sold = 0;
    for (const item of x.pack) {
      if (c.stash.length < c.cfg.stashCap) c.stash.push(item);
      else {
        c.eagles += c.cfg.sellValue;
        sold++;
      }
    }
    lines.push(`Banked ${x.eagles} Eagles and ${x.pack.length - sold} items${sold ? ` (${sold} sold: the stash is full)` : ''}.`);
  }

  // power
  if (x.status !== 'wiped' && x.stats.sections > 0) {
    const p = x.stats.sections * c.cfg.powerPerSection;
    c.power += p;
    lines.push(`+${p} power for ${x.stats.sections} section${x.stats.sections === 1 ? '' : 's'} cleared.`);
  }

  // XP: a share for each fight won, a bonus for a finished floor, and the gamble pool to the member with the least
  let each = x.xpEach;
  if (x.status === 'done') each += c.cfg.floorBonusXp;
  for (const m of going) m.xp += each;
  if (each > 0) lines.push(`${each} XP each${x.status === 'done' ? ` (includes ${c.cfg.floorBonusXp} for the finished floor)` : ''}.`);
  if (x.stats.xp > 0 && going.length) {
    const least = [...going].sort((a, b) => a.tier - b.tier || a.xp - b.xp)[0]!;
    least.xp += x.stats.xp;
    lines.push(`${least.name} won ${x.stats.xp} XP at the Pit side bet.`);
  }

  // downed crew draw from the aftermath deck, once per fight they ended downed
  going.forEach((m, i) => {
    const downs = x.downs[i] ?? 0;
    for (let k = 0; k < downs; k++) {
      const card = drawAftermath(c);
      if (card.name === 'Head Destroyed') {
        lines.push(`${m.name}: Head Destroyed. Lost for good.`);
        c.crew = c.crew.filter((q) => q.id !== m.id);
        c.fallen.push(m.name);
        break;
      }
      if (card.kind === 'short-term') {
        if (card.name === 'Firmware Patch') {
          m.xp += c.cfg.patchXp;
          lines.push(`${m.name}: Firmware Patch, ${c.cfg.patchXp} bonus XP.`);
        } else lines.push(`${m.name}: ${card.name}, a free reboot.`);
        continue;
      }
      const sev: Damage['severity'] = card.repair === 'minor' ? 'minor' : 'major';
      const next: Damage = { name: card.name, severity: sev };
      if (rank(next) > rank(m.damage)) m.damage = next;
      lines.push(`${m.name}: ${card.name} (${sev} repair).`);
    }
  });

  c.run = null;
  return { status: x.status, lines };
}
