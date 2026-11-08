// Pure layout math. No phaser imports so it can be unit tested.
export const REF_W = 1920;
export const REF_H = 1080;
export const MIN_W = 1280;
export const MIN_H = 720;

export interface Layout {
  width: number;
  height: number;
  /** screen pixels per reference pixel */
  scale: number;
  offsetX: number;
  offsetY: number;
  /** resolution to give Text objects so they stay crisp inside the scaled root */
  textRes: number;
}

export function computeLayout(width: number, height: number, dpr = 1): Layout {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const scale = Math.min(w / REF_W, h / REF_H);
  const textRes = Math.round(Math.min(4, Math.max(1, scale * dpr)) * 100) / 100;
  return {
    width: w,
    height: h,
    scale,
    offsetX: (w - REF_W * scale) / 2,
    offsetY: (h - REF_H * scale) / 2,
    textRes
  };
}

/** Convert a screen point to reference coordinates. */
export function toRef(layout: Layout, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - layout.offsetX) / layout.scale, y: (sy - layout.offsetY) / layout.scale };
}

/** Animation duration after the animation speed setting (0 = off). */
export function scaledDuration(ms: number, animSpeed: number): number {
  if (animSpeed === 0) return 1;
  return Math.max(1, Math.round(ms / animSpeed));
}
