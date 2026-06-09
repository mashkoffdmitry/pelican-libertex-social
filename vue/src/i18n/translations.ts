// User-facing strings for the widget. New languages: add another entry to
// TRANSLATIONS, mirroring every key in `en` (the type system enforces this).
// Keys group by surface: `toolbar.*`, `filters.*`, `table.*`, `row.*`, etc.
// Variable interpolation uses `{name}` placeholders, replaced by useI18n's `t()`.

export type Lang = 'en' | 'ru';

const en = {
  // Brand / header
  'app.brand': 'Libertex Social — Copy Trading',

  // Toolbar
  'toolbar.filters': 'Filters',
  'toolbar.search.placeholder': 'Search by signal name…',
  'toolbar.sort': 'Sort:',
  'toolbar.reload': '↻ reload',
  'toolbar.reload.title': 'reload',
  'toolbar.counts.html':
    'Showing <b>{filtered}</b> of <b>{total}</b> · page <b>{page}</b> / {totalPages}',

  // Filters panel
  'filters.risk': 'Risk',
  'filters.reset': 'reset filters',
  'filters.return': 'Return %',
  'filters.maxDD': 'Max Drawdown ≤',
  'filters.balance': 'Balance',
  'filters.mgmtFee': 'Mgmt Fee ≤',
  'filters.copiersAUM': 'Copiers AUM ≥',
  'filters.copiers': 'Copiers ≥',
  'filters.age': 'Age ≥ (days)',
  'filters.trades': 'Trades ≥',
  'filters.winRate': 'Win Rate ≥',
  'filters.investAmount': 'Your Investment Amount, $',
  'filters.investPlaceholder': 'e.g. 5000',
  'filters.any': 'any',

  // Risk chips (RiskChips renders Low/Medium/High; Unsuitable is reserved for
  // strategies the upstream API marks as such — translated for completeness)
  'risk.Low': 'Low',
  'risk.Medium': 'Medium',
  'risk.High': 'High',
  'risk.Unsuitable': 'Unsuitable',

  // Sort options (must match every SortKey in constants/sort.ts)
  'sort.return-desc': 'Return ↓',
  'sort.return-asc': 'Return ↑',
  'sort.copiers-desc': 'Copiers ↓',
  'sort.copiers-asc': 'Copiers ↑',
  'sort.aum-desc': 'Copiers AUM ↓',
  'sort.aum-asc': 'Copiers AUM ↑',
  'sort.dd-asc': 'Drawdown ↑',
  'sort.dd-desc': 'Drawdown ↓',
  'sort.fee-asc': 'Fee ↑',
  'sort.fee-desc': 'Fee ↓',
  'sort.age-desc': 'Age ↓',
  'sort.age-asc': 'Age ↑',
  'sort.balance-desc': 'Balance ↓',
  'sort.balance-asc': 'Balance ↑',
  'sort.winrate-desc': 'Win Rate ↓',
  'sort.winrate-asc': 'Win Rate ↑',
  'sort.trades-desc': 'Trades ↓',
  'sort.trades-asc': 'Trades ↑',
  'sort.monthly-desc': 'Monthly Profit ↓',
  'sort.monthly-asc': 'Monthly Profit ↑',

  // Table headers
  'table.name': 'Name',
  'table.equityCurve': 'Equity curve',
  'table.return': 'Return %',
  'table.copiers': 'Copiers',
  'table.copiersAUM': 'Copiers AUM',
  'table.maxDrawdown': 'Max Drawdown',
  'table.age': 'Age',
  'table.balance': 'Balance',
  'table.mgmtFee': 'Mgmt Fee %',
  'table.empty': 'No matches.',

  // Strategy row — mobile data-labels (rendered via CSS attr() on small screens)
  'row.dataLabel.equityCurve': 'Equity curve',
  'row.dataLabel.return': 'Return',
  'row.dataLabel.copiers': 'Copiers',
  'row.dataLabel.copiersAUM': 'Copiers AUM',
  'row.dataLabel.maxDD': 'Max DD',
  'row.dataLabel.age': 'Age',
  'row.dataLabel.balance': 'Balance',
  'row.dataLabel.fee': 'Fee',

  // Strategy row content
  'row.free': 'free',
  'row.subscribe': 'Subscribe',

  // Expanded row stats
  'expanded.currency': 'Currency',
  'expanded.monthlyProfit': 'Monthly profit',
  'expanded.yearlyProfit': 'Yearly profit',
  'expanded.balance': 'Balance',
  'expanded.realizedPnl': 'Realized P/L',
  'expanded.unrealizedPnl': 'Unrealized P/L',
  'expanded.tradesTotal': 'Trades total',
  'expanded.winRate': 'Win rate',
  'expanded.lossRate': 'Loss rate',
  'expanded.risk': 'Risk',
  'expanded.age': 'Age',
  'expanded.markets': 'Markets',

  // Trade-pill toggles
  'trades.hide': 'Hide',
  'trades.openTrades': 'Open Trades',
  'trades.tradeHistory': 'Trade History',

  // TradesPanel
  'tradesPanel.openTrades': 'Open Trades',
  'tradesPanel.tradeHistory': 'Trade History (30d)',
  'tradesPanel.loading': 'Loading…',
  'tradesPanel.empty': 'No trades.',

  // Pager
  'pager.prev': '‹ prev',
  'pager.next': 'next ›',
  'pager.goto': 'go to',

  // Progress / empty placeholders
  'progress.refreshing': 'Refreshing strategy data',
  'donut.empty': 'no market data',
  'spark.empty': 'no data',

  // fmtAge unit suffixes (kept short to fit the table column)
  'fmt.age.days': '{n}d',
  'fmt.age.months': '{n}mo',
  'fmt.age.years': '{n}y',
  'fmt.age.yearsAndMonths': '{y}y {m}mo',
};

export type TranslationKey = keyof typeof en;

const ru: Record<TranslationKey, string> = {
  'app.brand': 'Libertex Social — Копи-трейдинг',

  'toolbar.filters': 'Фильтры',
  'toolbar.search.placeholder': 'Поиск по названию стратегии…',
  'toolbar.sort': 'Сортировка:',
  'toolbar.reload': '↻ обновить',
  'toolbar.reload.title': 'обновить',
  'toolbar.counts.html':
    'Показано <b>{filtered}</b> из <b>{total}</b> · стр. <b>{page}</b> / {totalPages}',

  'filters.risk': 'Риск',
  'filters.reset': 'сбросить',
  'filters.return': 'Доходность %',
  'filters.maxDD': 'Макс. просадка ≤',
  'filters.balance': 'Баланс',
  'filters.mgmtFee': 'Комиссия ≤',
  'filters.copiersAUM': 'AUM копирующих ≥',
  'filters.copiers': 'Копирующих ≥',
  'filters.age': 'Возраст ≥ (дней)',
  'filters.trades': 'Сделок ≥',
  'filters.winRate': 'Доля прибыльных ≥',
  'filters.investAmount': 'Сумма инвестиций, $',
  'filters.investPlaceholder': 'напр. 5000',
  'filters.any': 'любая',

  'risk.Low': 'Низкий',
  'risk.Medium': 'Средний',
  'risk.High': 'Высокий',
  'risk.Unsuitable': 'Не подходит',

  'sort.return-desc': 'Доходность ↓',
  'sort.return-asc': 'Доходность ↑',
  'sort.copiers-desc': 'Копирующих ↓',
  'sort.copiers-asc': 'Копирующих ↑',
  'sort.aum-desc': 'AUM копирующих ↓',
  'sort.aum-asc': 'AUM копирующих ↑',
  'sort.dd-asc': 'Просадка ↑',
  'sort.dd-desc': 'Просадка ↓',
  'sort.fee-asc': 'Комиссия ↑',
  'sort.fee-desc': 'Комиссия ↓',
  'sort.age-desc': 'Возраст ↓',
  'sort.age-asc': 'Возраст ↑',
  'sort.balance-desc': 'Баланс ↓',
  'sort.balance-asc': 'Баланс ↑',
  'sort.winrate-desc': 'Доля прибыльных ↓',
  'sort.winrate-asc': 'Доля прибыльных ↑',
  'sort.trades-desc': 'Сделок ↓',
  'sort.trades-asc': 'Сделок ↑',
  'sort.monthly-desc': 'Прибыль за месяц ↓',
  'sort.monthly-asc': 'Прибыль за месяц ↑',

  'table.name': 'Название',
  'table.equityCurve': 'Кривая капитала',
  'table.return': 'Доходность %',
  'table.copiers': 'Копирующих',
  'table.copiersAUM': 'AUM копирующих',
  'table.maxDrawdown': 'Макс. просадка',
  'table.age': 'Возраст',
  'table.balance': 'Баланс',
  'table.mgmtFee': 'Комиссия %',
  'table.empty': 'Ничего не найдено.',

  'row.dataLabel.equityCurve': 'Кривая капитала',
  'row.dataLabel.return': 'Доходность',
  'row.dataLabel.copiers': 'Копирующих',
  'row.dataLabel.copiersAUM': 'AUM копирующих',
  'row.dataLabel.maxDD': 'Просадка',
  'row.dataLabel.age': 'Возраст',
  'row.dataLabel.balance': 'Баланс',
  'row.dataLabel.fee': 'Комиссия',

  'row.free': 'бесплатно',
  'row.subscribe': 'Подписаться',

  'expanded.currency': 'Валюта',
  'expanded.monthlyProfit': 'Прибыль за месяц',
  'expanded.yearlyProfit': 'Прибыль за год',
  'expanded.balance': 'Баланс',
  'expanded.realizedPnl': 'Реализованная П/У',
  'expanded.unrealizedPnl': 'Нереализованная П/У',
  'expanded.tradesTotal': 'Всего сделок',
  'expanded.winRate': 'Доля прибыльных',
  'expanded.lossRate': 'Доля убыточных',
  'expanded.risk': 'Риск',
  'expanded.age': 'Возраст',
  'expanded.markets': 'Рынки',

  'trades.hide': 'Скрыть',
  'trades.openTrades': 'Открытые сделки',
  'trades.tradeHistory': 'История сделок',

  'tradesPanel.openTrades': 'Открытые сделки',
  'tradesPanel.tradeHistory': 'История сделок (30д)',
  'tradesPanel.loading': 'Загрузка…',
  'tradesPanel.empty': 'Сделок нет.',

  'pager.prev': '‹ назад',
  'pager.next': 'вперёд ›',
  'pager.goto': 'на стр.',

  'progress.refreshing': 'Обновление данных',
  'donut.empty': 'нет данных по рынкам',
  'spark.empty': 'нет данных',

  'fmt.age.days': '{n} д',
  'fmt.age.months': '{n} мес',
  'fmt.age.years': '{n} г',
  'fmt.age.yearsAndMonths': '{y} г {m} мес',
};

export const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = { en, ru };
