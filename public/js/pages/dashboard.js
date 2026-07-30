const Dashboard = {
  async render() {
    const s = await API.getSummary();
    return `
      <h2 style="margin-bottom:20px">📊 Dashboard</h2>
      <div class="grid-4">
        <div class="card stat-card"><div class="stat-icon">🐖</div><div class="stat-value">${s.activePigs}</div><div class="stat-label">Cerdos Activos</div></div>
        <div class="card stat-card"><div class="stat-icon">🌾</div><div class="stat-value">${s.totalFeedKg.toFixed(1)} kg</div><div class="stat-label">Alimento Total</div></div>
        <div class="card stat-card"><div class="stat-icon">💵</div><div class="stat-value">$${s.totalSales.toFixed(2)}</div><div class="stat-label">Ingresos</div></div>
        <div class="card stat-card"><div class="stat-icon">📊</div><div class="stat-value" style="color:${s.profit >= 0 ? '#2e7d32' : '#c62828'}">$${s.profit.toFixed(2)}</div><div class="stat-label">Ganancia Neta</div></div>
      </div>
      <div class="grid-3">
        <div class="card">
          <h2>💰 Gastos vs Ingresos</h2>
          <div class="chart-container"><canvas id="chartFinancial"></canvas></div>
        </div>
        <div class="card">
          <h2>🌾 Costo de Alimento</h2>
          <div class="chart-container"><canvas id="chartFeed"></canvas></div>
        </div>
        <div class="card">
          <h2>⚖️ Últimos Pesos</h2>
          <div id="recentWeights">${s.recentWeights.length ? `<table><tr><th>Cerdo</th><th>Peso</th><th>Fecha</th></tr>${s.recentWeights.slice(0,10).map(w => `<tr><td>${w.identifier}</td><td>${w.weight_kg} kg</td><td>${w.date}</td></tr>`).join('')}</table>` : '<div class="empty"><p>Aún no hay registros de peso</p></div>'}</div>
        </div>
      </div>
      <div class="card">
        <h2>📋 Resumen Financiero</h2>
        <table>
          <tr><td>Total invertido en alimento</td><td><strong>$${s.totalFeedCost.toFixed(2)}</strong></td></tr>
          <tr><td>Total otros gastos</td><td><strong>$${s.totalExpenses.toFixed(2)}</strong></td></tr>
          <tr><td>Total ingresos por ventas</td><td><strong>$${s.totalSales.toFixed(2)}</strong></td></tr>
          <tr style="font-weight:700;background:#f0faf0"><td>Ganancia / Pérdida Neta</td><td style="color:${s.profit >= 0 ? '#2e7d32' : '#c62828'}">$${s.profit.toFixed(2)}</td></tr>
        </table>
      </div>
    `;
  },
  async afterRender() {
    const s = await API.getSummary();
    new Chart(document.getElementById('chartFinancial'), {
      type: 'doughnut',
      data: { labels: ['Gastos (Comida)', 'Otros Gastos', 'Ingresos'], datasets: [{ data: [s.totalFeedCost, s.totalExpenses, s.totalSales], backgroundColor: ['#ffa726', '#ef5350', '#66bb6a'] }] }
    });
    new Chart(document.getElementById('chartFeed'), {
      type: 'bar',
      data: { labels: ['Costo Total', 'Cantidad Total'], datasets: [{ label: 'Alimento', data: [s.totalFeedCost, s.totalFeedKg], backgroundColor: ['#4fc3f7', '#ab47bc'] }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }
};
