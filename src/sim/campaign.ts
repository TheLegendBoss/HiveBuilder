import { gearInfo, isEquippable, isSlotted, starterItems } from '../data/gear';
import { rollPack } from './packs';
import { shuffleInPlace } from './rng';
import type { Expedition, ExpeditionConfig, FightFx, LootItem, SectionFn } from './expedition';
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
  /** power a claimed foothold pays each expedition, by the tier of its section */
  footholdIncome: (tier: number) => number;
  /** power it takes to claim a taken section, by its room count */
  claimCost: (rooms: number) => number;
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
  /** a short-term result that rides into the next fight (Glitching, Rebooting) */
  nextFight?: FightFx | null;
  /** gear in the slots: weapons, armor, tool. Role gear (skills, the sight) stays on `base`. */
  equipped: LootItem[];
}

/** A control room the gang has won. It earns nothing until it is claimed with power. */
export interface Foothold {
  fn: SectionFn;
  tier: number;
  rooms: number;
  cost: number;
  claimed: boolean;
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
  /** control rooms won, claimed or not; one per section function */
  footholds: Foothold[];
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
    footholds: [],
    aftermath: [],
    expeditions: 0,
    wipes: 0,
    run: null,
    nextId: 1
  };
  cfg.crew.forEach((t) => c.crew.push({ id: c.nextId++, name: t.name, base: t, tier: 1, xp: 0, damage: null, repairing: false, equipped: starterEquipped(t) }));
  return c;
}

// ---------- crew

/** The starter kit of a chassis, as items: the slotted gear from its template. */
export function starterEquipped(t: UnitTemplate): LootItem[] {
  return t.gear.filter(isSlotted).flatMap((n) => starterItems.filter((i) => i.name === n));
}

/**
 * The template a crew member goes on the road as: promotions add max HP, and the slotted gear sets the gear list,
 * the armor pool (Max soak) and the ammo pool.
 */
export function templateOf(c: Campaign, m: CrewMember): UnitTemplate {
  const eq = m.equipped ?? starterEquipped(m.base);
  const infos = eq.map((i) => gearInfo(i.name)).filter((i) => !!i);
  const armor = infos.reduce((n, i) => n + i!.maxSoak, 0);
  const ammo = infos.reduce((n, i) => n + i!.ammo, 0);
  const t: UnitTemplate = {
    ...m.base,
    gear: [...eq.map((i) => i.name), ...m.base.gear.filter((n) => !isSlotted(n))],
    armor,
    hp: m.base.hp + (m.tier - 1) * c.cfg.hpPerTier
  };
  if (ammo > 0) t.ammo = ammo;
  else delete t.ammo;
  return t;
}

// ---------- slots

export const weaponSlots = (m: CrewMember): number => m.base.weaponSlots ?? 2;

/** Weapon slots in use: each weapon takes its hands, shields one. */
export function handsUsed(m: CrewMember): number {
  return m.equipped.reduce((n, i) => n + (gearInfo(i.name)?.slot === 'weapon' ? gearInfo(i.name)!.hands : 0), 0);
}

/** Why this item cannot go on this crew member, or null when it fits (armor and tools swap with what is there). */
export function equipProblem(c: Campaign, m: CrewMember, item: LootItem): string | null {
  if (c.run) return 'The crew are out';
  const info = gearInfo(item.name);
  if (!isEquippable(item) || !info) return `${item.name} does not go in a slot`;
  if (info.slot === 'weapon' && handsUsed(m) + info.hands > weaponSlots(m)) {
    return `${m.name} has no room: ${item.name} needs ${info.hands} weapon slot${info.hands > 1 ? 's' : ''}, ${weaponSlots(m) - handsUsed(m)} free`;
  }
  return null;
}

/** Put a stash item into a slot. An armor or tool already there goes back to the stash. */
export function equip(c: Campaign, m: CrewMember, stashIndex: number): string {
  const item = c.stash[stashIndex];
  if (!item) throw new Error('no such stash slot');
  const problem = equipProblem(c, m, item);
  if (problem) throw new Error(problem);
  const slot = gearInfo(item.name)!.slot;
  c.stash.splice(stashIndex, 1);
  let note = `${m.name} takes the ${item.name}`;
  if (slot !== 'weapon') {
    const at = m.equipped.findIndex((i) => gearInfo(i.name)?.slot === slot);
    if (at >= 0) {
      const [old] = m.equipped.splice(at, 1);
      c.stash.push(old!);
      note += `; the ${old!.name} goes back to the stash`;
    }
  }
  m.equipped.push(item);
  return note;
}

/** Take a piece of gear off. It goes to the stash, which must have room. */
export function unequip(c: Campaign, m: CrewMember, index: number): string {
  if (c.run) throw new Error('The crew are out');
  const item = m.equipped[index];
  if (!item) throw new Error('nothing in that slot');
  m.equipped.splice(index, 1);
  c.stash.push(item);
  return `${m.name} puts the ${item.name} in the stash`;
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

/** Buy a pack: its cards roll rarity on the Basic ramp and all go to the stash, which has no cap. */
export function buyPack(c: Campaign): { got: LootItem[] } {
  if (!canBuyPack(c)) throw new Error('cannot buy a pack');
  c.eagles -= c.cfg.packPrice;
  const got = rollPack(c, c.cfg.lootPool, 'Basic', c.cfg.packDraws);
  c.stash.push(...got);
  return { got };
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
export function launch(c: Campaign, l: Loadout): Pick<ExpeditionConfig, 'squad' | 'startEagles' | 'startPack' | 'startFx' | 'skipFns'> {
  const problem = launchProblem(c, l);
  if (problem) throw new Error(problem);
  const crew = readyCrew(c);
  const startPack = l.pack.map((i) => c.stash[i]!);
  const gone = new Set(l.pack);
  c.stash = c.stash.filter((_, i) => !gone.has(i));
  c.eagles -= l.purse;
  c.run = { crewIds: crew.map((m) => m.id), purse: l.purse, repairing: c.crew.filter((m) => m.repairing).map((m) => m.id) };
  const startFx = crew.map((m) => m.nextFight ?? null);
  for (const m of crew) m.nextFight = null;
  return {
    squad: crew.map((m) => templateOf(c, m)),
    startEagles: l.purse,
    startPack,
    startFx,
    skipFns: c.footholds.map((f) => f.fn)
  };
}

/** Walk away from a run in progress: the purse and pack are gone, nothing else happens. */
export function abandon(c: Campaign): string {
  if (!c.run) throw new Error('no run is out');
  const purse = c.run.purse;
  c.run = null;
  return `Abandoned the run: the purse (${purse} Eagles) and the pack are gone.`;
}

/** Power it takes to claim this foothold now, or null when it is already claimed or the crew are out. */
export function claimProblem(c: Campaign, fn: SectionFn): string | null {
  const f = c.footholds.find((q) => q.fn === fn);
  if (!f) return 'Not taken yet';
  if (f.claimed) return 'Already claimed';
  if (c.run) return 'The crew are out';
  if (c.power < f.cost) return `Needs ${f.cost} power`;
  return null;
}

export function claimFoothold(c: Campaign, fn: SectionFn): string {
  const problem = claimProblem(c, fn);
  if (problem) throw new Error(problem);
  const f = c.footholds.find((q) => q.fn === fn)!;
  c.power -= f.cost;
  f.claimed = true;
  return `Claimed the ${fn} section for ${f.cost} power. It pays ${c.cfg.footholdIncome(f.tier)} power every expedition.`;
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
    c.stash.push(...x.pack);
    lines.push(`Banked ${x.eagles} Eagles and ${x.pack.length} items.`);
  }

  // claimed footholds pay every expedition, then any control rooms won this run are recorded
  c.footholds ??= [];
  for (const f of c.footholds.filter((q) => q.claimed)) {
    const p = c.cfg.footholdIncome(f.tier);
    c.power += p;
    lines.push(`+${p} power from the ${f.fn} foothold.`);
  }
  if (x.status !== 'wiped') {
    for (const cap of x.captures) {
      if (c.footholds.some((f) => f.fn === cap.fn)) continue;
      c.footholds.push({ fn: cap.fn, tier: cap.tier, rooms: cap.rooms, cost: c.cfg.claimCost(cap.rooms), claimed: false });
      lines.push(`The ${cap.fn} control room is ours. Claiming it costs ${c.cfg.claimCost(cap.rooms)} power at the HQ.`);
    }
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
        } else if (card.name === 'Glitching') {
          m.nextFight = { ...m.nextFight, suppressed: 2 };
          lines.push(`${m.name}: Glitching. Starts the next fight Suppressed for 2 rounds.`);
        } else if (card.name === 'Rebooting') {
          m.nextFight = { ...m.nextFight, stunned: true };
          lines.push(`${m.name}: Rebooting. Starts the next fight Stunned.`);
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
