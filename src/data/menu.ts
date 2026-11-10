export type MenuItemId = 'continue' | 'newGame' | 'loadGame' | 'sandbox' | 'settings' | 'exit';

export interface MenuItemDef {
  id: MenuItemId;
  label: string;
  key: string;
  /** offline items are shown with an OFFLINE stamp and cannot be used yet. */
  state: 'live' | 'offline';
  /** the item the cable runs from and that starts focused */
  primary?: boolean;
  offlineReason?: string;
}

export const menuItems: MenuItemDef[] = [
  { id: 'continue', label: 'Continue', key: '1', state: 'live', offlineReason: 'No autosave yet. Start a sandbox campaign first.' },
  { id: 'newGame', label: 'New Game', key: '2', state: 'offline', offlineReason: 'The campaign is not built yet. Use Sandbox Mode.' },
  { id: 'loadGame', label: 'Load Game', key: '3', state: 'live' },
  { id: 'sandbox', label: 'Sandbox Mode', key: '4', state: 'live', primary: true },
  { id: 'settings', label: 'Settings', key: '5', state: 'live' },
  { id: 'exit', label: 'Exit', key: '6', state: 'live' }
];

/** The menu as it stands now: Continue needs an autosave. */
export const menuItemsFor = (hasAutosave: boolean): MenuItemDef[] =>
  menuItems.map((i) => (i.id === 'continue' && !hasAutosave ? { ...i, state: 'offline' as const } : i));

export const menuText = {
  title: 'Hive Deck',
  subtitle: 'A grimdark deckbuilder. Working title.',
  consoleHeader: 'Main console',
  vox: 'VOX> No saves to continue. Walk down to the middle hive and try the cards.',
  voxSaved: 'VOX> Autosave found. Continue picks the campaign up where it stopped.',
  expeditionsLost: 'Expeditions lost',
  memorialHeader: 'Memorial plaque',
  memorialEmpty: 'No names yet.',
  offlineStamp: 'Offline',
  quitTitle: 'Quit to desktop?',
  quitBody: 'Unsaved sandbox progress will be lost.',
  quitConfirm: 'Quit',
  quitCancel: 'Stay',
  quitDone: 'Session ended. You can close this tab.'
};

export const factionBlurbs: Record<'tsc' | 'pressmen' | 'concord', string> = {
  tsc: 'Droid security. The intro faction.',
  pressmen: 'Heavy brute gang. Slow and tough.',
  concord: 'Elite law squad. Arrests pay.'
};

export const setupText = {
  title: 'Sandbox setup',
  factionHeader: 'Choose your faction',
  dialsHeader: 'Depth dial',
  dials: [
    { key: 'startTier', label: 'Start tier', hint: 'The tier of the first section of every expedition.' },
    { key: 'ramp', label: 'Ramp', hint: 'Sections per tier step. Tier 8 is the cap.' },
    { key: 'sections', label: 'Sections', hint: 'Sections in one expedition. The last gate leaves the floor.' },
    { key: 'startEagles', label: 'Start Eagles', hint: 'Eagles in the bank when the campaign begins.' },
    { key: 'startItems', label: 'Start items', hint: 'Loot items already in the stash.' }
  ] as const,
  back: 'Back',
  start: 'Enter HQ',
  quickFight: 'Quick fight',
  quickstart: 'Quickstart',
  quickstartNone: 'None',
  savePreset: 'Save preset',
  loadPreset: 'Load preset',
  startStamp: 'TSC only',
  replaceTitle: 'Start a new campaign?',
  replaceBody: 'This replaces the campaign in memory. Your saved slots are not touched.',
  replaceConfirm: 'Start new',
  replaceCancel: 'Keep it'
};

export const savesText = {
  title: 'Saves',
  back: 'Back',
  empty: 'Empty',
  broken: 'Unreadable. Written by another build.',
  autosave: 'Autosave',
  slot: (n: number | string) => `Slot ${n}`,
  overwriteTitle: 'Overwrite this slot?',
  overwriteBody: 'The saved game in this slot is replaced by the campaign in memory.',
  deleteTitle: 'Delete this save?',
  deleteBody: 'This cannot be undone.',
  hintLoad: 'Enter loads. S saves here. D deletes. Up and Down pick a slot.',
  hintNoCampaign: 'Enter loads. D deletes. Saving needs a running campaign.'
};

export const settingsText = {
  title: 'Settings',
  back: 'Back',
  rows: {
    volume: { label: 'Volume', hint: 'VOX> Left and Right change the volume. Sound comes in a later build.' },
    fullscreen: { label: 'Fullscreen', hint: 'VOX> Enter toggles fullscreen. Esc also leaves fullscreen.' },
    textScale: { label: 'Text size', hint: 'VOX> Left and Right pick 100, 125 or 150 percent. The layout reflows.' },
    colorblind: { label: 'Colorblind mode', hint: 'VOX> Not built yet. Shapes and text already back up every color.' },
    animSpeed: { label: 'Animation speed', hint: 'VOX> Normal, fast or off. Applies to every slide and stamp.' },
    packStyle: { label: 'Pack opening', hint: 'VOX> Rip it shows one card at a time. Show all lays the whole pack out at once.' },
    autoNext: { label: 'Auto-next', hint: 'VOX> Rip it only. Moves Basic and Improved cards along by itself: Off, only cards you already own, or all of them. Rarer pulls always wait for a click.' }
  }
};
