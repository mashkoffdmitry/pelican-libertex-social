export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unsuitable';

export interface StrategyProfile {
  Id?: number | string;
  Name?: string | null;
}

export interface MarketSlice {
  n: string;
  c: number;
}

export interface HistoryPoint {
  Timestamp: string;
  AccountReturn: number;
}

export interface Strategy {
  Id: number;
  Name: string | null;
  ImageUploaded?: boolean | null;
  Profile: StrategyProfile | null;
  NumCopiers: number | null;
  Fee: number | null;
  RiskProfile: RiskLevel | null;
  IsSimulated: boolean;
  IsEnabled: boolean | null;
  Inception: string | null;
  Currency: string | null;
  Return: number | null;
  MaxDD: number | null;
  RealisedPnl: number | null;
  UnrealisedPnl: number | null;
  History?: HistoryPoint[];
  TradesTotal: number;
  Wins: number;
  Losses: number;
  Markets: MarketSlice[];
  AccountBalance: number | null;
  CopiersAUM: number | null;
  MonthlyProfit: number | null;
  YearlyProfit: number | null;
  _stats?: boolean;
  _meta?: boolean;
  _enrichAttempted?: boolean;
}

export interface Trade {
  Id?: number;
  MarketName?: string;
  OpenTimestamp?: string;
  CloseTimestamp?: string | null;
  Direction?: 'Buy' | 'Sell' | string;
  Pnl?: number;
  Volume?: number;
  Multiplier?: number;
  OpenPrice?: number;
  ClosePrice?: number;
}
