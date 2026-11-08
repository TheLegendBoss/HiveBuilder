import { describe, expect, it } from 'vitest';
import { clipPolyToRect, cubicPoints, dashPolyline, hazardBands } from './geometry';

describe('clipPolyToRect', () => {
  it('keeps a polygon fully inside', () => {
    const sq = [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 }];
    expect(clipPolyToRect(sq, 0, 0, 10, 10)).toHaveLength(4);
  });
  it('clips to the rectangle', () => {
    const big = [{ x: -5, y: -5 }, { x: 15, y: -5 }, { x: 15, y: 15 }, { x: -5, y: 15 }];
    const out = clipPolyToRect(big, 0, 0, 10, 10);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(10);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(10);
    }
  });
  it('returns nothing when fully outside', () => {
    const far = [{ x: 20, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 30 }];
    expect(clipPolyToRect(far, 0, 0, 10, 10)).toHaveLength(0);
  });
});

describe('hazardBands', () => {
  it('stays inside the strip', () => {
    const bands = hazardBands(100, 50, 300, 12, 12);
    expect(bands.length).toBeGreaterThan(4);
    for (const b of bands) {
      for (const p of b) {
        expect(p.x).toBeGreaterThanOrEqual(100 - 1e-6);
        expect(p.x).toBeLessThanOrEqual(400 + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(50 - 1e-6);
        expect(p.y).toBeLessThanOrEqual(62 + 1e-6);
      }
    }
  });
});

describe('cubicPoints and dashPolyline', () => {
  it('hits both end points', () => {
    const pts = cubicPoints({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 10 }, { x: 30, y: 10 }, 20);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[20]!.x).toBeCloseTo(30);
    expect(pts[20]!.y).toBeCloseTo(10);
  });
  it('dashes a straight line with the right count', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const segs = dashPolyline(line, 10, 10);
    expect(segs).toHaveLength(5);
    expect(segs[0]![0].x).toBeCloseTo(0);
    expect(segs[0]![1].x).toBeCloseTo(10);
    expect(segs[1]![0].x).toBeCloseTo(20);
  });
});
