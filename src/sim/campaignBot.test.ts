import { describe, expect, it } from 'vitest';
import { newSandboxCampaign, launchTsc } from '../data/campaign';
import { defaultSetup } from '../data/sandbox';
import { startFight, settleFight } from '../data/rooms';
import { autoPlay } from './autoplay';
import { gearInfo } from '../data/gear';
import { equip, equipProblem, canPromote, promote, canRepair, repair, maxPurse, returnHome, readyCrew, type Campaign } from './campaign';
import { useItem, canPushHazard, closeHazard, pushHazard, testHazard, leaveControl, leaveLoot, takeLoot, leaveMarket, declineGamble, takeGate, move, retreat, openStorehouse, hasKey, type Expedition } from './expedition';

const blocked = new Set<number>();
function path(x: Expedition, want: (id: number) => boolean): number[] | null {
  const prev = new Map<number, number>(); const q = [x.at]; const seen = new Set([x.at]);
  while (q.length) { const id = q.shift()!;
    if (id !== x.at && want(id)) { const p = [id]; let c = id; while (prev.get(c) !== x.at) { c = prev.get(c)!; p.unshift(c); } return p; }
    for (const n of x.rooms[id]!.links) if (!seen.has(n) && !(blocked.has(n) && !x.rooms[n]!.cleared)) { seen.add(n); prev.set(n, id); q.push(n); } }
  return null;
}
const stats = { timeouts: 0, fights: 0, wins: 0 };
function settle(x: Expedition): void {
  for (let i = 0; i < 6 && x.pending; i++) {
    const p = x.pending;
    if (p.kind === 'fight') { const { game, force } = startFight(x); const r = autoPlay(game, 120); stats.fights++; if (r === 'timeout') stats.timeouts++; if (r === 'win') stats.wins++; settleFight(x, game, force); }
    else if (p.kind === 'loot') { while (x.pending?.kind === 'loot' && x.pack.length < x.cfg.packSize && x.pending.offers.length) takeLoot(x, 0); if (x.pending?.kind === 'loot') leaveLoot(x); }
    else if (p.kind === 'market') leaveMarket(x);
    else if (p.kind === 'gamble') declineGamble(x);
    else if (p.kind === 'control') { if (hasKey(x)) openStorehouse(x); else leaveControl(x); }
    else if (p.kind === 'hazard') {
      if (p.stage === 'offer') testHazard(x);
      while (x.pending?.kind === 'hazard' && canPushHazard(x, x.pending) && x.rations > 10 && x.pending.pushed < 4) pushHazard(x);
      if (x.pending?.kind === 'hazard') { if (!x.pending.passed) blocked.add(x.pending.room); closeHazard(x); }
    }
    else if (p.kind === 'gate') return;
    if (x.status !== 'running') return;
  }
}
function supplies(x: Expedition): void {
  for (let guard = 0; guard < 20; guard++) {
    const hurt = x.hp.some((h, i) => h < x.cfg.squad[i]!.hp * 0.6);
    const i = x.pack.findIndex((it) => it.use && ((it.use.kind === 'rations' && x.rations <= 3) || (it.use.kind === 'heal' && hurt)));
    if (i < 0) return;
    if (x.pending && x.pending.kind !== 'loot' && x.pending.kind !== 'market') return;
    if (useItem(x, i) === null) return;
  }
}
function run(x: Expedition): void {
  for (let g = 0; g < 400 && x.status === 'running'; g++) {
    settle(x);
    supplies(x);
    if (x.status !== 'running') return;
    if (x.pending?.kind === 'gate') { takeGate(x); continue; }
    if (x.rooms[x.at]!.entrance && x.stats.sections > 0) {
      const frail = x.hp.filter((h, i) => h < x.cfg.squad[i]!.hp * 0.5).length;
      if (x.rations <= 8 || frail >= 2) { retreat(x); return; }
    }
    const unex = path(x, (id) => !x.rooms[id]!.entered);
    const gate = path(x, (id) => x.rooms[id]!.type === 'Gate' && !x.rooms[id]!.entrance);
    const target = gate ?? unex;
    if (!target) { retreat(x); return; }
    for (const id of target) { if (!x.rooms[x.at]!.links.includes(id)) break; move(x, id); settle(x); if (x.status !== 'running' || x.pending || x.at !== id) break; }
  }
}
function score(name: string): number {
  const i = gearInfo(name)!;
  if (i.slot === 'armor') return 100 + i.maxSoak;
  if (i.slot === 'tool') return 10;
  return i.actions.reduce((n, a) => n + a.dmg * (a.area ? 2 : a.targets) / Math.max(1, a.fuel), 0) * 10 / i.hands + i.maxSoak * 2;
}
function gearUp(c: Campaign): void {
  for (let pass = 0; pass < 3; pass++) {
    for (const m of c.crew) {
      const order = c.stash.map((it, i) => ({ it, i })).filter((o) => gearInfo(o.it.name) && gearInfo(o.it.name)!.slot !== 'other' && !equipProblem(c, m, o.it)).sort((a, b) => score(b.it.name) - score(a.it.name));
      for (const o of order) {
        const info = gearInfo(o.it.name)!;
        if (info.slot !== 'weapon') {
          const cur = m.equipped.find((e) => gearInfo(e.name)?.slot === info.slot);
          if (cur && score(cur.name) >= score(o.it.name)) continue;
        }
        const idx = c.stash.indexOf(o.it);
        if (idx >= 0 && !equipProblem(c, m, o.it)) equip(c, m, idx);
      }
    }
  }
}
function home(c: Campaign): void {
  gearUp(c);
  for (const m of c.crew) { if (m.damage && canRepair(c, m)) repair(c, m); }
  for (const m of c.crew) { while (canPromote(c, m)) promote(c, m); }
}
let lastWipe = false;
function startAt(c: Campaign, sections: number): number {
  const top = Math.min(c.depth ?? 0, sections - 1);
  const avg = c.crew.reduce((n, m) => n + m.tier, 0) / Math.max(1, c.crew.length);
  // stay at the frontier only while the squad is on the curve: tier of the section vs the crew's average tier
  let at = top;
  while (at > 0 && Math.floor(at / 2) + 1 > avg + 1) at--;
  if (lastWipe) at = Math.max(0, at - 1);
  return at;
}
function campaignRun(sections: number, seed: number, expeditions: number): { depth: number; trips: number; floors: number; trail: string } {
  const c = newSandboxCampaign({ ...defaultSetup, sections }, seed);
  const out: string[] = [];
  for (let e = 0; e < expeditions; e++) {
    home(c);
    if (readyCrew(c).length === 0) { out.push('NOCREW'); break; }
    const purse = Math.min(10, maxPurse(c));
    const pack = c.stash.map((it, i) => ({ it, i })).filter((o) => o.it.use).slice(0, 8).map((o) => o.i);
    const x = launchTsc(c, { purse, pack }, seed * 100 + e, { sections, startSection: startAt(c, sections) });
    blocked.clear();
    run(x);
    returnHome(c, x);
    lastWipe = x.status === 'wiped';
    out.push(`${x.status[0]}${x.stats.sections}>${c.depth ?? 0}`);
  }
  return { depth: c.depth ?? 0, trips: out.length, floors: c.floorsCleared ?? 0, trail: `${out.join(' ')} | tiers ${c.crew.map((m) => m.tier).join('')} eagles ${c.eagles} stash ${c.stash.length} lost ${c.fallen.length}` };
}
/**
 * A bot plays whole campaigns through the same rules the game uses: gears up, eats and heals from the pack, pushes tests,
 * retreats at checkpoints and picks a start section that matches its crew. It is not a good player, so this guards the
 * loop (no stalls, depth is banked, the run makes headway) and does not pin the difficulty.
 */
describe('a bot playing the campaign', () => {
  it('banks depth across trips and never stalls in a fight', () => {
    stats.timeouts = 0;
    let total = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const r = campaignRun(14, seed, 14);
      total += r.depth + r.floors * 14;
      expect(r.trips).toBeGreaterThan(3);
    }
    expect(stats.timeouts).toBe(0);
    expect(total / 3).toBeGreaterThanOrEqual(4);
  }, 120000);
});
