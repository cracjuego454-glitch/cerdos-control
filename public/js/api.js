const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },
  async put(url, data) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },
  async delete(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },

  // Pigs
  getPigs(status) { return this.get(`/api/pigs${status ? `?status=${status}` : ''}`); },
  getPig(id) { return this.get(`/api/pigs/${id}`); },
  savePig(data) { return data.id ? this.put(`/api/pigs/${data.id}`, data) : this.post('/api/pigs', data); },
  deletePig(id) { return this.delete(`/api/pigs/${id}`); },

  // Feeding
  getFeeding(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/feeding${q ? '?' + q : ''}`); },
  saveFeeding(data) { return this.post('/api/feeding', data); },
  deleteFeeding(id) { return this.delete(`/api/feeding/${id}`); },

  // Weight
  getWeights(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/weight${q ? '?' + q : ''}`); },
  saveWeight(data) { return this.post('/api/weight', data); },
  deleteWeight(id) { return this.delete(`/api/weight/${id}`); },

  // Health
  getHealth(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/health${q ? '?' + q : ''}`); },
  saveHealth(data) { return this.post('/api/health', data); },
  deleteHealth(id) { return this.delete(`/api/health/${id}`); },

  // Expenses
  getExpenses(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/expenses${q ? '?' + q : ''}`); },
  saveExpense(data) { return this.post('/api/expenses', data); },
  deleteExpense(id) { return this.delete(`/api/expenses/${id}`); },

  // Sales
  getSales(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/sales${q ? '?' + q : ''}`); },
  saveSale(data) { return this.post('/api/sales', data); },
  deleteSale(id) { return this.delete(`/api/sales/${id}`); },

  // Reports
  getSummary() { return this.get('/api/reports/summary'); },
  getPigReport(id) { return this.get(`/api/reports/pig/${id}`); }
};
