import type { Strategy } from '../types/strategy';

export function winrate(s: Pick<Strategy, 'Wins' | 'Losses'>): number {
  const wins = s.Wins ?? 0;
  const losses = s.Losses ?? 0;
  const t = wins + losses;
  return t ? (wins / t) * 100 : -1;
}
