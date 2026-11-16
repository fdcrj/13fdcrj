window.FDCRJ_BEER_MODEL = {
  slugify(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
  },
  shareKey(item) {
    return this.slugify(`${item.cerveja}-${item.confrariaNome || item.confraria}-${item.estilo}`);
  }
};
