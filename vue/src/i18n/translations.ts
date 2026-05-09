// User-facing strings for the widget. New languages: add another entry to
// TRANSLATIONS, mirroring every key in `en` (the type system enforces this).
// Keys group by surface: `toolbar.*`, `filters.*`, `table.*`, `row.*`, etc.
// Variable interpolation uses `{name}` placeholders, replaced by useI18n's `t()`.

export type Lang = 'en' | 'ru';

const en = {
  // Brand / header
  'app.brand.line1': 'LIBERTEX',
  'app.brand.line2': 'SOCIAL',
  'app.brand.sub': 'Copy Trading',

  // Toolbar
  'toolbar.filters': 'Filters',
  'toolbar.search.placeholder': 'Search by signal name…',
  'toolbar.sort': 'Sort:',
  'toolbar.reload': '↻ reload',
  'toolbar.reload.title': 'reload via /api/discover',
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

  // Risk chips
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
  'expanded.winRate': 'Win Rate',
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

  // Toggles
  'toggle.theme.title': 'Toggle dark mode',
  'toggle.lang.title': 'Switch language',

  // ----- Welcome modal (first-visit promo, suppressed for 30 min after dismiss)
  'welcome.close': 'Close',
  'welcome.title':
    'Start earning more by copying the trades of professionals on Libertex',
  'welcome.desc':
    'Why learn from your own mistakes when you can adopt the experience of the best? Connect to successful traders, copy their strategies, and earn on the financial markets — <b>suitable even for those with no trading experience</b>. Smart trading and fast growth!',
  'welcome.howItWorks': 'How it works',
  'welcome.step1.title': 'Download the app',
  'welcome.step1.desc': 'Available for iOS and Android',
  'welcome.step2.title': 'Quick registration',
  'welcome.step2.desc': 'Use the e-mail from your Libertex account',
  'welcome.step3.title': 'Link your MetaTrader account',
  'welcome.step3.desc':
    'Copy the credentials from the «More» section in the Libertex app and paste them into the «Account» section in the Copy&nbsp;Trading app',
  'welcome.step4.title': 'Choose a top trader',
  'welcome.step4.desc': 'Browse profiles and pick one whose strategy fits you',
  'welcome.step5.title': 'Automatic copying',
  'welcome.step5.desc':
    "The system replicates the chosen trader's deals in real time",
  'welcome.bonus.title': 'Track the result',
  'welcome.bonus.desc':
    'Monitor profitability, change settings or pause at any time',
  'welcome.cta': 'Start now',
  'welcome.tag': "Let the experts' experience work for you!",
};

export type TranslationKey = keyof typeof en;

const ru: Record<TranslationKey, string> = {
  'app.brand.line1': 'LIBERTEX',
  'app.brand.line2': 'SOCIAL',
  'app.brand.sub': 'Copy Trading',

  'toolbar.filters': 'Фильтры',
  'toolbar.search.placeholder': 'Поиск по названию сигнала…',
  'toolbar.sort': 'Сортировка:',
  'toolbar.reload': '↻ обновить',
  'toolbar.reload.title': 'обновить через /api/discover',
  'toolbar.counts.html':
    'Показано <b>{filtered}</b> из <b>{total}</b> · стр. <b>{page}</b> / {totalPages}',

  'filters.risk': 'Риск',
  'filters.reset': 'сбросить фильтры',
  'filters.return': 'Доходность %',
  'filters.maxDD': 'Макс. просадка ≤',
  'filters.balance': 'Баланс',
  'filters.mgmtFee': 'Комиссия ≤',
  'filters.copiersAUM': 'Объём копиров. ≥',
  'filters.copiers': 'Копировщиков ≥',
  'filters.age': 'Возраст ≥ (дн.)',
  'filters.trades': 'Сделок ≥',
  'filters.winRate': 'Win Rate ≥',
  'filters.investAmount': 'Ваш инвест. бюджет, $',
  'filters.investPlaceholder': 'напр. 5000',
  'filters.any': 'любой',

  'risk.Low': 'Низкий',
  'risk.Medium': 'Средний',
  'risk.High': 'Высокий',
  'risk.Unsuitable': 'Неподходящий',

  'sort.return-desc': 'Доходность ↓',
  'sort.return-asc': 'Доходность ↑',
  'sort.copiers-desc': 'Копировщики ↓',
  'sort.copiers-asc': 'Копировщики ↑',
  'sort.aum-desc': 'Объём ↓',
  'sort.aum-asc': 'Объём ↑',
  'sort.dd-asc': 'Просадка ↑',
  'sort.dd-desc': 'Просадка ↓',
  'sort.fee-asc': 'Комиссия ↑',
  'sort.fee-desc': 'Комиссия ↓',
  'sort.age-desc': 'Возраст ↓',
  'sort.age-asc': 'Возраст ↑',
  'sort.balance-desc': 'Баланс ↓',
  'sort.balance-asc': 'Баланс ↑',
  'sort.winrate-desc': 'Win Rate ↓',
  'sort.winrate-asc': 'Win Rate ↑',
  'sort.trades-desc': 'Сделок ↓',
  'sort.trades-asc': 'Сделок ↑',
  'sort.monthly-desc': 'Прибыль/мес ↓',
  'sort.monthly-asc': 'Прибыль/мес ↑',

  'table.name': 'Название',
  'table.equityCurve': 'График доходности',
  'table.return': 'Доходность %',
  'table.copiers': 'Копировщики',
  'table.copiersAUM': 'Объём копиров.',
  'table.maxDrawdown': 'Макс. просадка',
  'table.age': 'Возраст',
  'table.balance': 'Баланс',
  'table.mgmtFee': 'Комиссия %',
  'table.empty': 'Ничего не найдено.',

  'row.dataLabel.equityCurve': 'График доходности',
  'row.dataLabel.return': 'Доходность',
  'row.dataLabel.copiers': 'Копировщики',
  'row.dataLabel.copiersAUM': 'Объём копиров.',
  'row.dataLabel.maxDD': 'Макс DD',
  'row.dataLabel.age': 'Возраст',
  'row.dataLabel.balance': 'Баланс',
  'row.dataLabel.fee': 'Комиссия',

  'row.free': 'бесплатно',
  'row.subscribe': 'Подписаться',

  'expanded.currency': 'Валюта',
  'expanded.monthlyProfit': 'Прибыль за месяц',
  'expanded.yearlyProfit': 'Прибыль за год',
  'expanded.balance': 'Баланс',
  'expanded.realizedPnl': 'Реализ. P/L',
  'expanded.unrealizedPnl': 'Нереализ. P/L',
  'expanded.tradesTotal': 'Всего сделок',
  'expanded.winRate': 'Win Rate',
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
  'pager.goto': 'перейти на',

  'progress.refreshing': 'Обновление данных',
  'donut.empty': 'нет данных по рынкам',
  'spark.empty': 'нет данных',

  'fmt.age.days': '{n} д',
  'fmt.age.months': '{n} мес',
  'fmt.age.years': '{n} г',
  'fmt.age.yearsAndMonths': '{y} г {m} мес',

  'toggle.theme.title': 'Сменить тему',
  'toggle.lang.title': 'Сменить язык',

  'welcome.close': 'Закрыть',
  'welcome.title':
    'Начните зарабатывать больше, копируя сделки профессионалов в Libertex',
  'welcome.desc':
    'Зачем учиться на своих ошибках, если можно перенимать опыт лучших? Подключайтесь к успешным трейдерам, копируйте их стратегии и зарабатывайте на финансовых рынках — <b>подходит даже тем, у кого нет опыта в торговле</b>. Разумный трейдинг и быстрый рост!',
  'welcome.howItWorks': 'Как это работает',
  'welcome.step1.title': 'Скачайте приложение',
  'welcome.step1.desc': 'Доступно для iOS и Android',
  'welcome.step2.title': 'Быстрая регистрация',
  'welcome.step2.desc': 'Используйте e-mail от вашего аккаунта Libertex',
  'welcome.step3.title': 'Привяжите счёт MetaTrader',
  'welcome.step3.desc':
    'Скопируйте данные из раздела «Ещё» в приложении Libertex и вставьте их в раздел «Счёт» в приложении Copy&nbsp;Trading',
  'welcome.step4.title': 'Выберите топ-трейдера',
  'welcome.step4.desc':
    'Изучите профили и выберите того, чья стратегия вам подходит',
  'welcome.step5.title': 'Автоматическое копирование',
  'welcome.step5.desc':
    'Система повторяет сделки выбранного трейдера в реальном времени',
  'welcome.bonus.title': 'Следите за результатом',
  'welcome.bonus.desc':
    'Отслеживайте доходность, меняйте настройки или ставьте на паузу в любой момент',
  'welcome.cta': 'Начать сейчас',
  'welcome.tag': 'Пусть опыт экспертов работает на вас!',
};

export const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = { en, ru };
