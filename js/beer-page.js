(() => {
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function parseCSV(text) {
    const rows=[]; let row=[], cell='', quoted=false;
    for (let i=0;i<text.length;i++) { const char=text[i], next=text[i+1]; if (char==='"' && quoted && next==='"') { cell+='"'; i++; } else if (char==='"') quoted=!quoted; else if (char===',' && !quoted) { row.push(cell); cell=''; } else if ((char==='\n'||char==='\r')&&!quoted) { if (char==='\r'&&next==='\n') i++; row.push(cell); if (row.some(value=>value.trim())) rows.push(row); row=[]; cell=''; } else cell+=char; }
    if (cell||row.length) { row.push(cell); rows.push(row); } return rows;
  }
  function field(row, headers, ...names) { const index=names.map(name=>headers.indexOf(normalize(name))).find(index=>index >= 0); return index === undefined ? '' : String(row[index] || '').trim(); }
  function school(style) { const value=normalize(style); if (/czech|munich|german|kolsch|altbier|marzen|rauchbier|bock|schwarzbier|weiss|weizen|festbier|kellerbier|gose|berliner|roggenbier|sahti|vienna/.test(value)) return 'Alemã'; if (/belg|trappist|saison|lambic|gueuze|flanders|witbier|dubbel|tripel/.test(value)) return 'Belga'; if (/american|california|ipa|hazy|imperial/.test(value)) return 'Americana'; return 'Inglesa'; }
  function key(item) { return window.FDCRJ_BEER_MODEL.shareKey({ cerveja: item.name || item.cerveja, confrariaNome: item.confrariaNome || item.confraria, estilo: item.style || item.estilo }); }
  function showBeer(item) {
    const url = new URL(window.location.href); url.search = ''; url.searchParams.set('slug', key(item));
    $('#beerStatus').hidden=true; $('#beerCard').hidden=false; $('#beerName').textContent=item.name; $('#beerTitle').textContent=item.name; $('#beerSubtitle').textContent=`${item.style} • ${item.confraria}`; $('#beerStyle').textContent=`${item.style} • ${item.category}`; $('#beerSchool').textContent=school(item.style);
    $('#beerMetrics').innerHTML=[['Confraria',item.confraria],['Cervejeiro',item.brewer],['ABV',item.abv],['IBU',item.ibu],['EBC',item.ebc],['Volume',item.volume]].map(([label,value])=>`<div class="detail"><b>${label}</b>${escapeHtml(value||'Não informado')}</div>`).join('');
    $('#beerDescription').innerHTML=item.description ? `<p>${escapeHtml(item.description)}</p>` : '<p><em>Sem descrição adicional cadastrada.</em></p>';
    $('#beerExtras').innerHTML=[item.ingredients?`<div><strong>Ingredientes:</strong> ${escapeHtml(item.ingredients)}</div>`:'',item.aroma?`<div><strong>Aroma:</strong> ${escapeHtml(item.aroma)}</div>`:'',item.flavor?`<div><strong>Sabor:</strong> ${escapeHtml(item.flavor)}</div>`:'',item.pairing?`<div><strong>Harmonização:</strong> ${escapeHtml(item.pairing)}</div>`:''].filter(Boolean).join('') || '<span class="filter-help">Não há características adicionais cadastradas.</span>';
    if (item.photo) $('#beerImage').innerHTML=`<img class="detail-photo" src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}">`;
    QRCode.toCanvas($('#beerQr'), url.href, { width:118, margin:2, color:{dark:'#0f2b48',light:'#ffffff'} });
    $('#copyBeerUrl').addEventListener('click', async()=>{await navigator.clipboard.writeText(url.href); $('#copyBeerUrl').textContent='Link copiado';});
    document.title=`${item.name} • 13º FDCRJ`;
  }
  async function init() { try { const csv=await window.FDCRJ_DATA_SOURCE.fetchCsv(); const rows=parseCSV(csv); const headers=rows[0].map(normalize); const items=rows.slice(1).map(row=>({name:field(row,headers,'Nome da cerveja')||'Cerveja não informada',style:field(row,headers,'Estilo BJCP')||'Estilo não informado',confraria:field(row,headers,'Confraria')||'Não informado',brewer:field(row,headers,'Cervejeiro')||'Não informado',category:field(row,headers,'Tipo')||'Não informado',abv:field(row,headers,'ABV'),ibu:field(row,headers,'IBU'),ebc:field(row,headers,'EBC'),volume:field(row,headers,'Volume'),description:field(row,headers,'Descrição'),ingredients:field(row,headers,'Ingredientes'),aroma:field(row,headers,'Aroma'),flavor:field(row,headers,'Sabor'),pairing:field(row,headers,'Harmonização'),photo:field(row,headers,'Foto','Imagem')})); const requested=new URLSearchParams(location.search).get('slug'); const item=items.find(entry=>key({cerveja:entry.name,confrariaNome:entry.confraria,estilo:entry.style})===requested); if (!item) throw new Error('Cerveja não encontrada'); showBeer(item); } catch(error) { $('#beerStatus').innerHTML='<h2>Ficha não encontrada</h2><p>O link pode estar desatualizado ou a cerveja ainda não está cadastrada.</p><a class="pill" href="index.html">Voltar ao guia</a>'; } }
  document.addEventListener('DOMContentLoaded', init);
})();
