import type { RiskLevel } from './strategy';

export interface FiltersState {
  risk: Set<RiskLevel>;
  retMin: number | null;
  retMax: number | null;
  ddMax: number | null;
  aumMin: number | null;
  copiersMin: number | null;
  ageMin: number | null;
  tradesMin: number | null;
  winrateMin: number | null;
  feeMax: number | null;
  balanceMin: number | null;
  balanceMax: number | null;
  search: string;
}

export function defaultFilters(): FiltersState {
  return {
    risk: new Set<RiskLevel>(),
    retMin: null,
    retMax: null,
    ddMax: null,
    aumMin: null,
    copiersMin: null,
    ageMin: null,
    tradesMin: null,
    winrateMin: null,
    feeMax: null,
    balanceMin: null,
    balanceMax: null,
    search: '',
  };
}
