export interface ProgressResponse {
  ready: boolean;
  building: boolean;
  loaded: number;
  total: number;
  built_at: number | null;
  schedule?: string;
}

export type SignalKind = 'open' | 'closed';
