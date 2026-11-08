export const SceneKeys = {
  Boot: 'Boot',
  MainMenu: 'MainMenu',
  SandboxSetup: 'SandboxSetup',
  Settings: 'Settings'
} as const;
export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
