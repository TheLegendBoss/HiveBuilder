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
  { id: 'continue', label: 'Continue', key: '1', state: 'offline', offlineReason: 'No campaign saves exist. The campaign is not built yet.' },
  { id: 'newGame', label: 'New Game', key: '2', state: 'offline', offlineReason: 'The campaign is not built yet. Use Sandbox Mode.' },
  { id: 'loadGame', label: 'Load Game', key: '3', state: 'offline', offlineReason: 'Loading comes with the sandbox saves milestone.' },
  { id: 'sandbox', label: 'Sandbox Mode', key: '4', state: 'live', primary: true },
  { id: 'settings', label: 'Settings', key: '5', state: 'live' },
  { id: 'exit', label: 'Exit', key: '6', state: 'live' }
];

export const menuText = {
  title: 'Hive Deck',
  subtitle: 'A grimdark deckbuilder. Working title.',
  consoleHeader: 'Main console',
  vox: 'VOX> No saves to continue. Walk down to the middle hive and try the cards.',
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
  dialsHeader: 'Depth dial (set in a later build)',
  dials: [
    'Start tier: 1',
    'Ramp: 2 sections per step, tier 8 after 14',
    'Starting Eagles and gear: not set yet'
  ],
  back: 'Back',
  start: 'Start expedition',
  startStamp: 'Next build'
};

export const settingsText = {
  title: 'Settings',
  back: 'Back',
  rows: {
    volume: { label: 'Volume', hint: 'VOX> Left and Right change the volume. Sound comes in a later build.' },
    fullscreen: { label: 'Fullscreen', hint: 'VOX> Enter toggles fullscreen. Esc also leaves fullscreen.' },
    textScale: { label: 'Text size', hint: 'VOX> Left and Right pick 100, 125 or 150 percent. The layout reflows.' },
    colorblind: { label: 'Colorblind mode', hint: 'VOX> Not built yet. Shapes and text already back up every color.' },
    animSpeed: { label: 'Animation speed', hint: 'VOX> Normal, fast or off. Applies to every slide and stamp.' }
  }
};
