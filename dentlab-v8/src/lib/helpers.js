export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', ' ');
};

export const CURRENCIES = [
  { code: 'DZD', label: 'Dinar Algérien (DA)',  locale: 'fr-DZ', symbol: 'DA' },
  { code: 'EUR', label: 'Euro (€)',              locale: 'fr-FR', symbol: '€' },
  { code: 'USD', label: 'US Dollar ($)',         locale: 'en-US', symbol: '$' },
  { code: 'MAD', label: 'Dirham Marocain',       locale: 'fr-MA', symbol: 'DH' },
  { code: 'TND', label: 'Dinar Tunisien',        locale: 'fr-TN', symbol: 'DT' },
  { code: 'SAR', label: 'Riyal Saoudien',        locale: 'ar-SA', symbol: '﷼' },
  { code: 'AED', label: 'Dirham Émirati',        locale: 'ar-AE', symbol: 'د.إ' },
  { code: 'EGP', label: 'Livre Égyptienne',      locale: 'ar-EG', symbol: '£E' },
  { code: 'GBP', label: 'Livre Sterling',        locale: 'en-GB', symbol: '£' },
  { code: 'CAD', label: 'Dollar Canadien',       locale: 'en-CA', symbol: 'C$' },
  { code: 'CHF', label: 'Franc Suisse',          locale: 'fr-CH', symbol: 'CHF' },
];

export function formatMoney(n, code = 'DZD') {
  const c = CURRENCIES.find(x => x.code === code) || CURRENCIES[0];
  try {
    return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, maximumFractionDigits: 0 }).format(Number(n) || 0);
  } catch {
    return `${(Number(n) || 0).toLocaleString()} ${c.symbol}`;
  }
}

// Legacy alias — kept for backward compatibility. Use formatMoney(n, currency) in new code.
export const DA = (n) => formatMoney(n, 'DZD');

export function newCaseId() { return 'DL-' + uid().slice(0, 5).toUpperCase(); }

export function filterByPeriod(rows, dateKey, period, ref = new Date()) {
  if (period === 'all' || !period) return rows;
  return rows.filter((r) => {
    const raw = r[dateKey]; if (!raw) return false;
    const d = new Date(raw);
    if (period === 'daily')   return d.toDateString() === ref.toDateString();
    if (period === 'monthly') return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    if (period === 'yearly')  return d.getFullYear() === ref.getFullYear();
    return true;
  });
}

export function exportCSV(filename, rows) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(';') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '\uFEFF' + [keys.join(';'), ...rows.map((r) => keys.map((k) => esc(r[k])).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
