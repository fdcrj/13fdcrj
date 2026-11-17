const SHEET_CSV_URL = window.FDCRJ_DATA_SOURCE?.sheetCsvUrl || 'https://docs.google.com/spreadsheets/d/1S_ajLE6RhxOfa771lQaWYcAKhK_BnS1fRC9lLhABLx4/gviz/tq?tqx=out:csv&gid=503452782';
let DATA = [];
let sharedRatings = {};
let tapStatuses = new Map();

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
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
function deriveFamily(style) {
  const value = String(style || '').toLowerCase();
  if (/ipa|pale ale|hoppy/.test(value)) return 'IPA & Lupuladas';
  if (/sour|ácid|acid|gose|kettle/.test(value)) return 'Ácidas & Sours';
  if (/trigo|wheat|weiss|witbier/.test(value)) return 'Trigo';
  if (/saison|belgian|belga|dubbel|tripel|strong ale/.test(value)) return 'Belgas & Saison';
  if (/lager|pils|helles|bock|kölsch|kolsch/.test(value)) return 'Lagers';
  if (/stout|porter|dunkel|schwarz|black ale|brown ale/.test(value)) return 'Escuras tostadas';
  if (/bitter|amber|altbier|red ale|scotch ale/.test(value)) return 'Ales maltadas';
  if (/blonde|blond|cream ale|golden ale|pilsen|pale lager/.test(value)) return 'Ales claras';
  if (/fruit|frut|spice|herb|vegetable|experimental|rio/.test(value)) return 'Especiais & Frutadas';
  return 'Outros';
}
const BEER_SCHOOLS = ['Alemã', 'Americana', 'Belga', 'Inglesa'];
const GERMAN_BJCP_CODES = new Set(['3A','3B','3C','3D','4A','4B','4C','5A','5B','5C','5D','6A','6B','6C','7A','7B','8A','8B','9A','9B','9C','10A','10B','10C','23A','23G']);
const GERMAN_HISTORICAL_STYLES = ['kellerbier', 'lichtenhainer', 'piwo grodziskie', 'roggenbier', 'sahti'];
function getBJCPCode(style) {
  const match = normalizeText(style).match(/(?:^|[^0-9])0?([3-9]|10|23)([a-g])(?:[^a-z]|$)/i);
  return match ? `${Number(match[1])}${match[2].toUpperCase()}` : '';
}
function isGermanSchoolStyle(style) {
  const value = normalizeText(style);
  const code = getBJCPCode(style);
  return GERMAN_BJCP_CODES.has(code) || (value.includes('27') && GERMAN_HISTORICAL_STYLES.some(name => value.includes(name))) || GERMAN_HISTORICAL_STYLES.some(name => value === name);
}
function classifyBeerSchool(style) {
  const value = normalizeText(style);
  // Regra deliberadamente fechada: a Escola Alemã contém somente os estilos solicitados.
  if (isGermanSchoolStyle(style)) return 'Alemã';
  if (/belg|belga|trappist|monastic|saison|lambic|gueuze|flanders|witbier|dubbel|tripel|golden strong|biere de garde|fruit lambic/.test(value)) return 'Belga';
  if (/english ipa/.test(value)) return 'Inglesa';
  if (/american|americana|california common|new world|kentucky common|ipa|hazy|imperial|american wild/.test(value)) return 'Americana';
  if (/british|britan|english|ingles|scottish|scotch|wee heavy|irish|porter|old ale|barleywine|mild|bitter|stout/.test(value)) return 'Inglesa';
  // Estilos não listados são encaminhados às outras escolas por aproximação textual.
  if (/sour|acid|fruit|spice|wild/.test(value)) return 'Belga';
  if (/ale|bitter|brown|dark|red/.test(value)) return 'Inglesa';
  return 'Americana';
}
function beerShareKey(item) {
  return window.FDCRJ_BEER_MODEL ? window.FDCRJ_BEER_MODEL.shareKey(item) : normalizeText(`${item.cerveja}-${item.confrariaNome}-${item.estilo}`).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}
function beerShareUrl(item) {
  const page = new URL('cerveja.html', window.location.href);
  page.searchParams.set('slug', beerShareKey(item));
  return page.href;
}
function normalizeSheetData(text, statuses = tapStatuses) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map(value => value.trim().toLowerCase());
  const column = (...names) => names.map(name => headers.indexOf(name.toLowerCase())).find(index => index >= 0);
  const get = (row, ...names) => { const index = column(...names); return index === undefined ? '' : String(row[index] || '').trim(); };
  return rows.slice(1).map((row, index) => {
    const estilo = get(row, 'Estilo BJCP') || 'Não informado';
    const confraria = get(row, 'Confraria') || 'Não informado';
    const name = get(row, 'Nome da cerveja') || `cerveja-${index + 1}`;
    const tapKey = window.FDCRJ_DATA_SOURCE?.tapKey?.(confraria, name, estilo) || `${normalizeText(confraria)}|${normalizeText(name)}|${normalizeText(estilo)}`;
    const statusRecord = statuses.get(tapKey) || {};
    const statusEngate = get(row, 'Status Engate') || statusRecord.status || '';
    const checkInDate = get(row, 'Data Check-in') || statusRecord.checkInDate || '';
    const statusDates = {
      aguardando: get(row, 'Aguardando') || statusRecord.statusDates?.aguardando || '',
      engatado: get(row, 'Engatado') || statusRecord.statusDates?.engatado || '',
      acabou: get(row, 'Acabou', 'Esgotado') || statusRecord.statusDates?.acabou || ''
    };
    return {
      id: beerShareKey({ cerveja: name, confrariaNome: confraria, estilo }),
      rowIndex: index,
      confraria,
      confrariaNome: confraria,
      categoria: get(row, 'Tipo') || 'Não informado',
      responsavel: get(row, 'Cervejeiro') || 'Não informado',
      escola: classifyBeerSchool(estilo),
      cerveja: name === `cerveja-${index + 1}` ? 'Cerveja não informada' : name,
      estilo,
      descricao: get(row, 'Descrição'),
      volume: get(row, 'Volume'),
      abv: get(row, 'ABV'),
      ibu: get(row, 'IBU'),
      ebc: get(row, 'EBC'),
      familia: deriveFamily(estilo),
      cidade: get(row, 'Cidade', 'Município', 'Municipio'),
      bairro: get(row, 'Bairro'),
      endereco: get(row, 'Endereço', 'Endereco', 'Localização', 'Localizacao'),
      latitude: get(row, 'Latitude', 'Lat'),
      longitude: get(row, 'Longitude', 'Lon', 'Lng'),
      foto: get(row, 'Foto', 'Imagem', 'Image', 'URL da foto'),
      logo: get(row, 'Logo', 'Logo da confraria'),
      checkInDate,
      statusDates,
      ingredientes: get(row, 'Ingredientes', 'Maltes e lúpulos', 'Maltes e lupulos'),
      harmonizacao: get(row, 'Harmonização', 'Harmonizacao', 'Harmonização sugerida'),
      temperatura: get(row, 'Temperatura', 'Temperatura ideal'),
      copo: get(row, 'Copo', 'Copo recomendado'),
      aroma: get(row, 'Aroma', 'Perfil aromático'),
      sabor: get(row, 'Sabor', 'Perfil de sabor'),
      statusEngate,
      naTorneira: normalizeText(statusEngate) === 'engatado',
      noFdcrj: Boolean(checkInDate)
    };
  }).filter(item => item.cerveja && item.cerveja !== 'Cerveja não informada' || item.descricao || item.confraria !== 'Não informado');
}
async function loadSheetData() {
  const status = document.getElementById('dataSourceStatus');
  try {
    const csvText = window.FDCRJ_DATA_SOURCE ? await window.FDCRJ_DATA_SOURCE.fetchCsv() : await (await fetch(SHEET_CSV_URL, { cache: 'no-store' })).text();
    tapStatuses = window.FDCRJ_DATA_SOURCE?.fetchTapStatuses ? await window.FDCRJ_DATA_SOURCE.fetchTapStatuses() : new Map();
    DATA = normalizeSheetData(csvText, tapStatuses);
    const previousSnapshot = JSON.parse(localStorage.getItem('fdcrj_snapshot') || 'null');
    const delta = previousSnapshot ? DATA.length - previousSnapshot.count : 0;
    const changeText = previousSnapshot ? ` • ${delta >= 0 ? '+' : ''}${delta} desde a última visita` : '';
    localStorage.setItem('fdcrj_snapshot', JSON.stringify({ count: DATA.length, timestamp: new Date().toISOString() }));
    if (status) status.textContent = DATA.length ? `Fonte: planilha 13º FDCRJ • ${DATA.length} cervejas carregadas${changeText} • ${DATA.filter(item => item.naTorneira).length} na torneira • carregado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Fonte conectada: a aba All Beers ainda não possui registros';
  } catch (error) {
    DATA = [];
    if (status) status.textContent = 'Não foi possível carregar a planilha. Verifique o acesso público e tente novamente.';
    console.error('Falha ao carregar a planilha:', error);
  }
}
let BEERS = [];

// Cores temáticas por família de estilo
const FAM_COLORS = {
  "Ales maltadas": "#d97706",
  "Escuras tostadas": "#451a03",
  "IPA & Lupuladas": "#15803d",
  "Ales claras": "#eab308",
  "Lagers": "#f59e0b",
  "Trigo": "#ca8a04",
  "Especiais & Frutadas": "#0284c7",
  "Belgas & Saison": "#b45309",
  "Ácidas & Sours": "#ec4899",
  "Outros": "#64748b"
};

let userFavs = JSON.parse(localStorage.getItem('fdcrj_favs') || '[]');
let userRatings = JSON.parse(localStorage.getItem('fdcrj_ratings') || '{}');
let userNotes = JSON.parse(localStorage.getItem('fdcrj_notes') || '{}');
let userTasting = JSON.parse(localStorage.getItem('fdcrj_tasting') || '{}');
let userTasted = JSON.parse(localStorage.getItem('fdcrj_tasted') || '{}');
let compareSet = JSON.parse(localStorage.getItem('fdcrj_compare') || '[]');
let charts = {};
let activeModalBeer = null;
let bjcpReferenceRequest = 0;

// Elementos DOM
const $ = s => document.querySelector(s); const $$ = s => document.querySelectorAll(s);

// Inicialização
function init() {
  setupTheme();
  setupExperience();
  buildFilters();
  renderStatusBoard();
  renderGrid();
  renderLegend();
  updateStats();
  renderInsights();
  renderDashboard();
  renderRecommendations();
  renderCompare();
  bindEvents();
  parseURLParams();
}

function statusBoardBucket(status) {
  const value = normalizeText(status);
  if (value === 'aguardando') return 'Aguardando';
  if (value === 'engatado') return 'Engatado';
  if (value === 'esgotado' || value === 'acabou') return 'Acabou';
  return null;
}

function renderStatusBoard() {
  const buckets = { Aguardando: [], Engatado: [], Acabou: [] };
  const statusDateKey = { Aguardando: 'aguardando', Engatado: 'engatado', Acabou: 'acabou' };
  DATA.forEach((item, index) => {
    const bucket = statusBoardBucket(item.statusEngate);
    if (bucket) buckets[bucket].push({ item, index });
  });
  Object.entries(buckets).forEach(([bucket, entries]) => {
    const count = $(`#statusCount${bucket}`);
    const list = $(`#statusList${bucket}`);
    if (count) count.textContent = entries.length;
    if (!list) return;
    list.innerHTML = entries.length ? entries.map(({ item, index }) => { const statusDate = item.statusDates?.[statusDateKey[bucket]]; return `<button class="status-beer-bar ${normalizeText(item.statusEngate).replace(/[^a-z]+/g, '-')}" type="button" onclick="openModal(${index})"><strong>${escapeHtml(item.cerveja)}</strong><span>${escapeHtml(item.estilo)}</span><small>${escapeHtml(item.confrariaNome)}</small>${statusDate ? `<small class="status-date">${escapeHtml(bucket)} em ${escapeHtml(statusDate)}</small>` : ''}</button>`; }).join('') : '<div class="status-empty">Nenhuma cerveja neste status.</div>';
  });
}

function setupExperience() {
  if (localStorage.getItem('fdcrj_event_mode') === '1') { document.body.classList.add('event-mode'); $('#eventModeToggle').setAttribute('aria-pressed','true'); $('#eventModeToggle').textContent='🎪 Sair do evento'; }
  const accessibility = localStorage.getItem('fdcrj_accessibility') || 'normal';
  if (accessibility === 'contrast') document.body.classList.add('high-contrast');
  if (accessibility === 'large') document.body.classList.add('font-large');
  if (accessibility === 'xlarge') document.body.classList.add('font-xlarge');
}
function setupTheme() {
  const savedTheme = localStorage.getItem('fdcrj_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  $('#theme').textContent = savedTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro';
}

$('#theme').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('fdcrj_theme', next);
  $('#theme').textContent = next === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro';
  renderDashboard();
});

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function toNumber(value) {
  const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}
function hasCompleteData(item) {
  return Boolean(item.confrariaNome && item.cerveja && item.estilo && item.descricao && item.volume && item.abv && item.ibu && item.ebc);
}
async function loadSharedRatings() {
  if (!window.FDCRJ_AUTH?.getSharedRating) return;
  try {
    await window.FDCRJ_AUTH.ready;
    const results = await Promise.all(DATA.map(async item => {
      const slug = beerShareKey(item);
      return [slug, await window.FDCRJ_AUTH.getSharedRating(slug)];
    }));
    sharedRatings = Object.fromEntries(results);
    renderGrid();
  } catch (error) {
    console.warn('Avaliações públicas indisponíveis:', error);
  }
}
function buildFilters() {
  const confs = [...new Set(DATA.map(d => d.confrariaNome))].sort();
  const cats = [...new Set(DATA.map(d => d.categoria))].sort();
  const fams = [...new Set(DATA.map(d => d.familia))].sort();
  const styles = [...new Set(DATA.map(d => d.estilo))].sort();
  const brewers = [...new Set(DATA.map(d => d.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const schools = BEER_SCHOOLS;

  fillSelect('#cf', 'Todas as Confrarias', confs);
  fillSelect('#ct', 'Todas as Categorias', cats);
  fillSelect('#fm', 'Todas as Famílias', fams);
  fillSelect('#st', 'Todos os Estilos', styles);
  fillSelect('#brewer', 'Todos os Cervejeiros', brewers);
  fillSelect('#school', 'Todas as Escolas Cervejeiras', schools);
}

function fillSelect(sel, placeholder, items) {
  const el = $(sel);
  el.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${escapeAttr(i)}">${escapeHtml(i)}</option>`).join('');
}

function getFilteredData() {
  const q = normalizeText($('#q').value);
  const cf = $('#cf').value, ct = $('#ct').value, fm = $('#fm').value, st = $('#st').value;
  const brewer = $('#brewer').value;
  const school = $('#school').value;
  const abvMin = toNumber($('#abvMin').value), abvMax = toNumber($('#abvMax').value);
  const ibuMin = toNumber($('#ibuMin').value), volume = toNumber($('#volumeFilter').value);
  const sort = $('#or').value;
  const onlyFav = $('#onlyFav').getAttribute('aria-pressed') === 'true';
  const onlyDesc = $('#onlyDesc').getAttribute('aria-pressed') === 'true';
  const onlyRio = $('#onlyRio').getAttribute('aria-pressed') === 'true';
  const onlyIpa = $('#onlyIpa').getAttribute('aria-pressed') === 'true';
  const onlyComplete = $('#onlyComplete').getAttribute('aria-pressed') === 'true';
  const onlyUntasted = $('#onlyUntasted').getAttribute('aria-pressed') === 'true';
  const onlyTap = $('#onlyTap').getAttribute('aria-pressed') === 'true';
  return DATA.filter((item, idx) => {
    if (cf && item.confrariaNome !== cf) return false;
    if (ct && item.categoria !== ct) return false;
    if (fm && item.familia !== fm) return false;
    if (st && item.estilo !== st) return false;
    if (brewer && item.responsavel !== brewer) return false;
    if (school && item.escola !== school) return false;
    const itemAbv = toNumber(item.abv), itemIbu = toNumber(item.ibu), itemVolume = toNumber(item.volume);
    if (Number.isFinite(abvMin) && (!Number.isFinite(itemAbv) || itemAbv < abvMin)) return false;
    if (Number.isFinite(abvMax) && (!Number.isFinite(itemAbv) || itemAbv > abvMax)) return false;
    if (Number.isFinite(ibuMin) && (!Number.isFinite(itemIbu) || itemIbu < ibuMin)) return false;
    if (Number.isFinite(volume) && (!Number.isFinite(itemVolume) || itemVolume !== volume)) return false;
    if (onlyFav && !userFavs.includes(idx)) return false;
    if (onlyDesc && !item.descricao) return false;
    if (onlyRio && !item.categoria.includes('Rio') && item.estilo !== 'Estilo Rio') return false;
    if (onlyIpa && !normalizeText(item.estilo).includes('ipa') && !normalizeText(item.familia).includes('ipa')) return false;
    if (onlyComplete && !hasCompleteData(item)) return false;
    if (onlyUntasted && userTasted[idx]) return false;
    if (onlyTap && !item.naTorneira) return false;
    if (q) {
      const haystack = normalizeText([item.cerveja, item.estilo, item.confrariaNome, item.responsavel, item.escola, item.descricao, item.categoria, item.familia, item.volume, item.abv, item.ibu, item.ebc].join(' '));
      if (!q.split(/\s+/).every(term => haystack.includes(term))) return false;
    }
    return true;
  }).sort((a, b) => {
    const idxA = DATA.indexOf(a), idxB = DATA.indexOf(b);
    if (sort === 'cerveja') return a.cerveja.localeCompare(b.cerveja);
    if (sort === 'confraria') return a.confrariaNome.localeCompare(b.confrariaNome);
    if (sort === 'estilo') return a.estilo.localeCompare(b.estilo);
    if (sort === 'categoria') return a.categoria.localeCompare(b.categoria);
    if (sort === 'rating') return (sharedRatings[beerShareKey(b)]?.average || 0) - (sharedRatings[beerShareKey(a)]?.average || 0);
    return 0;
  });
}
function renderActiveFilters() {
  const target = $('#activeFilters');
  if (!target) return;
  const filters = [
    ['Busca', $('#q').value.trim()], ['Confraria', $('#cf').value], ['Categoria', $('#ct').value],
    ['Família', $('#fm').value], ['Estilo', $('#st').value], ['Cervejeiro', $('#brewer').value], ['Escola de cerveja', $('#school').value],
    ['ABV mín.', $('#abvMin').value], ['ABV máx.', $('#abvMax').value], ['IBU mín.', $('#ibuMin').value], ['Volume', $('#volumeFilter').value],
    ['⭐ Favoritas', $('#onlyFav').getAttribute('aria-pressed') === 'true' ? 'Ativo' : ''],
    ['📝 Com descrição', $('#onlyDesc').getAttribute('aria-pressed') === 'true' ? 'Ativo' : ''],
    ['🏖️ Estilo Rio', $('#onlyRio').getAttribute('aria-pressed') === 'true' ? 'Ativo' : ''],
    ['🌿 IPAs', $('#onlyIpa').getAttribute('aria-pressed') === 'true' ? 'Ativo' : '']
    ,['✅ Dados completos', $('#onlyComplete').getAttribute('aria-pressed') === 'true' ? 'Ativo' : '']
  ].filter(([, value]) => value);
  target.innerHTML = filters.length ? filters.map(([label, value]) => `<span class="active-filter">${escapeHtml(label)}: ${escapeHtml(value)}</span>`).join('') : '<span class="filter-help">Nenhum filtro aplicado</span>';
}
function renderGrid() {
  const list = getFilteredData();
  const grid = $('#grid');
  $('#count').textContent = `${list.length} cerveja(s) encontrada(s)`;

  if (list.length === 0) {
    grid.innerHTML = DATA.length === 0
      ? `<div class="empty"><strong>A lista ainda está aguardando os dados</strong><p>A conexão com a aba <b>All Beers</b> está funcionando, mas a planilha ainda não possui registros preenchidos.</p></div>`
      : `<div class="empty"><strong>Nenhuma cerveja encontrada</strong><p>Tente remover algum filtro ou use o botão “Limpar filtros”.</p><button class="pill" type="button" onclick="clearAllFilters()">Limpar filtros</button></div>`;
    return;
  }

  grid.innerHTML = list.map(item => {
    const idx = DATA.indexOf(item);
    const color = FAM_COLORS[item.familia] || 'var(--brand)';
    const isFav = userFavs.includes(idx);
    const rating = userRatings[idx] || 0;
    const isCompared = compareSet.includes(idx);
    const stars = rating > 0 ? ' ⭐'.repeat(rating) : '';

    return `
      <article class="card" onclick="openModal(${idx})">
        <div class="stripe" style="--c:${color}"></div>
        <div class="body">
          <div><span class="tag" style="--c:${color}">${escapeHtml(item.familia)}</span></div>
          <button class="fav" aria-pressed="${isFav}" onclick="toggleFav(event, ${idx})" title="Favoritar">⭐</button>
          <h3>${escapeHtml(item.cerveja)}${stars}</h3>
          <div class="meta">${escapeHtml(item.estilo)} • <strong>${escapeHtml(item.confrariaNome)}</strong></div>
          <div class="specs"><span class="tap-badge ${normalizeText(item.statusEngate || 'não informado').replace(/[^a-z]+/g, '-')}">${item.naTorneira ? '🍺 ' : ''}Status: ${escapeHtml(item.statusEngate || 'Não informado')}</span>${sharedRatings[beerShareKey(item)]?.count ? `<span class="spec">★ ${sharedRatings[beerShareKey(item)].average.toFixed(1).replace('.', ',')} (${sharedRatings[beerShareKey(item)].count})</span>` : ''}${item.volume ? `<span class="spec">${escapeHtml(formatMeasure(item.volume, 'L'))}</span>` : ''}${item.abv ? `<span class="spec">${escapeHtml(formatMeasure(item.abv, '% ABV'))}</span>` : ''}${item.ibu ? `<span class="spec">${escapeHtml(formatMeasure(item.ibu, 'IBU'))}</span>` : ''}</div>
          <p class="desc">${item.descricao ? escapeHtml(item.descricao) : '<em>Sem descrição sensorial detalhada.</em>'}</p>
          <div class="owner">👤 ${escapeHtml(item.responsavel)} (${escapeHtml(item.categoria)})${item.escola ? `<br>🎓 ${escapeHtml(item.escola)}` : ''}</div><div class="compare-actions"><a class="compare-card-button" href="${beerShareUrl(item)}" onclick="event.stopPropagation()">↗ Abrir ficha</a><button class="compare-card-button" type="button" onclick="event.stopPropagation(); toggleCompare(${idx})">${isCompared ? '✓ Comparando' : '⚖️ Comparar'}</button>${userTasted[idx] ? '<span class="compare-card-button">✓ Já degustei</span>' : ''}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderLegend() {
  const chips = $('#chips');
  chips.innerHTML = Object.keys(FAM_COLORS).map(fam => {
    const color = FAM_COLORS[fam];
    const count = DATA.filter(d => d.familia === fam).length;
    return `
      <button class="chip" onclick="filterByFam('${fam}')">
        <span class="dot" style="--c:${color}"></span>
        <span>${escapeHtml(fam)}</span>
        <b>(${count})</b>
      </button>
    `;
  }).join('');
}

function filterByFam(fam) {
  $('#fm').value = fam;
  renderGrid();
  window.scrollTo({ top: $('#grid').offsetTop - 80, behavior: 'smooth' });
}

function renderInsights() {
  const target = $('#insightsGrid');
  if (!target) return;
  const countBy = key => Object.entries(DATA.reduce((acc, item) => { const value = item[key] || 'Não informado'; acc[value] = (acc[value] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const groups = [['Famílias', countBy('familia')], ['Estilos', countBy('estilo')], ['Confrarias', countBy('confrariaNome')]];
  const max = Math.max(1, ...groups.flatMap(([, values]) => values.map(([, count]) => count)));
  target.innerHTML = groups.map(([title, values]) => `<div class="insight"><h3>${escapeHtml(title)}</h3>${values.length ? values.map(([label, count]) => `<div class="insight-row"><span title="${escapeAttr(label)}">${escapeHtml(label)}</span><span class="track"><span class="fill" style="width:${Math.round(count / max * 100)}%"></span></span><b>${count}</b></div>`).join('') : '<span class="filter-help">Sem dados</span>'}</div>`).join('');
}
function validateData() {
  const result = $('#validationResult');
  if (!DATA.length) { result.innerHTML = '<strong>Nenhum registro carregado.</strong> A aba All Beers está vazia ou ainda não foi preenchida.'; return; }
  const checks = {
    'sem nome': DATA.filter(item => !item.cerveja || item.cerveja === 'Cerveja não informada').length,
    'sem confraria': DATA.filter(item => !item.confrariaNome || item.confrariaNome === 'Não informado').length,
    'sem estilo': DATA.filter(item => !item.estilo || item.estilo === 'Não informado').length,
    'sem descrição': DATA.filter(item => !item.descricao).length,
    'ABV inválido': DATA.filter(item => !Number.isFinite(toNumber(item.abv))).length,
    'IBU inválido': DATA.filter(item => !Number.isFinite(toNumber(item.ibu))).length,
    'EBC inválido': DATA.filter(item => !Number.isFinite(toNumber(item.ebc))).length
  };
  const issues = Object.entries(checks).filter(([, count]) => count);
  result.innerHTML = `<strong>${DATA.length} registro(s) analisado(s).</strong> ${issues.length ? issues.map(([label, count]) => `${escapeHtml(label)}: ${count}`).join(' · ') : 'Nenhum problema encontrado nos campos principais.'}`;
}
function numericValues(key) { return DATA.map(item => toNumber(item[key])).filter(Number.isFinite); }
function average(key) { const values = numericValues(key); return values.length ? values.reduce((a,b) => a+b, 0) / values.length : NaN; }
function chartPalette(count) { const colors=['#e67e22','#2a9d8f','#0f2b48','#f4a261','#e76f51','#457b9d','#8ab17d','#b56576','#6d597a','#f6bd60']; return Array.from({length:count}, (_,i)=>colors[i%colors.length]); }
function renderDashboard() {
  const values = numericValues('abv'), ibus = numericValues('ibu');
  const setText = (id, value) => { const el = $('#'+id); if (el) el.textContent = value; };
  setText('mAvgAbv', Number.isFinite(average('abv')) ? `${average('abv').toFixed(1).replace('.', ',')}%` : '—');
  setText('mAvgIbu', Number.isFinite(average('ibu')) ? Math.round(average('ibu')) : '—');
  setText('mMaxAbv', values.length ? `${Math.max(...values).toFixed(1).replace('.', ',')}%` : '—');
  setText('mMaxIbu', ibus.length ? Math.round(Math.max(...ibus)) : '—');
  setText('mDesc', DATA.length ? `${Math.round(DATA.filter(item => item.descricao).length / DATA.length * 100)}%` : '—');
  setText('mTasted', `${Object.keys(userTasted).filter(key => userTasted[key]).length}`);
  if (typeof Chart === 'undefined') return;
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#5c7080';
  const makeChart = (id, config) => { if (charts[id]) charts[id].destroy(); const el=$('#'+id); if (el) charts[id]=new Chart(el.getContext('2d'), config); };
  const countBy = key => Object.entries(DATA.reduce((acc,item)=>{ const value=item[key]||'Não informado'; acc[value]=(acc[value]||0)+1; return acc; },{})).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const fam=countBy('familia'), conf=countBy('confrariaNome');
  makeChart('familyChart',{type:'bar',data:{labels:fam.map(x=>x[0]),datasets:[{data:fam.map(x=>x[1]),backgroundColor:chartPalette(fam.length),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:textColor}},y:{beginAtZero:true,ticks:{color:textColor,precision:0}}}}});
  makeChart('confrariaChart',{type:'doughnut',data:{labels:conf.map(x=>x[0]),datasets:[{data:conf.map(x=>x[1]),backgroundColor:chartPalette(conf.length),borderWidth:2,borderColor:getComputedStyle(document.documentElement).getPropertyValue('--card')}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:textColor,font:{size:10}}}}}});
  const points=DATA.map((item,index)=>({x:toNumber(item.abv),y:toNumber(item.ibu),label:item.cerveja,index})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
  makeChart('scatterChart',{type:'scatter',data:{datasets:[{label:'Cervejas',data:points,backgroundColor:'#e67e22',pointRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>{const p=ctx.raw;return `${p.label}: ABV ${p.x}% • IBU ${p.y}`;}}}},scales:{x:{title:{display:true,text:'ABV (%)',color:textColor},ticks:{color:textColor}},y:{title:{display:true,text:'IBU',color:textColor},ticks:{color:textColor}}}}});
  const bins=[0,2,4,6,8,10,12,14,16], counts=bins.slice(0,-1).map((start,i)=>values.filter(value=>value>=start&&value<(bins[i+1])).length);
  makeChart('abvChart',{type:'bar',data:{labels:bins.slice(0,-1).map((start,i)=>`${start}–${bins[i+1]}%`),datasets:[{data:counts,backgroundColor:'#2a9d8f',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:textColor}},y:{beginAtZero:true,ticks:{color:textColor,precision:0}}}}});
  const maxes={abv:12,ibu:100,ebc:60,volume:50}; const profile=['ABV','IBU','EBC','Volume']; const profileValues=['abv','ibu','ebc','volume'].map(key=>{const value=average(key); return Number.isFinite(value)?Math.min(10,value/maxes[key]*10):0;});
  makeChart('profileChart',{type:'radar',data:{labels:profile,datasets:[{label:'Média normalizada',data:profileValues,backgroundColor:'rgba(230,126,34,.22)',borderColor:'#e67e22',pointBackgroundColor:'#e67e22'}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{beginAtZero:true,max:10,ticks:{display:false},pointLabels:{color:textColor,font:{size:10}}}},plugins:{legend:{display:false}}}});
}
function getRecommendationScore(item, profile) {
  const abv=toNumber(item.abv), ibu=toNumber(item.ibu), text=normalizeText([item.estilo,item.familia,item.descricao,item.sabor,item.aroma,item.ingredientes].join(' '));
  if (profile==='leve') return (Number.isFinite(abv)&&abv<=5?4:0)+(Number.isFinite(ibu)&&ibu<=25?3:0)+(text.includes('lager')||text.includes('refresh')?2:0);
  if (profile==='amarga') return (Number.isFinite(ibu)?Math.min(6,ibu/10):0)+(text.includes('ipa')||text.includes('lupul')?3:0);
  if (profile==='forte') return (Number.isFinite(abv)?Math.min(8,abv):0)+(text.includes('strong')||text.includes('imperial')?3:0);
  if (profile==='escura') return (text.includes('escura')||text.includes('stout')||text.includes('porter')||text.includes('brown')?6:0)+(Number.isFinite(toNumber(item.ebc))?Math.min(4,toNumber(item.ebc)/15):0);
  return (text.includes('frut')||text.includes('arom')||text.includes('sour')||text.includes('spice')?6:0)+(item.descricao?1:0);
}
function renderRecommendations(profile) {
  const target=$('#recommendationResults'); if (!target) return;
  if (!profile) { target.innerHTML='<span class="filter-help">Selecione um perfil para receber sugestões.</span>'; return; }
  const recommendations=DATA.map((item,index)=>({item,index,score:getRecommendationScore(item,profile)})).sort((a,b)=>b.score-a.score).slice(0,3);
  target.innerHTML=recommendations.length ? recommendations.map(({item,index})=>`<button class="recommendation-card" type="button" onclick="openModal(${index})"><strong>${escapeHtml(item.cerveja)}</strong><small>${escapeHtml(item.estilo)} • ${escapeHtml(item.confrariaNome)}</small><br><small>${formatMeasure(item.abv,'% ABV')} • ${formatMeasure(item.ibu,'IBU')}</small></button>`).join('') : '<span class="filter-help">Ainda não há dados suficientes para recomendar cervejas.</span>';
}
function toggleCompare(index) {
  const position=compareSet.indexOf(index);
  if (position>=0) compareSet.splice(position,1); else if (compareSet.length<3) compareSet.push(index); else { showToast('Compare no máximo três cervejas'); return; }
  localStorage.setItem('fdcrj_compare',JSON.stringify(compareSet)); renderCompare(); renderGrid();
}
function renderCompare() {
  const panel=$('#comparePanel'), table=$('#compareTable'); if (!panel||!table) return;
  panel.hidden=compareSet.length===0;
  if (!compareSet.length) { table.innerHTML=''; return; }
  const items=compareSet.map(index=>DATA[index]).filter(Boolean);
  const rows=[['Cerveja','cerveja'],['Estilo','estilo'],['Confraria','confrariaNome'],['ABV','abv'],['IBU','ibu'],['EBC','ebc'],['Volume','volume'],['Cervejeiro','responsavel'],['Escola de cerveja','escola'],['Descrição','descricao']];
  table.innerHTML=`<table class="compare-table"><thead><tr><th>Critério</th>${items.map((item,index)=>`<th><span class="compare-name">${escapeHtml(item.cerveja)}</span><br><button class="compare-card-button" onclick="toggleCompare(${compareSet[index]})">Remover</button></th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(([label,key])=>`<tr><th>${label}</th>${items.map(item=>`<td>${escapeHtml(item[key]||'Não informado')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatTastingDate(value) {
  if (!value) return 'Data não informada';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}
function getTastingHistory(index) {
  const tasting = userTasting[index] || {};
  return Array.isArray(tasting.history) ? tasting.history : [];
}
function renderTastingHistory(index) {
  const target = $('#tastingHistory');
  if (!target) return;
  const history = getTastingHistory(index);
  target.innerHTML = history.length
    ? `<strong>Histórico de degustações (${history.length})</strong>${history.slice().reverse().map((entry, position) => `<div class="tasting-history-row"><span>Degustação ${history.length - position}</span><time>${escapeHtml(formatTastingDate(entry.date))}</time></div>`).join('')}<button class="pill tasting-again" type="button" onclick="prepareNewTasting()">Registrar outra degustação</button>`
    : '<span class="filter-help">Nenhuma degustação registrada ainda.</span>';
}
function prepareNewTasting() {
  if (activeModalBeer === null) return;
  $('#tastedCheckbox').checked = false;
  $('#tasteDate').value = todayISO();
  saveTastingField('date', $('#tasteDate').value);
  $('#tastedCheckbox').focus();
}
function markTasted(index, date) {
  const tasting = userTasting[index] || {};
  const history = getTastingHistory(index);
  history.push({ date: date || todayISO(), recordedAt: new Date().toISOString() });
  userTasting[index] = { ...tasting, history, date: date || tasting.date || todayISO() };
  userTasted[index] = true;
  localStorage.setItem('fdcrj_tasting', JSON.stringify(userTasting));
  localStorage.setItem('fdcrj_tasted', JSON.stringify(userTasted));
  renderTastingHistory(index);
  renderDashboard();
  renderGrid();
  showToast('Degustação registrada no histórico');
}
function getLocationMarkup(item) { const query=[item.endereco,item.bairro,item.cidade].filter(Boolean).join(', '); if (!query && !(item.latitude&&item.longitude)) return ''; const url=item.latitude&&item.longitude?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude+','+item.longitude)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; return `<div><strong>Localização:</strong> ${escapeHtml(query||`${item.latitude}, ${item.longitude}`)} <a href="${url}" target="_blank" rel="noopener">Abrir no mapa</a></div>`; }
function updateStats() {
  $('#sBeers').textContent = DATA.length;
  $('#sConf').textContent = new Set(DATA.map(d => d.confrariaNome)).size;
  $('#sStyles').textContent = new Set(DATA.map(d => d.estilo)).size;
  $('#sFav').textContent = userFavs.length;
}

function toggleFav(e, idx) {
  e.stopPropagation();
  const p = userFavs.indexOf(idx);
  if (p >= 0) userFavs.splice(p, 1);
  else userFavs.push(idx);

  localStorage.setItem('fdcrj_favs', JSON.stringify(userFavs));
  updateStats();
  renderGrid();
  showToast(p >= 0 ? 'Removido dos favoritos' : 'Adicionado aos favoritos ⭐');
}

function openModal(idx) {
  activeModalBeer = idx;
  const item = DATA[idx];
  const color = FAM_COLORS[item.familia] || 'var(--brand)';

  $('#ms').style.background = color;
  $('#mt').textContent = item.categoria;
  $('#mt').style.setProperty('--c', color);
  $('#mn').textContent = item.cerveja;
  $('#mfam').textContent = `${item.estilo} • ${item.familia}`;
  const referenceRequest = ++bjcpReferenceRequest;
  const referenceTarget = $('#bjcpReference');
  referenceTarget.innerHTML = '<p class="filter-help">Carregando referência BJCP 2021…</p>';
  window.FDCRJ_BJCP_REFERENCE?.panelMarkup(item.estilo).then(markup => {
    if (referenceRequest === bjcpReferenceRequest) referenceTarget.innerHTML = markup;
  });
  $('#detailHero').innerHTML = item.foto ? `<img class="detail-photo" src="${escapeAttr(item.foto)}" alt="Imagem de ${escapeAttr(item.cerveja)}" onerror="this.remove()">` : `<div class="tag" style="--c:${color}">${escapeHtml(item.familia)}</div>`;

  $('#details').innerHTML = `
    <div class="detail"><b>Confraria</b>${escapeHtml(item.confrariaNome)}</div>
    <div class="detail"><b>Responsável</b>${escapeHtml(item.responsavel)}</div>
    <div class="detail"><b>Escola de cerveja</b>${escapeHtml(item.escola || 'Não informado')}</div>
    <div class="detail"><b>Volume</b>${escapeHtml(item.volume || 'Não informado')}</div>
    <div class="detail"><b>ABV</b>${escapeHtml(item.abv || 'Não informado')}</div>
    <div class="detail"><b>IBU</b>${escapeHtml(item.ibu || 'Não informado')}</div>
    <div class="detail"><b>EBC</b>${escapeHtml(item.ebc || 'Não informado')}</div>
  `;

  $('#mdesc').innerHTML = item.descricao ? escapeHtml(item.descricao) : '<em>Sem descrição adicional cadastrada para esta cerveja.</em>';
  const extras = [item.ingredientes ? `<div><strong>Ingredientes:</strong> ${escapeHtml(item.ingredientes)}</div>` : '', item.aroma ? `<div><strong>Aroma:</strong> ${escapeHtml(item.aroma)}</div>` : '', item.sabor ? `<div><strong>Sabor:</strong> ${escapeHtml(item.sabor)}</div>` : '', item.harmonizacao ? `<div><strong>Harmonização:</strong> ${escapeHtml(item.harmonizacao)}</div>` : '', item.temperatura ? `<div><strong>Temperatura ideal:</strong> ${escapeHtml(item.temperatura)}</div>` : '', item.copo ? `<div><strong>Copo recomendado:</strong> ${escapeHtml(item.copo)}</div>` : '', getLocationMarkup(item)].filter(Boolean).join('');
  const statusTimeline = [['aguardando', 'Aguardando'], ['engatado', 'Engatado'], ['acabou', 'Acabou']].filter(([key]) => item.statusDates?.[key]).map(([key, label]) => `<div class="status-history-row"><span>${label}</span><time>${escapeHtml(item.statusDates[key])}</time></div>`).join('');
  const fdcrjBadge = item.noFdcrj ? `<div class="fdcrj-checkin"><strong>✓ Cerveja no FDCRJ</strong><span>Check-in em ${escapeHtml(item.checkInDate)}</span></div>` : '';
  const statusHistory = statusTimeline ? `<div class="status-history"><strong>Histórico de status</strong>${statusTimeline}</div>` : '';
  $('#detailExtras').innerHTML = `${fdcrjBadge}<div class="tap-status ${normalizeText(item.statusEngate || 'não informado').replace(/[^a-z]+/g, '-')}">${item.naTorneira ? '🍺 ' : ''}Status do engate: ${escapeHtml(item.statusEngate || 'Não informado')}</div>${statusHistory}${extras || '<span class="filter-help">Ainda não há características adicionais cadastradas para esta cerveja.</span>'}`;
  $('#notes').value = userNotes[idx] || '';
  const tasting = userTasting[idx] || {};
  $('#tasteDate').value=tasting.date||''; $('#appearance').value=tasting.appearance||''; $('#aroma').value=tasting.aroma||''; $('#flavor').value=tasting.flavor||''; $('#bitterness').value=tasting.bitterness||''; $('#body').value=tasting.body||''; $('#pairing').value=tasting.pairing||'';
  $('#tastedCheckbox').checked = Boolean(userTasted[idx] || getTastingHistory(idx).length);
  renderTastingHistory(idx);
  const qrUrl = beerShareUrl(item);
  $('#qrLink').textContent = 'Abrir ficha completa';
  $('#qrLink').href = qrUrl;
  $('#qrCanvas').getContext('2d').clearRect(0, 0, 110, 110);
  if (window.QRCode) {
    QRCode.toCanvas($('#qrCanvas'), qrUrl, { width:110, margin:1, color:{ dark:'#0f2b48', light:'#ffffff' } }, error => { if (error) console.error('Falha ao gerar QR Code:', error); });
  }

  renderModalStars(userRatings[idx] || 0);
  renderPublicRating(beerShareKey(item));

  const isFav = userFavs.includes(idx);
  const mfav = $('#mfav');
  mfav.setAttribute('aria-pressed', isFav);
  mfav.textContent = isFav ? '⭐ Favoritado' : '⭐ Favoritar';

  $('#modal').classList.add('open');
}

function renderModalStars(rating) {
  const container = $('#rate');
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<button type="button" class="star ${i <= rating ? 'on' : ''}" onclick="setRating(${i})">⭐</button>`;
  }
  container.innerHTML = html;
}

function renderPublicRating(slug) {
  const target = $('#publicRating');
  if (!target) return;
  const summary = sharedRatings[slug];
  target.textContent = summary?.count ? `Avaliação pública: ★ ${summary.average.toFixed(1).replace('.', ',')} de 5 (${summary.count} ${summary.count === 1 ? 'voto' : 'votos'})` : 'Ainda não há avaliações públicas. Entre com Google para votar.';
}

async function setRating(r) {
  if (activeModalBeer === null) return;
  const item = DATA[activeModalBeer];
  if (!window.FDCRJ_AUTH?.getUser?.()) {
    showToast('Entre com Google para registrar sua avaliação');
    await window.FDCRJ_AUTH?.loginWithGoogle?.();
    if (!window.FDCRJ_AUTH?.getUser?.()) return;
  }
  userRatings[activeModalBeer] = r;
  localStorage.setItem('fdcrj_ratings', JSON.stringify(userRatings));
  renderModalStars(r);
  try {
    sharedRatings[beerShareKey(item)] = await window.FDCRJ_AUTH.saveSharedRating(beerShareKey(item), r);
    renderPublicRating(beerShareKey(item));
    renderGrid();
    showToast('Avaliação pública registrada');
  } catch (error) {
    showToast('Não foi possível registrar a avaliação');
  }
}

function saveTastingField(field, value) {
  if (activeModalBeer === null) return;
  userTasting[activeModalBeer] = { ...(userTasting[activeModalBeer] || {}), [field]: value };
  localStorage.setItem('fdcrj_tasting', JSON.stringify(userTasting));
}
['tasteDate', 'appearance', 'aroma', 'flavor', 'bitterness', 'body', 'pairing'].forEach(id => {
  document.getElementById(id).addEventListener('input', event => saveTastingField(id === 'tasteDate' ? 'date' : id, event.target.value));
});
$('#tastedCheckbox').addEventListener('change', event => {
  if (activeModalBeer === null || !event.target.checked) return;
  const date = $('#tasteDate').value || todayISO();
  $('#tasteDate').value = date;
  saveTastingField('date', date);
  markTasted(activeModalBeer, date);
});
$('#notes').addEventListener('input', (e) => {
  if (activeModalBeer === null) return;
  userNotes[activeModalBeer] = e.target.value;
  localStorage.setItem('fdcrj_notes', JSON.stringify(userNotes));
});

$('#mfav').addEventListener('click', () => {
  if (activeModalBeer === null) return;
  toggleFav(new Event('click'), activeModalBeer);
  const isFav = userFavs.includes(activeModalBeer);
  $('#mfav').setAttribute('aria-pressed', isFav);
  $('#mfav').textContent = isFav ? '⭐ Favoritado' : '⭐ Favoritar';
});

$('#modalShare').addEventListener('click', async () => {
  if (activeModalBeer === null) return;
  const item = DATA[activeModalBeer];
  const url = beerShareUrl(item);
  const data = { title: item.cerveja, text: `${item.cerveja} — ${item.estilo} • ${item.confrariaNome}`, url };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); showToast('Link da cerveja copiado'); } } catch (error) {}
});
$('#copyQrLink').addEventListener('click', async () => { if (activeModalBeer === null) return; try { await navigator.clipboard.writeText(beerShareUrl(DATA[activeModalBeer])); showToast('Link do QR Code copiado'); } catch (error) { showToast('Não foi possível copiar o link'); } });
$('#downloadQr').addEventListener('click', () => { const canvas=$('#qrCanvas'); $('#downloadQr').href=canvas.toDataURL('image/png'); });
$('#modalCompare').addEventListener('click', () => { if (activeModalBeer !== null) { toggleCompare(activeModalBeer); showToast(compareSet.includes(activeModalBeer) ? 'Adicionado à comparação' : 'Removido da comparação'); } });
$('#clearCompare').addEventListener('click', () => { compareSet=[]; localStorage.setItem('fdcrj_compare','[]'); renderCompare(); renderGrid(); });
function closeModal() {
  $('#modal').classList.remove('open');
  activeModalBeer = null;
  bjcpReferenceRequest++;
}

$('#x').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

function clearAllFilters() {
  $('#q').value = '';
  $('#cf').value = '';
  $('#ct').value = '';
  $('#fm').value = '';
  $('#st').value = '';
  $('#brewer').value = '';
  $('#school').value = '';
  $('#abvMin').value = '';
  $('#abvMax').value = '';
  $('#ibuMin').value = '';
  $('#volumeFilter').value = '';
  $('#or').value = 'cerveja';
  $$('.quick .pill[aria-pressed]').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  renderGrid();
}
function bindEvents() {
  ['#q', '#cf', '#ct', '#fm', '#st', '#or', '#brewer', '#school', '#abvMin', '#abvMax', '#ibuMin', '#volumeFilter'].forEach(sel => {
    $(sel).addEventListener('input', renderGrid);
  });

  ['onlyFav', 'onlyDesc', 'onlyRio', 'onlyIpa', 'onlyComplete', 'onlyUntasted', 'onlyTap'].forEach(id => {
    $(`#${id}`).addEventListener('click', function() {
      const pressed = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !pressed);
      renderGrid();
    });
  });

  $('#clear').addEventListener('click', () => { clearAllFilters(); showToast('Filtros limpos'); });
  $('#reloadData').addEventListener('click', async () => { $('#reloadData').disabled = true; $('#reloadData').textContent = '↻ Carregando...'; await loadSheetData(); BEERS = DATA.map((b, i) => ({ ...b, id: i })); buildFilters(); renderStatusBoard(); renderGrid(); renderLegend(); updateStats(); renderInsights(); renderDashboard(); renderRecommendations(); renderCompare(); $('#reloadData').disabled = false; $('#reloadData').textContent = '↻ Atualizar dados'; showToast('Dados atualizados'); });
  document.querySelectorAll('[data-status-tab]').forEach(tab => tab.addEventListener('click', () => { const target = tab.dataset.statusTab; document.querySelectorAll('[data-status-tab]').forEach(item => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', active); }); document.querySelectorAll('.status-panel').forEach(panel => { const active = panel.id === `statusPanel${target}`; panel.classList.toggle('active', active); panel.hidden = !active; }); }));
  $('#presentationToggle').addEventListener('click', event => { const active = document.body.classList.toggle('presentation-mode'); event.currentTarget.setAttribute('aria-pressed', active); event.currentTarget.textContent = active ? '▣ Sair da apresentação' : '▣ Apresentação'; });
  $('#validateData').addEventListener('click', validateData);
  document.querySelectorAll('[data-recommend]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-recommend]').forEach(item => item.classList.remove('active')); button.classList.add('active'); renderRecommendations(button.dataset.recommend); }));
  $('#eventModeToggle').addEventListener('click', event => { const active=document.body.classList.toggle('event-mode'); localStorage.setItem('fdcrj_event_mode',active?'1':'0'); event.currentTarget.setAttribute('aria-pressed',active); event.currentTarget.textContent=active?'🎪 Sair do evento':'🎪 Modo evento'; });
  $('#accessibilityToggle').addEventListener('click', event => { const order=['normal','large','xlarge','contrast']; const current=localStorage.getItem('fdcrj_accessibility')||'normal'; const next=order[(order.indexOf(current)+1)%order.length]; document.body.classList.remove('font-large','font-xlarge','high-contrast'); if(next==='large') document.body.classList.add('font-large'); if(next==='xlarge') document.body.classList.add('font-xlarge'); if(next==='contrast') document.body.classList.add('high-contrast'); localStorage.setItem('fdcrj_accessibility',next); event.currentTarget.textContent=next==='normal'?'◐ Acessibilidade':next==='contrast'?'◐ Alto contraste':`◐ Fonte ${next==='large'?'grande':'maior'}`; });
  $('#print').addEventListener('click', () => window.print());

  $('#share').addEventListener('click', () => {
    const params = new URLSearchParams();
    if ($('#q').value) params.set('q', $('#q').value);
    if ($('#cf').value) params.set('cf', $('#cf').value);
    if ($('#ct').value) params.set('ct', $('#ct').value);
    if ($('#fm').value) params.set('fm', $('#fm').value);
    if ($('#st').value) params.set('st', $('#st').value);
    if ($('#brewer').value) params.set('brewer', $('#brewer').value);
    if ($('#school').value) params.set('school', $('#school').value);
    ['abvMin','abvMax','ibuMin','volumeFilter'].forEach(id => { if ($('#'+id).value) params.set(id, $('#'+id).value); });
    if ($('#onlyComplete').getAttribute('aria-pressed') === 'true') params.set('complete','1');
    if ($('#onlyUntasted').getAttribute('aria-pressed') === 'true') params.set('untasted','1');
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Link de filtros copiado!');
    });
  });
}

function parseURLParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('q')) $('#q').value = p.get('q');
  if (p.get('cf')) $('#cf').value = p.get('cf');
  if (p.get('ct')) $('#ct').value = p.get('ct');
  if (p.get('fm')) $('#fm').value = p.get('fm');
  if (p.get('st')) $('#st').value = p.get('st');
  if (p.get('brewer')) $('#brewer').value = p.get('brewer');
  if (p.get('school')) $('#school').value = p.get('school');
  ['abvMin', 'abvMax', 'ibuMin', 'volumeFilter'].forEach(id => { if (p.get(id)) $(`#${id}`).value = p.get(id); });
  if (p.get('complete') === '1') $('#onlyComplete').setAttribute('aria-pressed', 'true');
  if (p.get('untasted') === '1') $('#onlyUntasted').setAttribute('aria-pressed', 'true');
  renderGrid();
  if (p.has('beer')) {
    const requested = p.get('beer') || p.get('slug');
    const beerIndex = DATA.findIndex(item => beerShareKey(item) === requested);
    const legacyIndex = Number(requested);
    if (beerIndex >= 0) openModal(beerIndex);
    else if (Number.isInteger(legacyIndex) && DATA[legacyIndex]) openModal(legacyIndex);
  }
}

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
function formatMeasure(value, unit) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (unit === '% ABV') return `${clean.replace(/%(?:\s*ABV?)?$/i, '').trim()}% ABV`;
  if (new RegExp(`\\s${unit}$`, 'i').test(clean)) return clean;
  return `${clean} ${unit}`;
}
window.addEventListener('fdcrj-auth-ready', loadSharedRatings);
document.addEventListener('DOMContentLoaded', async () => { await loadSheetData(); BEERS = DATA.map((b, i) => ({ ...b, id: i })); init(); loadSharedRatings(); });
