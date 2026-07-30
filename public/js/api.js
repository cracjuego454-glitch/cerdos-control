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

  // Batches
  getBatches() { return this.get('/api/batches'); },
  saveBatch(data) { return data.id ? this.put(`/api/batches/${data.id}`, data) : this.post('/api/batches', data); },
  deleteBatch(id) { return this.delete(`/api/batches/${id}`); },

  // Inventory
  getInventoryCategories() { return this.get('/api/inventory/categories'); },
  getInventoryItems(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/inventory/items${q ? '?' + q : ''}`); },
  saveInventoryItem(data) { return data.id ? this.put(`/api/inventory/items/${data.id}`, data) : this.post('/api/inventory/items', data); },
  deleteInventoryItem(id) { return this.delete(`/api/inventory/items/${id}`); },
  getInventoryMovements(id) { return this.get(`/api/inventory/items/${id}/movements`); },
  saveInventoryMovement(data) { return this.post('/api/inventory/movements', data); },

  // Daily Logs
  getDailyLogs(params) { const q = new URLSearchParams(params).toString(); return this.get(`/api/daily_logs${q ? '?' + q : ''}`); },
  saveDailyLog(data) { return data.id ? this.put(`/api/daily_logs/${data.id}`, data) : this.post('/api/daily_logs', data); },
  deleteDailyLog(id) { return this.delete(`/api/daily_logs/${id}`); },

  // Reports
  getSummary() { return this.get('/api/reports/summary'); },
  getPigReport(id) { return this.get(`/api/reports/pig/${id}`); },

  // Death
  recordDeath(pigId, data) { return this.post(`/api/pigs/${pigId}/death`, data); }
};
