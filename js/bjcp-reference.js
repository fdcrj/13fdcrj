(() => {
  const OFFICIAL_TRANSLATION_URL = 'https://www.bjcp.org/international-translations/portuguese-portugues/';
  const OFFICIAL_POLICY_URL = 'https://www.bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/';
  const SCRIPT_URL = document.currentScript.src;
  const INDEX_URL = new URL('../data/bjcp-2021-index.json', SCRIPT_URL);
  const SUMMARIES_URL = new URL('../data/bjcp-2021-summaries.json', SCRIPT_URL);
  const LOCAL_INDEX_URL = new URL('../data/fdcrj-local-styles.json', SCRIPT_URL);
  const LOCAL_SUMMARIES_URL = new URL('../data/fdcrj-local-summaries.json', SCRIPT_URL);
  let catalogPromise;
  let summariesPromise;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadJson(url) {
    return fetch(url, {cache: 'no-cache'}).then(response => {
      if (!response.ok) throw new Error(`Falha ao carregar ${url.pathname}: ${response.status}`);
      return response.json();
    });
  }

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = loadJson(INDEX_URL)
        .then(data => Array.isArray(data.styles) ? data.styles : [])
        .then(styles => loadJson(LOCAL_INDEX_URL)
          .then(data => styles.concat(Array.isArray(data.styles) ? data.styles : []))
          .catch(error => {
            console.error(error);
            return styles;
          }));
    }
    return catalogPromise;
  }

  function loadSummaries() {
    if (!summariesPromise) {
      summariesPromise = loadJson(SUMMARIES_URL)
        .then(data => Array.isArray(data.summaries) ? data.summaries : [])
        .then(summaries => loadJson(LOCAL_SUMMARIES_URL)
          .then(data => summaries.concat(Array.isArray(data.summaries) ? data.summaries : []))
          .catch(error => {
            console.error(error);
            return summaries;
          }));
    }
    return summariesPromise;
  }

  function namesFor(item) {
    const names = [item.name, ...(Array.isArray(item.aliases) ? item.aliases : [])];
    const colon = String(item.name || '').indexOf(':');
    if (colon >= 0) names.push(String(item.name).slice(colon + 1).trim());
    return names.map(normalize).filter(Boolean);
  }

  async function findStyle(styleLabel) {
    const styles = await loadCatalog();
    const normalized = normalize(styleLabel);
    const exactName = styles.find(item => namesFor(item).includes(normalized));
    if (exactName) return exactName;
    const byName = styles.flatMap(item => namesFor(item).map(name => ({item, name})))
      .filter(candidate => candidate.name.length > 4 && (` ${normalized} `).includes(` ${candidate.name} `))
      .sort((a, b) => b.name.length - a.name.length);
    if (byName.length) return byName[0].item;

    const codeMatch = String(styleLabel || '').match(/(?:^|[^a-z0-9])((?:\d{1,2}\s*[a-g])|(?:x\s*\d+))(?:$|[^a-z0-9])/i);
    if (codeMatch) {
      const code = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      const codeMatches = styles.filter(item => String(item.code).toUpperCase() === code);
      return codeMatches.length === 1 ? codeMatches[0] : null;
    }

    return null;
  }

  function sourceLinks(urls, sourceNote) {
    const links = [...new Set((Array.isArray(urls) ? urls : []).filter(value => {
      try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch (error) { return false; }
    }))];
    const note = sourceNote ? `<p>${escapeHtml(sourceNote)}</p>` : '';
    if (!links.length && !note) return '';
    const labels = links.map(url => {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host === 'bjcp.org' ? 'BJCP' : host;
    });
    const totals = labels.reduce((counts, label) => counts.set(label, (counts.get(label) || 0) + 1), new Map());
    const seen = new Map();
    const list = links.length ? `<ul>${links.map((url, index) => {
      const label = labels[index];
      const ordinal = (seen.get(label) || 0) + 1;
      seen.set(label, ordinal);
      return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}${totals.get(label) > 1 ? ` ${ordinal}` : ''}</a></li>`;
    }).join('')}</ul>` : '';
    return `<details class="bjcp-reference__sources"><summary>Fontes do resumo</summary>${note}${list}</details>`;
  }

  async function panelMarkup(styleLabel) {
    let matched = null;
    let summary = null;
    let loadFailed = false;
    try {
      matched = await findStyle(styleLabel);
      if (matched) {
        const summaries = await loadSummaries();
        summary = summaries.find(item => item.code === matched.code && normalize(item.name) === normalize(matched.name)) || null;
      }
    } catch (error) {
      loadFailed = true;
      console.error(error);
    }

    const fdcrjStyle = matched && matched.origin === 'FDCRJ';
    const appendixStyle = matched && /^x[1-5]$/i.test(String(matched.code));
    const categoryMarkup = fdcrjStyle
      ? `<div><span>Categoria local 13FDCRJ</span><strong>${escapeHtml(matched.code === '99A' ? `Estilo-base — ${matched.name}` : `${matched.categoryCode} — ${matched.categoryName} (variação 99B)`)}</strong></div>`
      : appendixStyle
        ? `<div><span>Classificação no BJCP 2021</span><strong>Apêndice B — Estilos locais</strong></div>`
        : `<div><span>Categoria BJCP</span><strong>${escapeHtml(matched?.categoryCode)} — ${escapeHtml(matched?.categoryName)}</strong></div>`;
    const styleTitle = fdcrjStyle ? 'Estilo local FDCRJ' : 'Estilo BJCP';
    const disclaimer = fdcrjStyle
      ? 'Resumo autoral local do 13FDCRJ, conforme o Anexo II v.1.0. Os Estilos Rio seguem a arquitetura descritiva do BJCP, mas não são categorias oficiais do BJCP.'
      : 'Síntese editorial própria baseada na referência BJCP 2021. Não é texto oficial e não descreve nem substitui a avaliação da cerveja cadastrada.';
    const references = fdcrjStyle
      ? '<p>Esta ficha local não é uma descrição oficial do BJCP. Consulte a fonte indicada em “Fontes do resumo”.</p>'
      : `<p>Para consultar a descrição técnica integral, abra a versão oficial publicada pelo BJCP.</p>
        <div class="bjcp-reference__links">
          <a class="pill" href="${OFFICIAL_TRANSLATION_URL}" target="_blank" rel="noopener noreferrer">Abrir tradução oficial em português brasileiro</a>
          <a href="${OFFICIAL_POLICY_URL}" target="_blank" rel="noopener noreferrer">Política de uso do BJCP</a>
        </div>`;
    const detail = matched
      ? `<div class="bjcp-reference__meta">
          ${categoryMarkup}
          <div><span>${styleTitle}</span><strong>${escapeHtml(matched.code)} — ${escapeHtml(matched.name)}</strong></div>
        </div>
        ${summary ? `<section class="bjcp-reference__summary"><h3>Resumo autoral: o que esperar</h3><p>${escapeHtml(summary.summary)}</p></section>
          ${summary.historicalNote ? `<aside class="bjcp-reference__history"><h3>Curiosidade histórica</h3><p>${escapeHtml(summary.historicalNote)}</p></aside>` : ''}
          ${sourceLinks(summary.sourceUrls, summary.sourceNote)}`
          : '<p class="bjcp-reference__missing">O resumo autoral deste estilo ainda não está disponível.</p>'}
        <p class="bjcp-reference__disclaimer">${disclaimer}</p>`
      : `<p>${loadFailed
          ? 'Não foi possível carregar o índice ou os resumos de estilos agora.'
          : `Não encontrei uma correspondência única para “${escapeHtml(styleLabel || 'estilo não informado')}”. Se o código tiver variantes, confira também o nome do estilo.`}
        O acesso à tradução oficial continua disponível abaixo.</p>`;

    return `<details class="bjcp-reference">
      <summary>${fdcrjStyle ? 'Consultar Estilos Rio' : 'Consultar estilo BJCP 2021'}</summary>
      <div class="bjcp-reference__body">
        ${detail}
        ${references}
      </div>
    </details>`;
  }

  window.FDCRJ_BJCP_REFERENCE = { findStyle, panelMarkup, officialTranslationUrl: OFFICIAL_TRANSLATION_URL };
})();
