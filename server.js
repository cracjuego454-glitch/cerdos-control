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
    let sql = `SELECT e.*, p.identifier as pig_identifier FROM expenses e LEFT JOIN pigs p ON e.pig_id = p.id WHERE 1=1`;
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
    const { date, category, description, amount, pig_id, notes } = req.body;
    if (!date || !category || !amount) return res.status(400).json({ error: 'date, category y amount requeridos' });
    db.prepare('INSERT INTO expenses (date, category, description, amount, pig_id, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(date, category, description || null, amount, pig_id || null, notes || null);
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
      recentWeights: recentWeight
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

// ========== START ==========
app.listen(PORT, () => {
  console.log(`🚀 Sistema Cerdos by LOMI corriendo en http://localhost:${PORT}`);
});
