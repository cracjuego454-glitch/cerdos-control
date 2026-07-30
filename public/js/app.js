const App = {
  currentPage: 'dashboard',
  pages: { dashboard: Dashboard, pigs: Pigs, feeding: Feeding, weight: Weight, health: Health, expenses: Expenses, sales: Sales, partners: Partners, reports: Reports },

  enterApp() {
    document.getElementById('welcome-screen').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('welcome-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      this.navigate('dashboard');
    }, 500);
  },

  async navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    const content = document.getElementById('page-content');
    const pageModule = this.pages[page];
    if (!pageModule) { content.innerHTML = '<div class="card"><h2>404</h2><p>Página no encontrada</p></div>'; return; }
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Cargando...</div>';
    try {
      content.innerHTML = await pageModule.render();
      if (pageModule.afterRender) pageModule.afterRender();
    } catch (e) {
      content.innerHTML = `<div class="card"><div class="alert alert-danger">Error: ${e.message}</div></div>`;
    }
  },

  init() {
    document.querySelectorAll('#sidebar nav a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(a.dataset.page);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
