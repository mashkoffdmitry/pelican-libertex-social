// Widget -> host page events.
//  * CustomEvent 'libertex-social:<name>' on the host element (bubbles, composed)
//  * window.dataLayer.push({event: 'pelican_<name>', ...}) for GTM (opt-out:
//    data-datalayer="off"); only ready / error / subscribe_click are pushed.

export type EventName = 'ready' | 'error' | 'strategy-open' | 'subscribe-click';

export const EVENT_PREFIX = 'libertex-social:';

const DATALAYER: Partial<Record<EventName, string>> = {
  ready: 'pelican_ready',
  error: 'pelican_error',
  'subscribe-click': 'pelican_subscribe_click',
};

export function dispatchHostEvent(target: EventTarget, name: EventName, detail: Record<string, unknown>): void {
  try {
    target.dispatchEvent(new CustomEvent(EVENT_PREFIX + name, { bubbles: true, composed: true, detail }));
  } catch {
    /* host listeners must never break the widget */
  }
}

export function pushDataLayer(name: EventName, detail: Record<string, unknown>): void {
  const event = DATALAYER[name];
  if (!event) return;
  const payload: Record<string, unknown> = { event };
  if (detail.strategyId != null) payload.strategy_id = detail.strategyId;
  if (detail.lang != null) payload.pelican_lang = detail.lang;
  if (detail.message != null) payload.pelican_error = String(detail.message).slice(0, 200);
  if (detail.status != null) payload.pelican_error_status = detail.status;
  if (detail.version != null) payload.pelican_version = detail.version;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);
  } catch {
    /* ignore */
  }
}

/** libertex.copy-trade.io/strategy/<id> -> id */
export function strategyIdFromHref(href: string): number | null {
  const m = /^https:\/\/libertex\.copy-trade\.io\/strategy\/(\d+)/.exec(href);
  return m ? Number(m[1]) : null;
}
