export type FormatLocale = string;

export interface FmtPctResult {
  text: string;
  positive: boolean;
}

export function fmtPct(v: number | null | undefined, d = 2): FmtPctResult | null {
  if (v == null || isNaN(Number(v))) return null;
  const n = Number(v);
  return { text: `${n.toFixed(d)}%`, positive: n >= 0 };
}

export function fmtMoney(v: number | null | undefined, locale: FormatLocale = 'en-US'): string {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e6) s = (abs / 1e6).toFixed(2) + 'M';
  else if (abs >= 1e3) s = Math.round(abs).toLocaleString(locale);
  else s = abs.toFixed(2);
  return `${sign}$${s}`;
}

export function fmtMoneyFull(v: number | null | undefined, locale: FormatLocale = 'en-US'): string {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtNum(v: number | null | undefined, locale: FormatLocale = 'en-US'): string {
  return v == null ? '—' : Number(v).toLocaleString(locale);
}

export function fmtFee(s: { Fee: number | null; _meta?: boolean }): string {
  if (s.Fee == null) {
    return s._meta ? 'free' : '—';
  }
  return `${(s.Fee * 100).toFixed(0)}%`;
}

export function fmtTradeTime(iso: string | null | undefined, locale: FormatLocale = 'en-US'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, {
    year: '2-digit',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function fmtAge(days: number | null): string {
  if (days == null) return '—';
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days - years * 365) / 30);
  return remMonths ? `${years}y ${remMonths}mo` : `${years}y`;
}

export function fmtAUM(v: number): string {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + Math.round(v);
}

export function fmtRetMag(v: number): string {
  if (v >= 1000) {
    return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K%';
  }
  return Math.round(v) + '%';
}

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export function ageDays(inception: string | null | undefined): number | null {
  if (!inception) return null;
  const d = new Date(inception);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
