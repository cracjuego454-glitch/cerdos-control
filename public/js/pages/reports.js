const Reports = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs();
    return `
      <div class="toolbar"><h2>📋 Reportes</h2><button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / PDF</button></div>
      <div class="grid-2">
        <div class="card">
          <h2>📊 Resumen General</h2>
          <p>Selecciona un cerdo para ver su reporte detallado</p>
          <div class="form-group">
            <label>Cerdo</label>
            <select id="reportPigId" onchange="Reports.loadPigReport()">
              <option value="">Seleccionar...</option>
              ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}
            </select>
          </div>
          <div id="pigReport"></div>
        </div>
        <div class="card">
          <h2>📈 Análisis de Alimentación</h2>
          <div class="chart-container"><canvas id="chartFeedingReport"></canvas></div>
          <div id="feedingAnalysis"></div>
        </div>
      </div>
    `;
  },
  afterRender() {},
  async loadPigReport() {
    const id = parseInt(document.getElementById('reportPigId').value);
    if (!id) { document.getElementById('pigReport').innerHTML = ''; return; }
    const r = await API.getPigReport(id);
    const container = document.getElementById('pigReport');
    const totalInvestment = r.pig.purchase_cost + r.totalFeedCost + r.totalHealthCost;
    const firstW = r.weightRecords.length > 1 ? r.weightRecords[0].weight_kg : 0;
    const lastW = r.weightRecords.length > 0 ? r.weightRecords[r.weightRecords.length-1].weight_kg : 0;
    const gained = lastW - firstW;
    const conversion = r.totalFeedKg > 0 && gained > 0 ? (r.totalFeedKg / gained).toFixed(2) : '-';
    container.innerHTML = `
      <hr style="margin:12px 0">
      <h3>${r.pig.identifier} ${r.pig.name ? '- ' + r.pig.name : ''}</h3>
      <table>
        <tr><td>Costo de compra</td><td><strong>$${r.pig.purchase_cost.toFixed(2)}</strong></td></tr>
        <tr><td>Total alimento</td><td><strong>$${r.totalFeedCost.toFixed(2)}</strong> (${r.totalFeedKg.toFixed(1)} kg)</td></tr>
        <tr><td>Total salud</td><td><strong>$${r.totalHealthCost.toFixed(2)}</strong></td></tr>
        <tr><td>Peso inicial → final</td><td>${firstW.toFixed(1)} → ${lastW.toFixed(1)} kg (${gained > 0 ? '+' : ''}${gained.toFixed(1)} kg)</td></tr>
        <tr><td>Conversión alimenticia</td><td><strong>${conversion}</strong> kg de comida / kg ganado</td></tr>
        <tr style="font-weight:700"><td>Inversión total</td><td><strong>$${totalInvestment.toFixed(2)}</strong></td></tr>
      </table>
      ${r.weightRecords.length > 0 ? `
        <h3 style="margin-top:12px">⚖️ Evolución de Peso</h3>
        <table>
          <tr><th>Fecha</th><th>Peso</th><th>Ganancia</th></tr>
          ${r.weightRecords.map((w, i) => `
            <tr>
              <td>${w.date}</td>
              <td>${w.weight_kg} kg</td>
              <td>${i > 0 ? '+' + (w.weight_kg - r.weightRecords[i-1].weight_kg).toFixed(1) + ' kg' : '-'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      ${r.healthRecords.length > 0 ? `
        <h3 style="margin-top:12px">💊 Salud</h3>
        <table>
          <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th></tr>
          ${r.healthRecords.map(h => `<tr><td>${h.date}</td><td>${h.record_type}</td><td>${h.description || '-'}</td></tr>`).join('')}
        </table>
      ` : ''}
    `;

    // Feeding chart
    if (document.getElementById('chartFeedingReport')) {
      if (window._feedChart) window._feedChart.destroy();
      const feedByDate = {};
      r.feedRecords.forEach(f => { feedByDate[f.date] = (feedByDate[f.date] || 0) + f.quantity_kg; });
      const dates = Object.keys(feedByDate).sort();
      const data = dates.map(d => feedByDate[d]);
      window._feedChart = new Chart(document.getElementById('chartFeedingReport'), {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'kg/día', data, borderColor: '#4fc3f7', fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }
  }
};
