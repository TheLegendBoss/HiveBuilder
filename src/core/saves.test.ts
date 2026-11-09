import { describe, expect, it } from 'vitest';
import { newSandboxCampaign, reattachConfig, tscCampaignConfig, launchTsc } from '../data/campaign';
import { clampSetup, defaultSetup, stepDial, topTier } from '../data/sandbox';
import { launch, readyCrew } from '../sim/campaign';
import { createExpedition, move, moves, tierAt } from '../sim/expedition';
import { tscExpedition } from '../data/rooms';
import {
  SAVE_VERSION, deleteSlot, hasAutosave, loadQuickstart, readSlot, saveQuickstart, slotInfo, summarize, writeSlot, type SaveGame
} from './saves';

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k)
  };
}

function sampleSave(): SaveGame {
  const setup = clampSetup({ ...defaultSetup, startItems: 4, startEagles: 50 });
  const campaign = newSandboxCampaign(setup, 11);
  const x = launchTsc(campaign, { purse: 20, pack: [] }, 77, { startTier: setup.startTier, ramp: setup.ramp, sections: setup.sections });
  const first = moves(x)[0];
  if (first) move(x, first.id);
  return { version: SAVE_VERSION, savedAt: 1234, setup, campaign, expedition: x };
}

describe('sandbox dials', () => {
  it('clamps every dial and ignores junk', () => {
    const s = clampSetup({ faction: 'nope' as never, startTier: 99, ramp: 0, sections: -3, startEagles: 1e9, startItems: NaN });
    expect(s.faction).toBe('tsc');
    expect(s.startTier).toBe(8);
    expect(s.ramp).toBe(1);
    expect(s.sections).toBe(1);
    expect(s.startEagles).toBe(200);
    expect(s.startItems).toBe(defaultSetup.startItems);
    expect(clampSetup(null)).toEqual(defaultSetup);
  });

  it('steps a dial within its limits', () => {
    expect(stepDial(defaultSetup, 'startTier', -1).startTier).toBe(1);
    expect(stepDial(defaultSetup, 'startEagles', 1).startEagles).toBe(40);
    expect(stepDial({ ...defaultSetup, ramp: 4 }, 'ramp', 1).ramp).toBe(4);
  });

  it('turns the depth dial into section tiers', () => {
    expect(tierAt({}, 0)).toBe(1);
    expect(tierAt({}, 4)).toBe(3);
    expect(tierAt({ startTier: 3, ramp: 1 }, 2)).toBe(5);
    expect(tierAt({ startTier: 7, ramp: 1 }, 9)).toBe(8);
    expect(topTier({ ...defaultSetup, startTier: 1, ramp: 2, sections: 14 })).toBe(7);
  });

  it('starts the campaign with the dialled Eagles and stash', () => {
    const c = newSandboxCampaign(clampSetup({ startEagles: 70, startItems: 5 }), 3);
    expect(c.eagles).toBe(70);
    expect(c.stash).toHaveLength(5);
  });
});

describe('saves', () => {
  it('round-trips a campaign and a running expedition through JSON', () => {
    const store = memStore();
    const save = sampleSave();
    expect(writeSlot('auto', save, store)).toBe(true);
    const back = readSlot('auto', store)!;
    expect(back).not.toBeNull();
    expect(back.expedition).toEqual(JSON.parse(JSON.stringify(save.expedition)));
    reattachConfig(back.campaign);
    expect(back.campaign.cfg).toBe(tscCampaignConfig);
    expect(back.campaign.eagles).toBe(save.campaign.eagles);
    expect(back.campaign.run).toEqual(save.campaign.run);
    // the loaded expedition still plays: same legal moves as the original
    expect(moves(back.expedition!).map((m) => m.id)).toEqual(moves(save.expedition!).map((m) => m.id));
  });

  it('keeps the autosave and manual slots apart', () => {
    const store = memStore();
    expect(hasAutosave(store)).toBe(false);
    writeSlot('auto', sampleSave(), store);
    writeSlot(2, { ...sampleSave(), savedAt: 99 }, store);
    expect(hasAutosave(store)).toBe(true);
    expect(slotInfo(1, store).empty).toBe(true);
    expect(slotInfo(2, store).savedAt).toBe(99);
    deleteSlot(2, store);
    expect(slotInfo(2, store).empty).toBe(true);
    expect(slotInfo('auto', store).summary).toContain('Eagles');
  });

  it('survives unreadable, old or hostile data', () => {
    const store = memStore();
    store.setItem('hivedeck.save.1', '{not json');
    store.setItem('hivedeck.save.2', JSON.stringify({ version: 0 }));
    expect(readSlot(1, store)).toBeNull();
    expect(readSlot(2, store)).toBeNull();
    expect(slotInfo(1, store).broken).toBe(true);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(writeSlot('auto', sampleSave(), throwing)).toBe(false);
    expect(readSlot('auto', throwing)).toBeNull();
    expect(slotInfo('auto', throwing).empty).toBe(true);
  });

  it('summarizes where the campaign stands', () => {
    const s = sampleSave();
    expect(summarize(s)).toContain('on the floor');
    expect(summarize({ ...s, expedition: null })).toContain('at the HQ');
  });

  it('stores and clamps the quickstart preset', () => {
    const store = memStore();
    expect(loadQuickstart(store)).toBeNull();
    saveQuickstart({ ...defaultSetup, startTier: 4, startEagles: 90 }, store);
    expect(loadQuickstart(store)).toMatchObject({ startTier: 4, startEagles: 90 });
    store.setItem('hivedeck.quickstart', JSON.stringify({ startTier: 500 }));
    expect(loadQuickstart(store)!.startTier).toBe(8);
  });
});

describe('launch under the dials', () => {
  it('a high start tier makes the first section hard', () => {
    const c = newSandboxCampaign(defaultSetup, 5);
    expect(readyCrew(c).length).toBe(5);
    const x = launchTsc(c, { purse: 0, pack: [] }, 9, { startTier: 5, ramp: 1, sections: 2 });
    expect(tierAt(x.cfg, x.section)).toBe(5);
    expect(createExpedition(tscExpedition(1)).cfg.startTier).toBeUndefined();
    expect(typeof launch).toBe('function');
  });
});
