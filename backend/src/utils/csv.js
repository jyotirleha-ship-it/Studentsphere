const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent CSV/Excel formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

exports.toCSV = (columns, rows) =>
  [columns.map((c) => cell(c.header)).join(','), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(','))].join('\r\n');

exports.sendCSV = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
};
