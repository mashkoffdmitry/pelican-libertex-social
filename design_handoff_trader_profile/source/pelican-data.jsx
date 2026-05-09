/* pelican-data.jsx — invented traders, instruments, trades */

const TRADERS = [
  { id: 1, name: "Marcus Halden",   handle: "@halden",      country: "DK", strategy: "Mean-Reversion FX",      ret30: 8.4,  ret90: 21.7, retY: 64.2,  sharpe: 2.31, dd: -6.1,  win: 71, aum: 14.2, subs: 3120, age: "4y" },
  { id: 2, name: "Rena Iovanna",    handle: "@iovanna",     country: "IT", strategy: "Equity Momentum",        ret30: 6.9,  ret90: 18.4, retY: 58.0,  sharpe: 2.04, dd: -7.8,  win: 64, aum: 22.7, subs: 5840, age: "6y" },
  { id: 3, name: "Felix Arnaut",    handle: "@arnaut",      country: "FR", strategy: "Vol-Selling Index",      ret30: 4.2,  ret90: 12.6, retY: 41.5,  sharpe: 1.88, dd: -4.4,  win: 78, aum: 9.4,  subs: 2210, age: "3y" },
  { id: 4, name: "Oksana Veres",    handle: "@veres",       country: "PL", strategy: "Crypto Trend",           ret30: 12.1, ret90: 34.2, retY: 102.6, sharpe: 1.71, dd: -14.8, win: 58, aum: 6.1,  subs: 7820, age: "2y" },
  { id: 5, name: "Theo Marling",    handle: "@marling",     country: "GB", strategy: "Macro Carry",            ret30: 3.8,  ret90: 10.1, retY: 28.7,  sharpe: 1.62, dd: -3.2,  win: 69, aum: 31.5, subs: 1980, age: "8y" },
  { id: 6, name: "Junko Sato",      handle: "@sato",        country: "JP", strategy: "Pairs Trading",          ret30: 5.4,  ret90: 15.9, retY: 45.3,  sharpe: 2.18, dd: -5.5,  win: 73, aum: 11.8, subs: 2640, age: "5y" },
  { id: 7, name: "Idris Bahar",     handle: "@bahar",       country: "TR", strategy: "Commodities Breakout",   ret30: 7.2,  ret90: 19.3, retY: 52.1,  sharpe: 1.79, dd: -9.0,  win: 61, aum: 4.7,  subs: 980,  age: "3y" },
  { id: 8, name: "Camille Dorset",  handle: "@dorset",      country: "CA", strategy: "Long-Only Quality",      ret30: 2.9,  ret90: 8.4,  retY: 24.2,  sharpe: 1.55, dd: -2.6,  win: 82, aum: 18.3, subs: 1450, age: "7y" },
  { id: 9, name: "Henrik Tovaas",   handle: "@tovaas",      country: "NO", strategy: "Fixed-Income Relative",  ret30: 3.1,  ret90: 9.7,  retY: 31.4,  sharpe: 2.42, dd: -2.1,  win: 84, aum: 26.9, subs: 1180, age: "9y" },
  { id: 10,name: "Sara Madsen",     handle: "@madsen",      country: "SE", strategy: "Sector Rotation",        ret30: 5.7,  ret90: 14.8, retY: 38.6,  sharpe: 1.69, dd: -6.7,  win: 67, aum: 8.5,  subs: 1730, age: "4y" },
];

const POSITIONS = [
  { sym: "EUR/USD",  name: "Euro vs US Dollar",       w: 22, dir: "long"  },
  { sym: "DAX40",    name: "Germany 40 Index",        w: 18, dir: "long"  },
  { sym: "USD/JPY",  name: "US Dollar vs Yen",        w: 14, dir: "short" },
  { sym: "GBP/CHF",  name: "Sterling vs Franc",       w: 11, dir: "long"  },
  { sym: "BRENT",    name: "Brent Crude",             w: 9,  dir: "short" },
  { sym: "XAU/USD",  name: "Gold Spot",               w: 8,  dir: "long"  },
  { sym: "AUD/CAD",  name: "Aussie vs Canadian",      w: 7,  dir: "short" },
  { sym: "CASH",     name: "Cash reserve",            w: 11, dir: "cash"  },
];

const TRADES = [
  { sym: "EUR/USD", side: "Buy",   size: "0.42 lot", entry: "1.0824", exit: "1.0871", pnl: +1.9, when: "12 min ago"      },
  { sym: "DAX40",   side: "Buy",   size: "0.10 lot", entry: "18,420", exit: "18,604", pnl: +2.4, when: "47 min ago"      },
  { sym: "USD/JPY", side: "Sell",  size: "0.35 lot", entry: "157.10", exit: "156.62", pnl: +0.7, when: "1 h ago"         },
  { sym: "BRENT",   side: "Sell",  size: "0.20 lot", entry: "82.40",  exit: "83.10",  pnl: -0.9, when: "3 h ago"         },
  { sym: "GBP/CHF", side: "Buy",   size: "0.18 lot", entry: "1.1284", exit: "1.1352", pnl: +1.2, when: "6 h ago"         },
  { sym: "XAU/USD", side: "Buy",   size: "0.05 lot", entry: "2,338",  exit: "2,361",  pnl: +0.8, when: "yesterday, 19:24" },
  { sym: "AUD/CAD", side: "Sell",  size: "0.30 lot", entry: "0.9012", exit: "0.8980", pnl: +0.4, when: "yesterday, 11:08" },
];

const NAV = ["Discover", "Leaders", "Portfolio", "Activity"];

const FILTER_TAGS = [
  { k: "Risk", v: "Low–Med" },
  { k: "Track record", v: "≥ 2 years" },
  { k: "Asset", v: "FX, Indices" },
  { k: "Region", v: "EU" },
];

Object.assign(window, { TRADERS, POSITIONS, TRADES, NAV, FILTER_TAGS });
