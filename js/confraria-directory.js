(() => {
  const COLORS = ['#007f86','#c45b2d','#395c9b','#7a5b9e','#3d7c48','#bb7a17','#b44769','#536c73','#1681a1','#8b5e34','#5145a5','#668b2e','#ae4a29','#39759b','#815477','#4d7868'];
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  let profiles = [];

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function safeUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return ['https:','http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }
  function link(url, label) {
    const safe = safeUrl(url);
    return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : '';
  }
  async function load() {
    try {
      const response = await fetch('data/confraria-profiles.json', {cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      profiles = Array.isArray(payload.confrarias) ? payload.confrarias : [];
    } catch (error) {
      profiles = [];
      console.warn('Os perfis das confrarias não puderam ser carregados:', error);
    }
  }
  function beerNamesFor(profile, beerRows) {
    const aliases = [profile.id,profile.official_name,...(Array.isArray(profile.aliases)?profile.aliases:[])];
    for (const aliasRecord of (Array.isArray(profile.historical_aliases)?profile.historical_aliases:[])) {
      if (aliasRecord && aliasRecord.same_community && aliasRecord.code) aliases.push(aliasRecord.code);
    }
    const normalizedAliases = aliases.map(normalize).filter(Boolean);
    return [...new Set(beerRows.map(item => item.confrariaNome).filter(Boolean))].filter(name => {
      const label = normalize(name);
      return normalizedAliases.some(alias => label === alias || label.startsWith(`${alias} `) || alias.startsWith(`${label} `));
    });
  }
  function getCounts(awards) {
    const counts = {ouro:0,prata:0,bronze:0};
    awards.forEach(award => { const medal = normalize(award.medal); if (Object.prototype.hasOwnProperty.call(counts,medal)) counts[medal] += 1; });
    return counts;
  }
  function getProfileCounts(profile) {
    const totals = profile && profile.medal_totals;
    if (totals && ['ouro','prata','bronze'].every(key => Number.isFinite(Number(totals[key])))) {
      return {ouro:Number(totals.ouro),prata:Number(totals.prata),bronze:Number(totals.bronze)};
    }
    return getCounts(Array.isArray(profile?.awards) ? profile.awards : []);
  }
  function medalMarkup(counts) {
    return `<span class="confraria-medal confraria-medal--ouro"><b>${counts.ouro}</b> ouro</span><span class="confraria-medal confraria-medal--prata"><b>${counts.prata}</b> prata</span><span class="confraria-medal confraria-medal--bronze"><b>${counts.bronze}</b> bronze</span>`;
  }
  function periodLabel(award) {
    let month = String(award.month || '').trim();
    const monthNumber = Number(month);
    if (Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12) month = MONTHS[monthNumber - 1];
    let year = String(award.year || '').trim();
    const date = String(award.date || '').trim();
    const formatIso = value => {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? `${Number(match[3])} de ${MONTHS[Number(match[2]) - 1]} de ${match[1]}` : '';
    };
    const range = date.match(/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/);
    if (range) return `${formatIso(range[1])}–${formatIso(range[2])}`;
    const isoDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
      if (!year) year = isoDate[1];
      if (!month) month = MONTHS[Number(isoDate[2]) - 1] || '';
      return formatIso(date);
    }
    const numericDay = date.match(/^(\d{1,2})$/);
    if (numericDay) return month && year ? `${Number(numericDay[1])} de ${month} de ${year}` : [Number(numericDay[1]),month,year].filter(Boolean).join(' de ') || 'data não localizada';
    const localDate = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (localDate) return `${Number(localDate[1])} de ${MONTHS[Number(localDate[2]) - 1] || localDate[2]} de ${localDate[3]}`;
    if (date) return [date,month,year].filter(Boolean).join(' · ');
    if (month && year) return `${month} de ${year}`;
    if (year) return year;
    if (month) return `${month} — ano não localizado`;
    return 'data não localizada';
  }
  function awardGroups(awards) {
    const groups = new Map();
    awards.forEach(award => {
      const key = [award.event,award.edition,award.year,award.month,award.date].map(value => String(value || '').trim()).join('|');
      if (!groups.has(key)) groups.set(key,{event:award.event,edition:award.edition,year:award.year,month:award.month,date:award.date,awards:[]});
      groups.get(key).awards.push(award);
    });
    return [...groups.values()].sort((a,b) => {
      const byYear = (Number(b.year) || 0) - (Number(a.year) || 0);
      if (byYear) return byYear;
      return String(b.edition || '').localeCompare(String(a.edition || ''),'pt-BR',{numeric:true});
    });
  }
  function renderAwards(awards, color, profile) {
    if (!awards.length) return '<p class="filter-help">Nenhuma premiação verificável foi localizada para este perfil. Isso não comprova ausência de prêmios.</p>';
    const profileNames = [profile.id,profile.official_name,...(Array.isArray(profile.aliases)?profile.aliases:[]),...(Array.isArray(profile.historical_aliases)?profile.historical_aliases.filter(alias=>alias && alias.same_community).map(alias=>alias.code):[])].map(normalize).filter(Boolean);
    return awardGroups(awards).map(group => {
      const heading = [group.event,group.edition,periodLabel(group)].filter(Boolean).join(' · ');
      const entries = group.awards.map(award => {
        const medal = normalize(award.medal);
        const medalLabel = ['ouro','prata','bronze'].includes(medal) ? medal : (medal === 'nao informado' ? 'medalha não especificada' : 'reconhecimento');
        const recipient = String(award.recipient || '').trim();
        const recipientLabel = recipient && !profileNames.includes(normalize(recipient)) ? `Destinatário: ${recipient}` : '';
        const details = [award.category,award.placement,medalLabel,recipientLabel].filter(Boolean).join(' · ');
        const source = link(award.source_url,award.source_title || 'Fonte do resultado');
        const supportingSources = (Array.isArray(award.supporting_sources) ? award.supporting_sources : []).map(item => link(item.url,item.title || 'Fonte complementar')).filter(Boolean);
        const sourceLinks = [source,...supportingSources].filter(Boolean).join(' · ');
        return `<li>${escapeHtml(details)}${award.attribution_note ? `<br><span class="filter-help">${escapeHtml(award.attribution_note)}</span>` : ''}${sourceLinks ? `<br>${sourceLinks}` : ''}</li>`;
      }).join('');
      const groupNote = group.awards.map(award => award.group_note).find(Boolean);
      return `<section class="confraria-award-group" style="--conf-color:${color}"><h4>${escapeHtml(heading)}</h4>${groupNote ? `<p class="confraria-award-note">${escapeHtml(groupNote)}</p>` : ''}<ul>${entries}</ul></section>`;
    }).join('');
  }
  function renderProfileSources(sources) {
    if (!sources.length) return '';
    return `<details class="confraria-sources"><summary>Fontes do perfil (${sources.length})</summary><ul>${sources.map(source => `<li>${escapeHtml(source.field || 'Informação')} — ${link(source.url,source.title || 'abrir fonte')}${source.evidence ? `<br>${escapeHtml(source.evidence)}` : ''}</li>`).join('')}</ul></details>`;
  }
  function renderCoverageNote(note) {
    return note ? `<details class="confraria-sources confraria-coverage"><summary>Critérios e cobertura do levantamento</summary><p>${escapeHtml(note)}</p></details>` : '';
  }
  function render(beerRows = []) {
    const grid = document.querySelector('#confrariaDirectoryGrid');
    const summary = document.querySelector('#confrariaSummary');
    if (!grid || !summary) return;
    let items = profiles;
    if (!items.length) {
      items = [...new Set(beerRows.map(item => item.confrariaNome).filter(name => name && name !== 'Não informado'))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map((name,index)=>({id:name,official_name:name,profile_summary:'',region:'',meetup_info:'',founded:'',instagram_url:'',website_url:'',other_links:[],awards:[],profile_sources:[],historical_aliases:[],color:COLORS[index%COLORS.length]}));
    }
    if (!items.length) {
      summary.textContent = 'Aguardando dados';
      grid.innerHTML = '<p class="filter-help">Nenhuma confraria foi localizada nos registros carregados.</p>';
      return;
    }
    const medalTotals = items.reduce((total,profile) => {
      const counts = getProfileCounts(profile);
      total.ouro += counts.ouro; total.prata += counts.prata; total.bronze += counts.bronze;
      return total;
    },{ouro:0,prata:0,bronze:0});
    const totalMedals = medalTotals.ouro + medalTotals.prata + medalTotals.bronze;
    summary.innerHTML = `<span>${items.length} confrarias</span><span>${totalMedals} medalhas documentadas</span>`;
      grid.innerHTML = items.map((profile,index) => {
      const awards = Array.isArray(profile.awards) ? profile.awards : [];
      const sources = Array.isArray(profile.profile_sources) ? profile.profile_sources : [];
      const otherLinks = Array.isArray(profile.other_links) ? profile.other_links : [];
      const color = /^#[0-9a-f]{6}$/i.test(profile.color || '') ? profile.color : COLORS[index%COLORS.length];
      const counts = getProfileCounts(profile);
      const matchedBeerNames = new Set(beerNamesFor(profile,beerRows));
      const beers = beerRows.filter(item => matchedBeerNames.has(item.confrariaNome)).length;
      const linkMarkup = [link(profile.instagram_url,'Instagram'),link(profile.website_url,'Site / página oficial'),...otherLinks.map((url,i)=>link(url,`Mais informações ${i+1}`))].filter(Boolean).join('');
      const fact = (label,value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || 'Não localizado nas fontes consultadas')}</dd></div>`;
      const awardCount = awards.length;
      const medalCount = counts.ouro+counts.prata+counts.bronze;
      return `<details class="confraria-entry" style="--conf-color:${color}"><summary><div><h3 class="confraria-entry__name">${escapeHtml(profile.official_name || profile.id)}</h3><span class="confraria-entry__region">${escapeHtml(profile.region || 'Região não localizada')} · ${beers} cerveja(s) no catálogo</span></div><span class="confraria-medals">${medalMarkup(counts)}</span></summary><div class="confraria-entry__body"><p>${escapeHtml(profile.profile_summary || 'Não foi localizada uma apresentação pública verificável.')}</p><dl class="confraria-facts">${fact('Região de atuação',profile.region)}${fact('Encontros',profile.meetup_info)}${fact('Fundação',profile.founded)}${fact('Premiações documentadas',`${medalCount} medalhas em ${awardCount} registros`)}</dl>${linkMarkup ? `<nav class="confraria-links" aria-label="Links de ${escapeHtml(profile.official_name || profile.id)}">${linkMarkup}</nav>` : '<p class="filter-help">Nenhum perfil oficial de rede social ou site foi localizado.</p>'}<details class="confraria-awards"><summary>Ver prêmios por evento e edição (${awardCount})</summary><div>${renderAwards(awards,color,profile)}</div></details>${renderProfileSources(sources)}${renderCoverageNote(profile.coverage_note)}</div></details>`;
    }).join('');
  }
  window.FDCRJ_CONFRARIA_DIRECTORY = {load,render};
})();
