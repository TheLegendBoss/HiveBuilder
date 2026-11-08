import Phaser from 'phaser';
import '@fontsource/big-shoulders-stencil-display/latin-700';
import '@fontsource/big-shoulders-stencil-display/latin-900';
import '@fontsource/ibm-plex-mono/latin-400';
import '@fontsource/ibm-plex-mono/latin-500';
import '@fontsource/ibm-plex-mono/latin-700';
import { palette } from './data/palette';
import { Boot } from './scenes/Boot';
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
  scene: [Boot, MainMenu, SandboxSetup, Settings]
});

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
