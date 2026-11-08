import { describe, expect, it } from 'vitest';
import { computeLayout, scaledDuration, toRef } from './layout';

describe('computeLayout', () => {
  it('is 1:1 at the reference size', () => {
    const l = computeLayout(1920, 1080);
    expect(l.scale).toBe(1);
    expect(l.offsetX).toBe(0);
    expect(l.offsetY).toBe(0);
  });
  it('scales down to 1280 by 720', () => {
    const l = computeLayout(1280, 720);
    expect(l.scale).toBeCloseTo(2 / 3);
    expect(l.offsetX).toBeCloseTo(0);
  });
  it('letterboxes a wide window', () => {
    const l = computeLayout(2560, 1080);
    expect(l.scale).toBe(1);
    expect(l.offsetX).toBe(320);
  });
  it('letterboxes a 16 by 10 window', () => {
    const l = computeLayout(1920, 1200);
    expect(l.scale).toBe(1);
    expect(l.offsetY).toBe(60);
  });
  it('converts screen points to reference points', () => {
    const l = computeLayout(1280, 720);
    const p = toRef(l, 640, 360);
    expect(p.x).toBeCloseTo(960);
    expect(p.y).toBeCloseTo(540);
  });
});

describe('scaledDuration', () => {
  it('scales, and collapses when animations are off', () => {
    expect(scaledDuration(180, 1)).toBe(180);
    expect(scaledDuration(180, 2)).toBe(90);
    expect(scaledDuration(180, 0)).toBe(1);
  });
});
