export const SORT_KEYS = [
  'return-desc',
  'return-asc',
  'copiers-desc',
  'copiers-asc',
  'aum-desc',
  'aum-asc',
  'dd-asc',
  'dd-desc',
  'fee-asc',
  'fee-desc',
  'age-desc',
  'age-asc',
  'balance-desc',
  'balance-asc',
  'winrate-desc',
  'winrate-asc',
  'trades-desc',
  'trades-asc',
  'monthly-desc',
  'monthly-asc',
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  'return-desc': 'Return ↓',
  'return-asc': 'Return ↑',
  'copiers-desc': 'Copiers ↓',
  'copiers-asc': 'Copiers ↑',
  'aum-desc': 'Copiers AUM ↓',
  'aum-asc': 'Copiers AUM ↑',
  'dd-asc': 'Drawdown ↑',
  'dd-desc': 'Drawdown ↓',
  'fee-asc': 'Fee ↑',
  'fee-desc': 'Fee ↓',
  'age-desc': 'Age ↓',
  'age-asc': 'Age ↑',
  'balance-desc': 'Balance ↓',
  'balance-asc': 'Balance ↑',
  'winrate-desc': 'Win Rate ↓',
  'winrate-asc': 'Win Rate ↑',
  'trades-desc': 'Trades ↓',
  'trades-asc': 'Trades ↑',
  'monthly-desc': 'Monthly Profit ↓',
  'monthly-asc': 'Monthly Profit ↑',
};

export type SortColumn =
  | 'return'
  | 'copiers'
  | 'aum'
  | 'dd'
  | 'fee'
  | 'age'
  | 'balance';

export const SORT_TOGGLE: Record<SortColumn, [SortKey, SortKey]> = {
  return: ['return-desc', 'return-asc'],
  copiers: ['copiers-desc', 'copiers-asc'],
  aum: ['aum-desc', 'aum-asc'],
  dd: ['dd-asc', 'dd-desc'],
  fee: ['fee-asc', 'fee-desc'],
  age: ['age-desc', 'age-asc'],
  balance: ['balance-desc', 'balance-asc'],
};
