// Ported from app.js:622-629.
// Balance slider: log scale [10, 10^7] mapped to [0..100] raw ticks.
// Return slider:  log scale [10, 10^4.7 ~= 50000] mapped to [0..100] raw ticks.

export const balanceFromRaw = (v: number): number =>
  v <= 0 ? 0 : Math.round(Math.pow(10, 1 + ((v - 1) / 99) * 6));

export const rawFromBalance = (b: number): number =>
  b <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(1 + ((Math.log10(b) - 1) * 99) / 6)));

export const returnFromRaw = (v: number): number =>
  v <= 0 ? 0 : Math.round(Math.pow(10, ((v - 1) / 99) * 4.7));

export const rawFromReturn = (r: number): number =>
  r <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(1 + (Math.log10(r) * 99) / 4.7)));
