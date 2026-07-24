export const fmtCurrency = (n) =>
  `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }) : '-';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-LK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

export const fmtNumber = (n, decimals = 2) =>
  Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const today = () => new Date().toISOString().split('T')[0];
