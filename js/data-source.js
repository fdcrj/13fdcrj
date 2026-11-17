const FDCRJ_SHEET_ID = '1S_ajLE6RhxOfa771lQaWYcAKhK_BnS1fRC9lLhABLx4';
const FDCRJ_TAP_SHEETS = {
  '3CJ': '524407988',
  'ACRL': '413190384',
  'ACZ': '1864977472',
  'C3': '680027515',
  'CCBR': '1074791199',
  'CCCP': '524116140',
  'CCGM': '1968070550',
  'CCLA': '610865469',
  'CCLO': '646669848',
  'CDM': '920946855',
  'CG': '1014907990',
  'CONCEBA': '284905385',
  'CONCERMIRAFJ': '1468305605',
  'CRB': '1868452334',
  'CSF': '1847097368',
  'INSULANA': '1249067858'
};

function fdcrjNormalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function fdcrjFindColumn(headers, names) {
  const targets = names.map(fdcrjNormalize);
  const normalizedHeaders = headers.map(fdcrjNormalize);
  const exactIndex = normalizedHeaders.findIndex(header => targets.includes(header));
  return exactIndex >= 0 ? exactIndex : normalizedHeaders.findIndex(header => targets.some(name => header.startsWith(`${name} `) || header.startsWith(`${name}:`)));
}

function fdcrjParseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell || row.length) { row.push(cell); if (row.some(value => value.trim())) rows.push(row); }
  return rows;
}

function fdcrjFindHeader(rows, names) {
  return rows.findIndex(row => fdcrjFindColumn(row, names) >= 0);
}

async function fetchTapStatuses() {
  const statuses = new Map();
  const requests = Object.entries(FDCRJ_TAP_SHEETS).map(async ([confraria, gid]) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${FDCRJ_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return;
      const rows = fdcrjParseCSV(await response.text());
      const headerIndex = fdcrjFindHeader(rows, ['Nome da cerveja']);
      if (headerIndex < 0) return;
      const headers = rows[headerIndex].map(fdcrjNormalize);
      const nameIndex = fdcrjFindColumn(headers, ['Nome da cerveja']);
      const styleIndex = fdcrjFindColumn(headers, ['Estilo BJCP']);
      const statusIndex = fdcrjFindColumn(headers, ['Status Engate']);
      const checkInIndex = fdcrjFindColumn(headers, ['Data Check-in']);
      const statusDateIndexes = {
        aguardando: fdcrjFindColumn(headers, ['Aguardando']),
        engatado: fdcrjFindColumn(headers, ['Engatado']),
        acabou: fdcrjFindColumn(headers, ['Acabou'])
      };
      if (nameIndex < 0 || statusIndex < 0) return;
      rows.slice(headerIndex + 1).forEach(row => {
        const name = String(row[nameIndex] || '').trim();
        if (!name) return;
        const style = String(row[styleIndex] || '').trim();
        const key = `${fdcrjNormalize(confraria)}|${fdcrjNormalize(name)}|${fdcrjNormalize(style)}`;
        statuses.set(key, {
          status: String(row[statusIndex] || '').trim(),
          checkInDate: checkInIndex >= 0 ? String(row[checkInIndex] || '').trim() : '',
          statusDates: Object.fromEntries(Object.entries(statusDateIndexes).map(([name, index]) => [name, index >= 0 ? String(row[index] || '').trim() : '']))
        });
      });
    } catch (error) {
      console.warn(`Não foi possível ler a aba ${confraria}:`, error);
    }
  });
  await Promise.all(requests);
  return statuses;
}

window.FDCRJ_DATA_SOURCE = {
  sheetCsvUrl: `https://docs.google.com/spreadsheets/d/${FDCRJ_SHEET_ID}/gviz/tq?tqx=out:csv&gid=503452782`,
  async fetchCsv() {
    const response = await fetch(this.sheetCsvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  },
  async fetchTapStatuses() {
    return fetchTapStatuses();
  },
  tapKey(confraria, name, style) {
    return `${fdcrjNormalize(confraria)}|${fdcrjNormalize(name)}|${fdcrjNormalize(style)}`;
  }
};
