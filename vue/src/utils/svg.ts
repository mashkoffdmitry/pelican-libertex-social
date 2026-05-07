import { DONUT_PALETTE } from '../constants/palette';
import type { HistoryPoint, MarketSlice } from '../types/strategy';

export type SparklinePoint = HistoryPoint;

export interface SparklineGeometry {
  hasData: boolean;
  width: number;
  height: number;
  zeroY: number;
  areaPath: string;
  linePath: string;
  positive: boolean;
  startX: number;
  endX: number;
}

export function sparklineGeometry(
  history: SparklinePoint[] | null | undefined,
  w = 140,
  h = 34,
): SparklineGeometry {
  if (!history || history.length < 2) {
    return {
      hasData: false,
      width: w,
      height: h,
      zeroY: h / 2,
      areaPath: '',
      linePath: '',
      positive: true,
      startX: 1,
      endX: w - 1,
    };
  }
  const times = history.map((p) => Date.parse(p.Timestamp));
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const tSpan = tMax - tMin || 1;
  const ys = history.map((p) => p.AccountReturn);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(0, ...ys);
  const yRange = yMax - yMin || 1;
  const px = (t: number) => ((t - tMin) / tSpan) * (w - 2) + 1;
  const py = (v: number) => h - 2 - ((v - yMin) / yRange) * (h - 4);
  const pts = history.map((p, i) => `${px(times[i]).toFixed(1)},${py(p.AccountReturn).toFixed(1)}`);
  const last = ys[ys.length - 1];
  const zeroY = py(0);
  const startX = px(tMin);
  const endX = px(tMax);
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath =
    `M ${pts[0]} ` +
    pts.slice(1).map((p) => `L ${p}`).join(' ') +
    ` L ${endX.toFixed(1)},${zeroY.toFixed(1)} L ${startX.toFixed(1)},${zeroY.toFixed(1)} Z`;
  return {
    hasData: true,
    width: w,
    height: h,
    zeroY,
    areaPath,
    linePath,
    positive: last >= 0,
    startX,
    endX,
  };
}

export interface DonutSlice {
  marketName: string;
  count: number;
  fraction: number;
  color: string;
  arcPath: string;
  labelLine: string | null;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
}

export interface DonutGeometry {
  width: number;
  height: number;
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  slices: DonutSlice[];
}

export function donutGeometry(items: MarketSlice[], w = 520, h = 280): DonutGeometry {
  const sorted = items.slice().sort((a, b) => (b.c || 0) - (a.c || 0));
  const total = sorted.reduce((acc, m) => acc + (m.c || 0), 0) || 1;
  const cx = w / 2;
  const cy = h / 2;
  const R = 90;
  const r = 52;
  const labelR = R + 10;
  const labelText = R + 30;

  let angle = -Math.PI / 2;
  const slices: DonutSlice[] = [];
  sorted.forEach((m, i) => {
    const frac = (m.c || 0) / total;
    const sweep = frac * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const aMid = (a0 + a1) / 2;
    const large = sweep > Math.PI ? 1 : 0;
    const x0 = cx + R * Math.cos(a0);
    const y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy + R * Math.sin(a1);
    const xi0 = cx + r * Math.cos(a0);
    const yi0 = cy + r * Math.sin(a0);
    const xi1 = cx + r * Math.cos(a1);
    const yi1 = cy + r * Math.sin(a1);
    const arcPath =
      `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}` +
      ` L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)} Z`;
    const color = DONUT_PALETTE[i % DONUT_PALETTE.length];

    let labelLine: string | null = null;
    let labelX = 0;
    let labelY = 0;
    let labelAnchor: 'start' | 'end' = 'start';
    if (frac >= 0.015) {
      const isLeft = Math.cos(aMid) < 0;
      const lx1 = cx + R * Math.cos(aMid);
      const ly1 = cy + R * Math.sin(aMid);
      const lx2 = cx + labelR * Math.cos(aMid);
      const ly2 = cy + labelR * Math.sin(aMid);
      const lx3 = isLeft ? lx2 - 4 : lx2 + 4;
      labelLine = `${lx1.toFixed(1)},${ly1.toFixed(1)} ${lx2.toFixed(1)},${ly2.toFixed(1)} ${lx3.toFixed(1)},${ly2.toFixed(1)}`;
      labelX = isLeft ? lx2 - 6 : lx2 + 6;
      labelY = ly2 + 4;
      labelAnchor = isLeft ? 'end' : 'start';
    }

    slices.push({
      marketName: m.n,
      count: m.c,
      fraction: frac,
      color,
      arcPath,
      labelLine,
      labelX,
      labelY,
      labelAnchor,
    });
  });

  // labelText is intentionally part of geometry to keep callers free of magic numbers.
  void labelText;

  return { width: w, height: h, cx, cy, outerR: R, innerR: r, slices };
}
