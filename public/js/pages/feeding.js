const Feeding = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs('active');
    const records = await API.getFeeding({ limit: 100 });
    return `
      <div class="toolbar"><h2>🍽️ Registro de Alimentación</h2><button class="btn btn-primary" onclick="Feeding.openForm()">+ Registrar Comida</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Cerdo</th><th>Alimento</th><th>Cantidad (kg)</th><th>Costo/kg</th><th>Total</th><th></th></tr>
            ${records.length ? records.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.pig_identifier}</td><td>${r.food_type || '-'}</td>
                <td>${r.quantity_kg} kg</td><td>$${(r.cost_per_kg || 0).toFixed(2)}</td>
                <td>$${r.total_cost.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="Feeding.delete(${r.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty"><p>No hay registros de alimentación</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="feedingModal" class="modal">
        <div class="modal-content">
          <h2>Registrar Comida</h2>
          <form onsubmit="Feeding.save(event)">
            <div class="form-group">
              <label>Cerdo *</label>
              <select id="feedingPigId" required>
                <option value="">Seleccionar...</option>
                ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="feedingDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Cantidad (kg) *</label><input type="number" step="0.1" id="feedingQty" required></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Tipo de Alimento</label><input type="text" id="feedingType" placeholder="Ej: Concentrado"></div>
              <div class="form-group"><label>Costo por kg ($)</label><input type="number" step="0.01" id="feedingCost" value="0"></div>
            </div>
            <div class="form-group"><label>Notas</label><input type="text" id="feedingNotes"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Feeding.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm() { document.getElementById('feedingModal').classList.add('open'); },
  closeForm() { document.getElementById('feedingModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    await API.saveFeeding({
      pig_id: parseInt(document.getElementById('feedingPigId').value),
      date: document.getElementById('feedingDate').value,
      quantity_kg: parseFloat(document.getElementById('feedingQty').value),
      food_type: document.getElementById('feedingType').value || null,
      cost_per_kg: parseFloat(document.getElementById('feedingCost').value) || 0,
      notes: document.getElementById('feedingNotes').value || null
    });
    this.closeForm();
    App.navigate('feeding');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await API.deleteFeeding(id);
    App.navigate('feeding');
  }
};
