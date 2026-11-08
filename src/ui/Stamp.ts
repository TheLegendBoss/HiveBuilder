import Phaser from 'phaser';
import { palette } from '../data/palette';
import { scaledDuration } from './layout';
import { stencilText } from './text';

export interface StampHandle {
  container: Phaser.GameObjects.Container;
  width: number;
  height: number;
  /** Slam the stamp in: 90 ms, then a 3 px shake. */
  land(delay: number, animSpeed: number): void;
}

/** A rotated stencil label in a red box. The only rotated element in the UI. */
export function makeStamp(scene: Phaser.Scene, label: string, size: number, color: number = palette.danger): StampHandle {
  const c = scene.add.container(0, 0);
  const t = stencilText(scene, 0, 0, label, size, color, { spacing: 0.14, originX: 0.5, originY: 0.5 });
  const padX = 15;
  const padY = 3;
  const w = t.width + padX * 2;
  const h = t.height + padY * 2;
  const g = scene.add.graphics();
  g.lineStyle(3, color, 1);
  g.strokeRect(-w / 2, -h / 2, w, h);
  c.add([g, t]);
  c.setRotation(Phaser.Math.DegToRad(-7));
  return {
    container: c,
    width: w,
    height: h,
    land(delay: number, animSpeed: number) {
      const baseX = c.x;
      c.setAlpha(0);
      c.setScale(1.7);
      scene.tweens.add({
        targets: c,
        alpha: 1,
        scale: 1,
        delay,
        duration: scaledDuration(90, animSpeed),
        ease: 'Quad.easeIn',
        onComplete: () => {
          scene.tweens.add({
            targets: c,
            x: baseX + 3,
            duration: scaledDuration(30, animSpeed),
            yoyo: true,
            repeat: 1,
            onComplete: () => c.setX(baseX)
          });
        }
      });
    }
  };
}
