import Phaser from 'phaser';
import { session } from '../core/session';
import { toCss } from '../data/palette';

export const FONT_STENCIL = "'Big Shoulders Stencil Display', Impact, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

/** Set by ScreenScene on every rebuild so text stays crisp inside the scaled root. */
export const textContext = { res: 1, dense: false };

/**
 * Dense screens (combat) grow small labels by only 40% of the text size setting, so the layout holds.
 * Text that has room (card effects, tooltips, the vox log) opts in to the full setting with `full`.
 */
export function textMultiplier(full: boolean | undefined): number {
  const m = session.settings.textScale / 100;
  return textContext.dense && !full ? 1 + (m - 1) * 0.4 : m;
}

export interface TextOpts {
  /** letter spacing in em */
  spacing?: number;
  weight?: string;
  originX?: number;
  originY?: number;
  wrap?: number;
  lineSpacing?: number;
  align?: 'left' | 'center' | 'right';
  /** ignore the text size setting (for the big title lockup) */
  fixed?: boolean;
  /** use the full text size setting even on a dense screen */
  full?: boolean;
}

function build(
  scene: Phaser.Scene,
  family: string,
  x: number,
  y: number,
  str: string,
  size: number,
  color: number,
  o: TextOpts
): Phaser.GameObjects.Text {
  const px = Math.round(size * (o.fixed ? 1 : textMultiplier(o.full)));
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: family,
    fontSize: `${px}px`,
    color: toCss(color),
    resolution: textContext.res,
    align: o.align ?? 'left'
  };
  if (o.weight) style.fontStyle = o.weight;
  if (o.spacing) style.letterSpacing = o.spacing * px;
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.lineSpacing) style.lineSpacing = o.lineSpacing;
  const t = scene.add.text(x, y, str, style);
  t.setOrigin(o.originX ?? 0, o.originY ?? 0);
  return t;
}

/** Stencil display type. Always uppercase. */
export function stencilText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  color: number,
  o: TextOpts = {}
): Phaser.GameObjects.Text {
  return build(scene, FONT_STENCIL, x, y, str.toUpperCase(), size, color, { weight: '900', ...o });
}

/** Mono body type. */
export function monoText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  color: number,
  o: TextOpts = {}
): Phaser.GameObjects.Text {
  return build(scene, FONT_MONO, x, y, str, size, color, o);
}
