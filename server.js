const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function q(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt;
}

// ========== PIGS API ==========
app.get('/api/pigs', (req, res) => {
  try {
    const { status } = req.query;
    const stmt = status
      ? db.prepare('SELECT * FROM pigs WHERE status = ? ORDER BY identifier')
      : db.prepare('SELECT * FROM pigs ORDER BY identifier');
    res.json(status ? stmt.all(status) : stmt.all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pigs/:id', (req, res) => {
  try {
    const pig = db.prepare('SELECT * FROM pigs WHERE id = ?').get(req.params.id);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    res.json(pig);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pigs', (req, res) => {
  try {
    const { identifier, name, breed, birth_date, purchase_date, purchase_cost, notes } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Identificador requerido' });
    db.prepare(
      'INSERT INTO pigs (identifier, name, breed, birth_date, purchase_date, purchase_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(identifier, name || null, breed || null, birth_date || null, purchase_date || null, purchase_cost || 0, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un cerdo con ese identificador' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/pigs/:id', (req, res) => {
  try {
    const { identifier, name, breed, birth_date, purchase_date, purchase_cost, status, notes } = req.body;
    db.prepare(
      "UPDATE pigs SET identifier=?, name=?, breed=?, birth_date=?, purchase_date=?, purchase_cost=?, status=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?"
    ).run(identifier, name, breed, birth_date, purchase_date, purchase_cost, status || 'active', notes, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pigs/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pigs WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== FEEDING API ==========
app.get('/api/feeding', (req, res) => {
  try {
    const { pig_id, from, to, limit } = req.query;
    let sql = `SELECT f.*, p.identifier as pig_identifier, p.name as pig_name FROM feeding_records f JOIN pigs p ON f.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND f.pig_id = ?'; params.push(pig_id); }
    if (from) { sql += ' AND f.date >= ?'; params.push(from); }
    if (to) { sql += ' AND f.date <= ?'; params.push(to); }
    sql += ' ORDER BY f.date DESC, f.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feeding', (req, res) => {
  try {
    const { pig_id, date, food_type, quantity_kg, cost_per_kg, notes } = req.body;
    if (!pig_id || !date || !quantity_kg) return res.status(400).json({ error: 'pig_id, date y quantity_kg requeridos' });
    const totalCost = (cost_per_kg || 0) * quantity_kg;
    db.prepare(
      'INSERT INTO feeding_records (pig_id, date, food_type, quantity_kg, cost_per_kg, total_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(pig_id, date, food_type || null, quantity_kg, cost_per_kg || 0, totalCost, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feeding/:id', (req, res) => {
  try { db.prepare('DELETE FROM feeding_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== EXPENSES API ==========
app.get('/api/expenses', (req, res) => {
  try {
    const { category, from, to, limit } = req.query;
    let sql = `SELECT e.*, p.identifier as pig_identifier, pr.name as partner_name FROM expenses e LEFT JOIN pigs p ON e.pig_id = p.id LEFT JOIN partners pr ON e.partner_id = pr.id WHERE 1=1`;
    const params = [];
    if (category) { sql += ' AND e.category = ?'; params.push(category); }
    if (from) { sql += ' AND e.date >= ?'; params.push(from); }
    if (to) { sql += ' AND e.date <= ?'; params.push(to); }
    sql += ' ORDER BY e.date DESC, e.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, category, description, amount, pig_id, partner_id, notes } = req.body;
    if (!date || !category || !amount) return res.status(400).json({ error: 'date, category y amount requeridos' });
    db.prepare('INSERT INTO expenses (date, category, description, amount, pig_id, partner_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(date, category, description || null, amount, pig_id || null, partner_id || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', (req, res) => {
  try { db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SALES API ==========
app.get('/api/sales', (req, res) => {
  try {
    const { from, to, limit } = req.query;
    let sql = `SELECT s.*, p.identifier as pig_identifier, p.name as pig_name FROM sales s LEFT JOIN pigs p ON s.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (from) { sql += ' AND s.date >= ?'; params.push(from); }
    if (to) { sql += ' AND s.date <= ?'; params.push(to); }
    sql += ' ORDER BY s.date DESC, s.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sales', (req, res) => {
  try {
    const { date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes } = req.body;
    if (!date || !total_amount) return res.status(400).json({ error: 'date y total_amount requeridos' });
    db.prepare('INSERT INTO sales (date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(date, pig_id || null, buyer_name || null, quantity_kg || null, price_per_kg || null, total_amount, sale_type || 'pig', notes || null);
    if (pig_id) {
      db.prepare('UPDATE pigs SET status = ? WHERE id = ?').run('sold', pig_id);
    }
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/sales/:id', (req, res) => {
  try { db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== WEIGHT API ==========
app.get('/api/weight', (req, res) => {
  try {
    const { pig_id, from, to, limit } = req.query;
    let sql = `SELECT w.*, p.identifier as pig_identifier, p.name as pig_name FROM weight_records w JOIN pigs p ON w.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND w.pig_id = ?'; params.push(pig_id); }
    if (from) { sql += ' AND w.date >= ?'; params.push(from); }
    if (to) { sql += ' AND w.date <= ?'; params.push(to); }
    sql += ' ORDER BY w.date DESC, w.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weight', (req, res) => {
  try {
    const { pig_id, date, weight_kg, notes } = req.body;
    if (!pig_id || !date || !weight_kg) return res.status(400).json({ error: 'pig_id, date y weight_kg requeridos' });
    db.prepare('INSERT INTO weight_records (pig_id, date, weight_kg, notes) VALUES (?, ?, ?, ?)')
      .run(pig_id, date, weight_kg, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/weight/:id', (req, res) => {
  try { db.prepare('DELETE FROM weight_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== HEALTH API ==========
app.get('/api/health', (req, res) => {
  try {
    const { pig_id, record_type, from, to, limit } = req.query;
    let sql = `SELECT h.*, p.identifier as pig_identifier, p.name as pig_name FROM health_records h JOIN pigs p ON h.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND h.pig_id = ?'; params.push(pig_id); }
    if (record_type) { sql += ' AND h.record_type = ?'; params.push(record_type); }
    if (from) { sql += ' AND h.date >= ?'; params.push(from); }
    if (to) { sql += ' AND h.date <= ?'; params.push(to); }
    sql += ' ORDER BY h.date DESC, h.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/health', (req, res) => {
  try {
    const { pig_id, date, record_type, description, medicine, cost, next_due_date, notes } = req.body;
    if (!pig_id || !date || !record_type) return res.status(400).json({ error: 'pig_id, date y record_type requeridos' });
    db.prepare('INSERT INTO health_records (pig_id, date, record_type, description, medicine, cost, next_due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(pig_id, date, record_type, description || null, medicine || null, cost || 0, next_due_date || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/health/:id', (req, res) => {
  try { db.prepare('DELETE FROM health_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== REPORTS / STATS ==========
app.get('/api/reports/summary', (req, res) => {
  try {
    const activePigs = db.prepare("SELECT COUNT(*) as count FROM pigs WHERE status = 'active'").get();
    const totalPigs = db.prepare('SELECT COUNT(*) as count FROM pigs').get();
    const totalFeed = db.prepare('SELECT COALESCE(SUM(total_cost),0) as total FROM feeding_records').get();
    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses').get();
    const totalSales = db.prepare('SELECT COALESCE(SUM(total_amount),0) as total FROM sales').get();
    const totalFeedKg = db.prepare('SELECT COALESCE(SUM(quantity_kg),0) as total FROM feeding_records').get();
    const recentWeight = db.prepare(
      `SELECT w.*, p.identifier, p.name FROM weight_records w
       JOIN pigs p ON w.pig_id = p.id
       WHERE w.id IN (SELECT MAX(id) FROM weight_records GROUP BY pig_id)
       ORDER BY w.date DESC`
    ).all();

    res.json({
      activePigs: activePigs.count,
      totalPigs: totalPigs.count,
      totalFeedCost: totalFeed.total,
      totalExpenses: totalExpenses.total,
      totalSales: totalSales.total,
      totalFeedKg: totalFeedKg.total,
      profit: totalSales.total - totalExpenses.total - totalFeed.total,
      upcomingHealth: db.prepare(`
        SELECT h.*, p.identifier as pig_identifier
        FROM health_records h JOIN pigs p ON h.pig_id = p.id
        WHERE h.next_due_date IS NOT NULL AND h.next_due_date >= date('now','-1 day')
        ORDER BY h.next_due_date ASC LIMIT 10
      `).all(),
      feedConversion: db.prepare(`
        SELECT * FROM (
          SELECT p.id, p.identifier,
            COALESCE((SELECT SUM(quantity_kg) FROM feeding_records WHERE pig_id = p.id), 0) as total_feed_kg,
            (SELECT COALESCE(MAX(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as last_weight,
            (SELECT COALESCE(MIN(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as first_weight
          FROM pigs p
          WHERE p.status = 'active'
        ) WHERE total_feed_kg > 0 AND last_weight > 0
      `).all(),
      recentWeights: recentWeight,
      partners: db.prepare(`
        SELECT p.*,
          COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) as total_expenses_paid,
          COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) as total_feed_paid,
          COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0) as total_pigs_paid,
          COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE partner_id = p.id AND type = 'return'), 0) as total_returned,
          (p.investment + COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0)) as total_invested
        FROM partners p WHERE p.status = 'active' ORDER BY p.name
      `).all()
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/pig/:id', (req, res) => {
  try {
    const pig = db.prepare('SELECT * FROM pigs WHERE id = ?').get(req.params.id);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    const feedRecords = db.prepare('SELECT * FROM feeding_records WHERE pig_id = ? ORDER BY date').all(req.params.id);
    const weightRecords = db.prepare('SELECT * FROM weight_records WHERE pig_id = ? ORDER BY date').all(req.params.id);
    const healthRecords = db.prepare('SELECT * FROM health_records WHERE pig_id = ? ORDER BY date DESC').all(req.params.id);
    const totalFeed = db.prepare('SELECT COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity_kg),0) as kg FROM feeding_records WHERE pig_id = ?').get(req.params.id);
    const totalHealth = db.prepare('SELECT COALESCE(SUM(cost),0) as total FROM health_records WHERE pig_id = ?').get(req.params.id);
    res.json({ pig, feedRecords, weightRecords, healthRecords, totalFeedCost: totalFeed.cost, totalFeedKg: totalFeed.kg, totalHealthCost: totalHealth.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PARTNERS API ==========
app.get('/api/partners', (req, res) => {
  try {
    const partners = db.prepare(`
      SELECT p.*, COALESCE(SUM(pt.amount),0) as total_returned
      FROM partners p LEFT JOIN partner_transactions pt ON p.id = pt.partner_id AND pt.type = 'return'
      GROUP BY p.id ORDER BY p.name
    `).all();
    res.json(partners);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/partners/info', (req, res) => {
  try {
    const partners = db.prepare("SELECT * FROM partners WHERE status = 'active' ORDER BY name").all();
    const allPartners = db.prepare('SELECT * FROM partners ORDER BY name').all();
    const totalInvestment = partners.reduce((s, p) => s + p.investment, 0);
    res.json({ partners, allPartners, totalInvestment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/partners', (req, res) => {
  try {
    const { name, investment, investment_type, date, phone, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO partners (name, investment, investment_type, date, phone, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, investment || 0, investment_type || 'capital', date || null, phone || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/partners/:id', (req, res) => {
  try {
    const { name, investment, investment_type, date, phone, status, notes } = req.body;
    if (status) {
      db.prepare("UPDATE partners SET status=?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(status, req.params.id);
    } else {
      db.prepare("UPDATE partners SET name=?, investment=?, investment_type=?, date=?, phone=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(name, investment, investment_type, date, phone, notes, req.params.id);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/partners/:id', (req, res) => {
  try { db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Partner transactions
app.get('/api/partners/:id/transactions', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM partner_transactions WHERE partner_id = ? ORDER BY date DESC').all(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/partners/:id/transactions', (req, res) => {
  try {
    const { date, type, amount, description, notes } = req.body;
    if (!date || !type || !amount) return res.status(400).json({ error: 'date, type y amount requeridos' });
    db.prepare('INSERT INTO partner_transactions (partner_id, date, type, amount, description, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, date, type, amount, description || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== BACKUP / RESTORE ==========
app.get('/api/backup', (req, res) => {
  try {
    const backup = {
      version: 1,
      date: new Date().toISOString(),
      pigs: db.prepare('SELECT * FROM pigs').all(),
      feeding: db.prepare('SELECT * FROM feeding_records').all(),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      sales: db.prepare('SELECT * FROM sales').all(),
      weight: db.prepare('SELECT * FROM weight_records').all(),
      health: db.prepare('SELECT * FROM health_records').all(),
      partners: db.prepare('SELECT * FROM partners').all(),
      partner_transactions: db.prepare('SELECT * FROM partner_transactions').all()
    };
    res.json(backup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restore', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.pigs) return res.status(400).json({ error: 'Respaldos inválido' });
    db.exec('PRAGMA foreign_keys=OFF');
    ['partner_transactions', 'partners', 'health_records', 'weight_records', 'sales', 'expenses', 'feeding_records', 'pigs'].forEach(t => {
      db.prepare(`DELETE FROM ${t}`).run();
    });
    const insertPig = db.prepare('INSERT INTO pigs (id, identifier, name, breed, birth_date, purchase_date, purchase_cost, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.pigs.forEach(p => insertPig.run(p.id, p.identifier, p.name, p.breed, p.birth_date, p.purchase_date, p.purchase_cost, p.status, p.notes, p.created_at, p.updated_at));
    const insertFeed = db.prepare('INSERT INTO feeding_records (id, pig_id, date, food_type, quantity_kg, cost_per_kg, total_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.feeding || []).forEach(r => insertFeed.run(r.id, r.pig_id, r.date, r.food_type, r.quantity_kg, r.cost_per_kg, r.total_cost, r.notes, r.created_at));
    const insertExpense = db.prepare('INSERT INTO expenses (id, date, category, description, amount, pig_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (data.expenses || []).forEach(r => insertExpense.run(r.id, r.date, r.category, r.description, r.amount, r.pig_id, r.notes, r.created_at));
    const insertSale = db.prepare('INSERT INTO sales (id, date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.sales || []).forEach(r => insertSale.run(r.id, r.date, r.pig_id, r.buyer_name, r.quantity_kg, r.price_per_kg, r.total_amount, r.sale_type, r.notes, r.created_at));
    const insertWeight = db.prepare('INSERT INTO weight_records (id, pig_id, date, weight_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    (data.weight || []).forEach(r => insertWeight.run(r.id, r.pig_id, r.date, r.weight_kg, r.notes, r.created_at));
    const insertHealth = db.prepare('INSERT INTO health_records (id, pig_id, date, record_type, description, medicine, cost, next_due_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.health || []).forEach(r => insertHealth.run(r.id, r.pig_id, r.date, r.record_type, r.description, r.medicine, r.cost, r.next_due_date, r.notes, r.created_at));
    const insertPartner = db.prepare('INSERT INTO partners (id, name, investment, investment_type, date, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.partners || []).forEach(r => insertPartner.run(r.id, r.name, r.investment, r.investment_type, r.date, r.phone, r.notes, r.created_at, r.updated_at));
    const insertPTx = db.prepare('INSERT INTO partner_transactions (id, partner_id, date, type, amount, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (data.partner_transactions || []).forEach(r => insertPTx.run(r.id, r.partner_id, r.date, r.type, r.amount, r.description, r.notes, r.created_at));
    db.exec('PRAGMA foreign_keys=ON');
    res.json({ ok: true, count: { pigs: data.pigs.length, feeding: (data.feeding || []).length, expenses: (data.expenses || []).length, sales: (data.sales || []).length, weight: (data.weight || []).length, health: (data.health || []).length, partners: (data.partners || []).length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== START ==========
app.listen(PORT, () => {
  console.log(`🚀 Sistema Cerdos by LOMI corriendo en http://localhost:${PORT}`);
});
