export const SceneKeys = {
  Boot: 'Boot',
  MainMenu: 'MainMenu',
  SandboxSetup: 'SandboxSetup',
  Settings: 'Settings',
  Combat: 'Combat',
  Expedition: 'Expedition',
  Hub: 'Hub',
  Saves: 'Saves',
  Footholds: 'Footholds'
} as const;
export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
