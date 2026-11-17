(() => {
  const OFFICIAL_TRANSLATION_URL = 'https://www.bjcp.org/international-translations/portuguese-portugues/';
  const OFFICIAL_POLICY_URL = 'https://www.bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/';
  const INDEX_URL = new URL('../data/bjcp-2021-index.json', document.currentScript.src);
  let catalogPromise;

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

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(INDEX_URL)
        .then(response => {
          if (!response.ok) throw new Error(`Falha ao carregar índice BJCP: ${response.status}`);
          return response.json();
        })
        .then(data => Array.isArray(data.styles) ? data.styles : []);
    }
    return catalogPromise;
  }

  async function findStyle(styleLabel) {
    const styles = await loadCatalog();
    const source = String(styleLabel || '');
    const codeMatch = source.match(/(?:^|[^a-z0-9])(\d{1,2}\s*[a-g])(?:$|[^a-z0-9])/i);
    if (codeMatch) {
      const code = codeMatch[1].replace(/\s+/g, '').toUpperCase();
      const byCode = styles.find(item => String(item.code).toUpperCase() === code);
      if (byCode) return byCode;
    }

    const normalized = normalize(source);
    const exact = styles.find(item => normalize(item.name) === normalized);
    if (exact) return exact;

    return styles
      .filter(item => {
        const name = normalize(item.name);
        return name.length > 5 && (` ${normalized} `).includes(` ${name} `);
      })
      .sort((a, b) => normalize(b.name).length - normalize(a.name).length)[0] || null;
  }

  async function panelMarkup(styleLabel) {
    let matched = null;
    let loadFailed = false;
    try {
      matched = await findStyle(styleLabel);
    } catch (error) {
      loadFailed = true;
      console.error(error);
    }

    const detail = matched
      ? `<div class="bjcp-reference__meta">
          <div><span>Categoria BJCP</span><strong>${escapeHtml(matched.categoryCode)} — ${escapeHtml(matched.categoryName)}</strong></div>
          <div><span>Estilo BJCP</span><strong>${escapeHtml(matched.code)} — ${escapeHtml(matched.name)}</strong></div>
        </div>
        <p>Esta é a referência oficial do estilo, não uma medição nem uma descrição da cerveja cadastrada.</p>`
      : `<p>${loadFailed
          ? 'Não foi possível carregar o índice de estilos agora.'
          : `Não encontrei correspondência exata para “${escapeHtml(styleLabel || 'estilo não informado')}” no índice BJCP 2021.`}
        O acesso à tradução oficial continua disponível abaixo.</p>`;

    return `<details class="bjcp-reference">
      <summary>Consultar estilo BJCP 2021</summary>
      <div class="bjcp-reference__body">
        ${detail}
        <p>Para preservar o conteúdo e os direitos do guia, a descrição completa é consultada na versão oficial publicada pelo BJCP.</p>
        <div class="bjcp-reference__links">
          <a class="pill" href="${OFFICIAL_TRANSLATION_URL}" target="_blank" rel="noopener noreferrer">Abrir tradução oficial em português brasileiro</a>
          <a href="${OFFICIAL_POLICY_URL}" target="_blank" rel="noopener noreferrer">Política de uso do BJCP</a>
        </div>
      </div>
    </details>`;
  }

  window.FDCRJ_BJCP_REFERENCE = { findStyle, panelMarkup, officialTranslationUrl: OFFICIAL_TRANSLATION_URL };
})();
