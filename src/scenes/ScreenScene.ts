import Phaser from 'phaser';
import { session } from '../core/session';
import { palette, signalFor } from '../data/palette';
import { computeLayout, scaledDuration, toRef, type Layout } from '../ui/layout';
import { textContext } from '../ui/text';

/**
 * Base for every screen. Builds into a root container that is scaled and centered
 * from the 1920 by 1080 reference, and rebuilds when the window resizes.
 */
export abstract class ScreenScene extends Phaser.Scene {
  protected L!: Layout;
  protected root!: Phaser.GameObjects.Container;
  /** an open dialog or overlay; closed on every rebuild */
  protected modal: { readonly isOpen: boolean; close(): void } | null = null;
  private bar: Phaser.GameObjects.Graphics | null = null;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;
  private built = false;

  get signal(): number {
    return signalFor(session.faction);
  }

  protected anim(ms: number): number {
    return scaledDuration(ms, session.settings.animSpeed);
  }

  protected refX(screenX: number): number {
    return toRef(this.L, screenX, 0).x;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(palette.bg);
    this.built = false;
    this.modal = null;
    this.onCreate();
    this.rebuild();
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
      this.resizeTimer?.remove();
      this.resizeTimer = null;
    });
  }

  /** One-time setup: keyboard handlers and state. Runs before the first build. */
  protected onCreate(): void {}

  /** Build all visuals into `root`. `first` is true only for the first build after the scene starts. */
  protected abstract build(root: Phaser.GameObjects.Container, first: boolean): void;

  protected rebuild(): void {
    const first = !this.built;
    this.modal?.close();
    this.modal = null;
    this.root?.destroy();
    this.bar?.destroy();
    this.L = computeLayout(this.scale.width, this.scale.height, window.devicePixelRatio || 1);
    textContext.res = this.L.textRes;
    this.bar = this.add.graphics();
    this.bar.fillStyle(this.signal, 1);
    this.bar.fillRect(0, 0, this.L.width, Math.max(3, Math.round(6 * this.L.scale)));
    this.root = this.add.container(this.L.offsetX, this.L.offsetY);
    this.root.setScale(this.L.scale);
    this.build(this.root, first);
    this.built = true;
  }

  private onResize(): void {
    this.resizeTimer?.remove();
    this.resizeTimer = this.time.delayedCall(80, () => {
      this.resizeTimer = null;
      this.rebuild();
    });
  }
}
