import Phaser from 'phaser';
import { palette } from '../data/palette';
import { FONT_BODY, FONT_STENCIL, bodyText, textContext } from '../ui/text';
import { SceneKeys } from './keys';

const FONT_LOADS = [
  `900 40px ${FONT_STENCIL}`,
  `700 40px ${FONT_STENCIL}`,
  `400 18px ${FONT_BODY}`,
  `500 18px ${FONT_BODY}`,
  `600 18px ${FONT_BODY}`,
  `700 18px ${FONT_BODY}`
];

export class Boot extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(palette.bg);
    textContext.res = 1;
    const t = bodyText(this, this.scale.width / 2, this.scale.height / 2, 'LOADING', 18, palette.textMuted, {
      originX: 0.5,
      originY: 0.5,
      spacing: 0.2
    });
    const go = () => this.scene.start(SceneKeys.MainMenu);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) {
      go();
      return;
    }
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 4000));
    Promise.race([Promise.all(FONT_LOADS.map((f) => fonts.load(f))).then(() => undefined), timeout])
      .catch(() => undefined)
      .finally(() => {
        t.destroy();
        go();
      });
  }
}
