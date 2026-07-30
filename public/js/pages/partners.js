const Partners = {
  partners: [],
  async render() {
    const info = await API.get('/api/partners/info');
    this.partners = info.partners;
    const total = info.totalInvestment;
    return `
      <div class="toolbar"><h2>🤝 Socios e Inversiones</h2><button class="btn btn-primary" onclick="Partners.openForm()">+ Nuevo Socio</button></div>
      <div class="grid-3" style="margin-bottom:20px">
        <div class="card stat-card"><div class="stat-value">${this.partners.length}</div><div class="stat-label">Socios</div></div>
        <div class="card stat-card"><div class="stat-value">$${total.toFixed(2)}</div><div class="stat-label">Inversión Total</div></div>
        <div class="card stat-card"><div class="stat-value">${this.partners.length ? Math.max(...this.partners.map(p => p.investment / total * 100)).toFixed(1) : 0}%</div><div class="stat-label">Mayor % de inversión</div></div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Nombre</th><th>Inversión</th><th>%</th><th>Tipo</th><th>Fecha</th><th>Teléfono</th><th>Devuelto</th><th></th></tr>
            ${this.partners.length ? this.partners.map(p => {
              const pct = total > 0 ? (p.investment / total * 100) : 0;
              const returned = p.total_returned || 0;
              return `<tr>
                <td><strong>${p.name}</strong></td>
                <td>$${p.investment.toFixed(2)}</td>
                <td>${pct.toFixed(1)}%</td>
                <td>${p.investment_type}</td>
                <td>${p.date || '-'}</td>
                <td>${p.phone || '-'}</td>
                <td>$${returned.toFixed(2)}</td>
                <td>
                  <button class="btn btn-sm btn-success" onclick="Partners.openTx(${p.id})">💰</button>
                  <button class="btn btn-sm btn-primary" onclick="Partners.openForm(${p.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Partners.delete(${p.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="8" class="empty"><p>No hay socios registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="partnerModal" class="modal">
        <div class="modal-content">
          <h2 id="partnerModalTitle">Nuevo Socio</h2>
          <form id="partnerForm" onsubmit="Partners.save(event)">
            <input type="hidden" id="partnerId">
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input type="text" id="partnerName" required></div>
              <div class="form-group"><label>Tipo de inversión</label>
                <select id="partnerType">
                  <option value="capital">Capital</option>
                  <option value="infraestructura">Infraestructura</option>
                  <option value="equipo">Equipo</option>
                  <option value="terreno">Terreno</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Monto invertido ($)</label><input type="number" step="0.01" id="partnerInvestment" value="0"></div>
              <div class="form-group"><label>Fecha</label><input type="date" id="partnerDate"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Teléfono</label><input type="text" id="partnerPhone"></div>
              <div class="form-group"><label>Notas</label><input type="text" id="partnerNotes"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Partners.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
      <div id="txModal" class="modal">
        <div class="modal-content">
          <h2>💰 Registrar pago a socio</h2>
          <form onsubmit="Partners.saveTx(event)">
            <input type="hidden" id="txPartnerId">
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="txDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Tipo</label>
                <select id="txType">
                  <option value="return">Devolución</option>
                  <option value="profit">Reparto de ganancia</option>
                  <option value="withdrawal">Retiro</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Monto ($) *</label><input type="number" step="0.01" id="txAmount" required></div>
              <div class="form-group"><label>Descripción</label><input type="text" id="txDesc"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Partners.closeTx()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('partnerModal').classList.add('open');
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerId').value = '';
    if (id) {
      const p = this.partners.find(x => x.id === id);
      if (!p) return;
      document.getElementById('partnerModalTitle').textContent = 'Editar Socio';
      document.getElementById('partnerId').value = p.id;
      document.getElementById('partnerName').value = p.name;
      document.getElementById('partnerType').value = p.investment_type;
      document.getElementById('partnerInvestment').value = p.investment;
      document.getElementById('partnerDate').value = p.date || '';
      document.getElementById('partnerPhone').value = p.phone || '';
      document.getElementById('partnerNotes').value = p.notes || '';
    } else {
      document.getElementById('partnerModalTitle').textContent = 'Nuevo Socio';
    }
  },
  closeForm() { document.getElementById('partnerModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('partnerId').value;
    const data = {
      id: id ? parseInt(id) : null,
      name: document.getElementById('partnerName').value,
      investment: parseFloat(document.getElementById('partnerInvestment').value) || 0,
      investment_type: document.getElementById('partnerType').value,
      date: document.getElementById('partnerDate').value || null,
      phone: document.getElementById('partnerPhone').value || null,
      notes: document.getElementById('partnerNotes').value || null
    };
    if (data.id) {
      await API.put(`/api/partners/${data.id}`, data);
    } else {
      await API.post('/api/partners', data);
    }
    this.closeForm();
    App.navigate('partners');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este socio?')) return;
    await API.delete(`/api/partners/${id}`);
    App.navigate('partners');
  },
  openTx(id) {
    document.getElementById('txModal').classList.add('open');
    document.getElementById('txPartnerId').value = id;
  },
  closeTx() { document.getElementById('txModal').classList.remove('open'); },
  async saveTx(e) {
    e.preventDefault();
    const pid = document.getElementById('txPartnerId').value;
    await API.post(`/api/partners/${pid}/transactions`, {
      date: document.getElementById('txDate').value,
      type: document.getElementById('txType').value,
      amount: parseFloat(document.getElementById('txAmount').value),
      description: document.getElementById('txDesc').value || null
    });
    this.closeTx();
    App.navigate('partners');
  }
};
