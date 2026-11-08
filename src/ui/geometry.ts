// Pure geometry helpers for the vector UI. No phaser imports.
export interface Pt {
  x: number;
  y: number;
}

/** Sutherland-Hodgman clip of a polygon against an axis-aligned rectangle. */
export function clipPolyToRect(poly: Pt[], x0: number, y0: number, x1: number, y1: number): Pt[] {
  type Edge = { inside: (p: Pt) => boolean; cut: (a: Pt, b: Pt) => Pt };
  const edges: Edge[] = [
    { inside: (p) => p.x >= x0, cut: (a, b) => ({ x: x0, y: a.y + ((b.y - a.y) * (x0 - a.x)) / (b.x - a.x) }) },
    { inside: (p) => p.x <= x1, cut: (a, b) => ({ x: x1, y: a.y + ((b.y - a.y) * (x1 - a.x)) / (b.x - a.x) }) },
    { inside: (p) => p.y >= y0, cut: (a, b) => ({ x: a.x + ((b.x - a.x) * (y0 - a.y)) / (b.y - a.y), y: y0 }) },
    { inside: (p) => p.y <= y1, cut: (a, b) => ({ x: a.x + ((b.x - a.x) * (y1 - a.y)) / (b.y - a.y), y: y1 }) }
  ];
  let out = poly;
  for (const e of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      const curIn = e.inside(cur);
      const prevIn = e.inside(prev);
      if (curIn) {
        if (!prevIn) out.push(e.cut(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(e.cut(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

/**
 * The dark bands of a 45 degree hazard stripe inside a rectangle. `band` is the
 * perpendicular width of one stripe. Fill the rectangle with the light color first,
 * then fill each returned polygon with the dark color.
 */
export function hazardBands(x: number, y: number, w: number, h: number, band: number): Pt[][] {
  const step = band * Math.SQRT2;
  const base = x + y;
  const kMin = Math.floor(-h / step) - 1;
  const kMax = Math.ceil((w + h) / step) + 1;
  const bands: Pt[][] = [];
  for (let k = kMin; k <= kMax; k++) {
    if (((k % 2) + 2) % 2 === 0) continue;
    const s0 = base + k * step;
    const s1 = s0 + step;
    const poly: Pt[] = [
      { x: s0 - y, y },
      { x: s1 - y, y },
      { x: s1 - (y + h), y: y + h },
      { x: s0 - (y + h), y: y + h }
    ];
    const clipped = clipPolyToRect(poly, x, y, x + w, y + h);
    if (clipped.length >= 3) bands.push(clipped);
  }
  return bands;
}

export function cubicPoints(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    });
  }
  return pts;
}

/** Cut a polyline into dash segments. */
export function dashPolyline(points: Pt[], dash: number, gap: number): Array<[Pt, Pt]> {
  const segs: Array<[Pt, Pt]> = [];
  let drawing = true;
  let remaining = dash;
  let start: Pt | null = points[0] ?? null;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1]!;
    const b = points[i]!;
    let len = Math.hypot(b.x - a.x, b.y - a.y);
    while (len > 0) {
      const take = Math.min(len, remaining);
      const t = take / len;
      const mid: Pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (drawing && start) segs.push([start, mid]);
      len -= take;
      remaining -= take;
      a = mid;
      start = mid;
      if (remaining <= 1e-9) {
        drawing = !drawing;
        remaining = drawing ? dash : gap;
      }
    }
  }
  return segs;
}
