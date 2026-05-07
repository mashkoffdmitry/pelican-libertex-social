export type ColumnKey =
  | 'name'
  | 'spark'
  | 'return'
  | 'copiers'
  | 'aum'
  | 'dd'
  | 'age'
  | 'balance'
  | 'fee'
  | 'link';

export const DEFAULT_COLUMNS: ColumnKey[] = [
  'name',
  'spark',
  'return',
  'copiers',
  'aum',
  'dd',
  'age',
  'balance',
  'fee',
  'link',
];

export type ThemeMode = 'auto' | 'dark' | 'light';
