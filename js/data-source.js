window.FDCRJ_DATA_SOURCE = {
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/1S_ajLE6RhxOfa771lQaWYcAKhK_BnS1fRC9lLhABLx4/gviz/tq?tqx=out:csv&gid=503452782',
  async fetchCsv() {
    const response = await fetch(this.sheetCsvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }
};
