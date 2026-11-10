import { lootPool } from './loot';
import { fallbackAction, gearActions as starterActions, type GearAction, type Rider } from './gearActions';
import type { LootItem } from '../sim/expedition';

/**
 * Gear as the crew can carry it. The loot pool gives each item's class and its white version as text; this file reads
 * that text into slots, hands, passives and combat actions. Everything the reader does not understand is listed in
 * `unsupported` and does nothing in a fight yet.
 */

export type SlotKind = 'weapon' | 'armor' | 'tool' | 'other';

export interface GearInfo {
  name: string;
  cls: string;
  slot: SlotKind;
  /** weapon slots it takes: one-handed 1, two-handed 2 (shields take one) */
  hands: number;
  /** adds to the wearer's armor soak pool */
  maxSoak: number;
  /** adds to the wearer's ammo pool */
  ammo: number;
  actions: GearAction[];
  /** text of lines the combat engine cannot run yet */
  unsupported: string[];
}

/** Working rule: weapon hands per class, flipped by light and heavy (design.md, weapon classes). */
function handsOf(cls: string): number {
  const c = cls.toLowerCase();
  const base = ['line', 'support', 'precision', 'special'].some((k) => c.startsWith(k) || c.includes(k)) ? 2 : 1;
  if (c.includes('melee') && c.includes('heavy')) return 2;
  if (c.includes('heavy') && base === 1) return 2;
  if (c.includes('light') && base === 2) return 1;
  return base;
}

function slotOf(cls: string): SlotKind {
  const c = cls.toLowerCase();
  if (c.startsWith('armor')) return 'armor';
  // The accessory slot is the old tool slot (design.md, open question on extra slots).
  if (c.startsWith('tool') || c.startsWith('accessory')) return 'tool';
  const weapon = ['melee', 'sidearm', 'close', 'line', 'precision', 'support', 'explosive', 'defense'];
  // Supplies, disposables (belt items) and attachments are not slotted.
  return weapon.some((k) => c.startsWith(k)) ? 'weapon' : 'other';
}

const bandRiders: Record<string, Rider> = { stunned: 'stunned', exposed: 'exposed', suppressed: 'suppressed' };

/** Read one "(fuel): Name - effect" line. Returns null when the effect is something the engine does not do yet. */
function readAction(gear: string, cls: string, line: string, ammo: number): GearAction | null {
  const m = /^\((\d+)\):\s*([^-]+?)\s+-\s+(.+)$/.exec(line.trim());
  if (!m) return null;
  let fuel = Number(m[1]);
  const name = m[2]!;
  const text = m[3]!;
  const act: GearAction = { gear, name, fuel, dmg: 0, targets: 1, ammo: ammo > 0 ? 1 : 0 };
  const dmg = /Deal (\d+)(?: to (\d+))? damage to (one enemy|two enemies|every enemy in the lane)/.exec(text);
  const soak = /^Restore (\d+) soak\.?$/.exec(text);
  const heal = /^Restore (\d+) HP to one unit in this lane\.?$/.exec(text);
  if (dmg) {
    act.dmg = Number(dmg[1]);
    if (dmg[2]) act.dmgMax = Number(dmg[2]);
    if (dmg[3] === 'two enemies') act.targets = 2;
    if (dmg[3] === 'every enemy in the lane') act.area = true;
    const pierce = /ignoring (\d+) soak/.exec(text);
    if (pierce) act.pierce = Number(pierce[1]);
    const riders: Rider[] = [];
    for (const r of text.matchAll(/apply (Stunned|Exposed|Suppressed)/g)) riders.push(bandRiders[r[1]!.toLowerCase()]!);
    if (riders.length) act.riders = riders;
    if (/If it is the only target/.test(text)) act.riderSolo = true;
    // Working rule: a wind-up has no timer for the squad yet, so it costs that many extra fuel instead.
    const wind = /Wind-up (\d+)/.exec(text);
    if (wind) fuel += Number(wind[1]);
    act.fuel = fuel;
    void cls;
    return act;
  }
  if (soak) {
    act.soak = Number(soak[1]);
    act.ammo = 0;
    return act;
  }
  if (heal) {
    act.heal = Number(heal[1]);
    act.ammo = 0;
    return act;
  }
  return null;
}

function readLoot(item: LootItem): GearInfo {
  const info: GearInfo = {
    name: item.name,
    cls: item.cls,
    slot: slotOf(item.cls),
    hands: slotOf(item.cls) === 'weapon' ? handsOf(item.cls) : 0,
    maxSoak: 0,
    ammo: 0,
    actions: [],
    unsupported: []
  };
  // "Defense" gear (shields) takes a weapon slot, so it stays a weapon-slot item with one hand.
  if (item.cls.toLowerCase().startsWith('defense')) info.hands = 1;
  const lines = item.text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    const ammo = /^Passive: Ammo - (\d+)/.exec(l);
    const ms = /^Passive: Max soak - (\d+)/.exec(l);
    if (ammo) info.ammo = Number(ammo[1]);
    else if (ms) info.maxSoak = Number(ms[1]);
  }
  for (const l of lines) {
    if (/^Passive: (Ammo|Max soak)/.test(l)) continue;
    const act = l.startsWith('(') ? readAction(item.name, item.cls, l, info.ammo) : null;
    if (act) info.actions.push(act);
    else info.unsupported.push(l);
  }
  return info;
}

// ---------- the TSC starter kit, as items that can be taken off and put back

const starterDefs: Array<{ item: LootItem; info: Omit<GearInfo, 'name' | 'cls' | 'unsupported'> & { unsupported?: string[] } }> = [
  {
    item: { id: 101, name: 'Autogun', cls: 'Line', text: '(1): Single shot - Deal 2 damage to one enemy.', use: null },
    info: { slot: 'weapon', hands: 2, maxSoak: 0, ammo: 0, actions: starterActions.filter((a) => a.gear === 'Autogun') }
  },
  {
    item: { id: 102, name: 'Heavy autofire', cls: 'Support', text: '(2): Autofire - Deal 2 damage to up to two enemies.\nPassive: Ammo - 4.', use: null },
    info: { slot: 'weapon', hands: 2, maxSoak: 0, ammo: 4, actions: starterActions.filter((a) => a.gear === 'Heavy autofire') }
  },
  {
    item: { id: 103, name: 'Combat shield', cls: 'Defense', text: 'Passive: Max soak - 2.', use: null },
    info: { slot: 'weapon', hands: 1, maxSoak: 2, ammo: 0, actions: [] }
  },
  {
    item: { id: 104, name: 'Light plating', cls: 'Armor, light', text: 'Passive: Max soak - 3.', use: null },
    info: { slot: 'armor', hands: 0, maxSoak: 3, ammo: 0, actions: [] }
  },
  {
    item: { id: 105, name: 'Repair kit', cls: 'Tool', text: 'Adds the Jury-Rig and Field Fix cards.', use: null },
    info: { slot: 'tool', hands: 0, maxSoak: 0, ammo: 0, actions: [] }
  }
];

export const starterItems: LootItem[] = starterDefs.map((d) => d.item);

const infoByName = new Map<string, GearInfo>();
for (const d of starterDefs) infoByName.set(d.item.name, { name: d.item.name, cls: d.item.cls, unsupported: [], ...d.info });
for (const it of lootPool) infoByName.set(it.name, readLoot(it));

/** What an item is as gear, or undefined for supplies and role gear. Items that are not gear have slot 'other'. */
export function gearInfo(name: string): GearInfo | undefined {
  return infoByName.get(name);
}

/** Gear that sits in a slot and can be taken off. Everything else a unit carries (skills, the sight) stays on it. */
export const isSlotted = (name: string): boolean => {
  const i = infoByName.get(name);
  return !!i && i.slot !== 'other';
};

/** Whether the crew can slot this item. */
export const isEquippable = (item: LootItem): boolean => isSlotted(item.name);

/** Every combat action a piece of gear offers, loot and starter alike. */
export const gearActions: GearAction[] = [...infoByName.values()].flatMap((i) => i.actions);

export { fallbackAction };
export type { GearAction };
