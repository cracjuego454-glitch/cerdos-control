const Reproduction = {
  records: [],
  async render() {
    this.records = await API.get('/api/reproduction');
    const sows = await API.get('/api/pigs?status=active');
    return `
      <div class="toolbar"><h2>🧬 Reproducción</h2><button class="btn btn-primary" onclick="Reproduction.openForm()">+ Nueva Monta</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Cerda</th><th>Verraco</th><th>Monta</th><th>Parto esperado</th><th>Parto real</th><th>Lechones vivos</th><th>Resultado</th><th>Acciones</th></tr>
            ${this.records.length ? this.records.map(r => `
              <tr>
                <td>${r.sow_identifier}</td><td>${r.boar_identifier || '-'}</td>
                <td>${r.mating_date}</td>
                <td>${r.expected_farrowing_date || '-'}</td>
                <td>${r.farrowing_date || '-'}</td>
                <td>${r.piglets_alive || 0} v / ${r.piglets_dead || 0} m</td>
                <td>${r.result || 'Pendiente'}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="Reproduction.openForm(${r.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Reproduction.delete(${r.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty"><p>No hay registros de reproducción</p></td></tr>'}
          </table>
        </div>
      </div>
      <div class="card">
        <h3>Cerda</h3>
        <div class="form-group">
          <label>Cerda (Hembra)</label>
          <select id="reproSowId" onchange="Reproduction.loadSowInfo()">
            <option value="">Seleccionar...</option>
            ${sows.filter(s => s.sex === 'hembra').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
          </select>
          <div id="reproSowInfo" style="font-size:0.85rem;margin-top:4px"></div>
        </div>
      </div>
      <div id="reproductionModal" class="modal">
        <div class="modal-content">
          <h2 id="reproductionModalTitle">Nueva Monta</h2>
          <form id="reproductionForm" onsubmit="Reproduction.save(event)">
            <input type="hidden" id="reproductionId">
            <div class="form-row">
              <div class="form-group"><label>Cerda *</label>
                <select id="reproductionSowId" required>
                  <option value="">Seleccionar...</option>
                  ${sows.filter(s => s.sex === 'hembra').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Verraco</label>
                <select id="reproductionBoarId">
                  <option value="">Seleccionar...</option>
                  ${sows.filter(s => s.sex === 'macho').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Monta *</label><input type="date" id="reproductionMatingDate" required></div>
              <div class="form-group"><label>Fecha Esperada de Parto</label><input type="date" id="reproductionExpectedDate"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Parto Real</label><input type="date" id="reproductionFarrowingDate" onchange="Reproduction.calcResult()"></div>
              <div class="form-group"><label>Lechones Vivos</label><input type="number" id="reproductionPigletsAlive" onchange="Reproduction.calcResult()"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Lechones Muertos</label><input type="number" id="reproductionPigletsDead" onchange="Reproduction.calcResult()"></div>
              <div class="form-group"><label>Resultado</label>
                <select id="reproductionResult">
                  <option value="">Pendiente</option>
                  <option value="Exitosa">✅ Exitosa</option>
                  <option value="Fallida">❌ Fallida</option>
                  <option value="En proceso">🔄 En proceso</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="reproductionNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Reproduction.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  calcResult() {
    const alive = parseInt(document.getElementById('reproductionPigletsAlive').value) || 0;
    const dead = parseInt(document.getElementById('reproductionPigletsDead').value) || 0;
    const farrowing = document.getElementById('reproductionFarrowingDate').value;
    if (farrowing && alive > 0) {
      document.getElementById('reproductionResult').value = 'Exitosa';
    } else if (farrowing && alive === 0 && dead > 0) {
      document.getElementById('reproductionResult').value = 'Fallida';
    }
  },
  loadSowInfo() {
    const id = parseInt(document.getElementById('reproSowId').value);
    const info = document.getElementById('reproSowInfo');
    if (!id) { info.innerHTML = ''; return; }
    const prev = this.records.filter(r => r.sow_id === id).sort((a,b) => b.id - a.id);
    info.innerHTML = `<span style="color:#1565c0">🧬 ${prev.length} montas registradas — última: ${prev[0] ? prev[0].mating_date + (prev[0].result ? ' (' + prev[0].result + ')' : '') : 'ninguna'}</span>`;
  },
  openForm(id) {
    document.getElementById('reproductionModal').classList.add('open');
    document.getElementById('reproductionForm').reset();
    document.getElementById('reproductionId').value = '';
    document.getElementById('reproductionModalTitle').textContent = 'Nueva Monta';
    if (id) {
      const r = this.records.find(x => x.id === id);
      if (!r) return;
      document.getElementById('reproductionModalTitle').textContent = 'Editar Monta';
      document.getElementById('reproductionId').value = r.id;
      document.getElementById('reproductionSowId').value = r.sow_id;
      document.getElementById('reproductionBoarId').value = r.boar_id || '';
      document.getElementById('reproductionMatingDate').value = r.mating_date;
      document.getElementById('reproductionExpectedDate').value = r.expected_farrowing_date || '';
      document.getElementById('reproductionFarrowingDate').value = r.farrowing_date || '';
      document.getElementById('reproductionPigletsAlive').value = r.piglets_alive || 0;
      document.getElementById('reproductionPigletsDead').value = r.piglets_dead || 0;
      document.getElementById('reproductionResult').value = r.result || '';
      document.getElementById('reproductionNotes').value = r.notes || '';
    }
  },
  closeForm() { document.getElementById('reproductionModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('reproductionId').value;
    const data = {
      sow_id: parseInt(document.getElementById('reproductionSowId').value),
      boar_id: parseInt(document.getElementById('reproductionBoarId').value) || null,
      mating_date: document.getElementById('reproductionMatingDate').value,
      expected_farrowing_date: document.getElementById('reproductionExpectedDate').value || null,
      farrowing_date: document.getElementById('reproductionFarrowingDate').value || null,
      piglets_alive: parseInt(document.getElementById('reproductionPigletsAlive').value) || 0,
      piglets_dead: parseInt(document.getElementById('reproductionPigletsDead').value) || 0,
      result: document.getElementById('reproductionResult').value || null,
      notes: document.getElementById('reproductionNotes').value || null
    };
    if (id) {
      await API.put(`/api/reproduction/${id}`, data);
    } else {
      await API.post('/api/reproduction', data);
    }
    this.closeForm();
    App.navigate('reproduction');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este registro de reproducción?')) return;
    await API.delete(`/api/reproduction/${id}`);
    App.navigate('reproduction');
  }
};