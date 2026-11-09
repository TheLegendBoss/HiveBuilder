import Phaser from 'phaser';
import '@fontsource/big-shoulders-stencil-display/latin-700';
import '@fontsource/big-shoulders-stencil-display/latin-900';
import '@fontsource/saira-semi-condensed/latin-400';
import '@fontsource/saira-semi-condensed/latin-500';
import '@fontsource/saira-semi-condensed/latin-600';
import '@fontsource/saira-semi-condensed/latin-700';
import { palette } from './data/palette';
import { Boot } from './scenes/Boot';
import { Combat } from './scenes/Combat';
import { ExpeditionMap } from './scenes/ExpeditionMap';
import { Hub } from './scenes/Hub';
import { MainMenu } from './scenes/MainMenu';
import { SandboxSetup } from './scenes/SandboxSetup';
import { Settings } from './scenes/Settings';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: palette.bg,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%'
  },
  input: { keyboard: true, mouse: true },
  scene: [Boot, MainMenu, SandboxSetup, Settings, Combat, ExpeditionMap, Hub]
});

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
