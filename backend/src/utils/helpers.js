const ApiError = require('./ApiError');

const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// "2026-11-11" -> Date at 00:00 UTC. Rejects invalid dates.
const parseDay = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str || ''))) throw new ApiError(400, 'Date must be in YYYY-MM-DD format');
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid date');
  return d;
};

// "2026-11" -> { start, end } (end exclusive)
const parseMonth = (str) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(str || ''))) throw new ApiError(400, 'Month must be in YYYY-MM format');
  const [y, m] = str.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
};

const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);

const paginate = (q) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { escapeRegex, pick, parseDay, parseMonth, pct, paginate };
