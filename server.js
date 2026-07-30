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
    const { status, batch_id } = req.query;
    let sql = 'SELECT p.*, b.name as batch_name FROM pigs p LEFT JOIN batches b ON p.batch_id = b.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (batch_id) { sql += ' AND p.batch_id = ?'; params.push(batch_id); }
    sql += ' ORDER BY p.identifier';
    res.json(db.prepare(sql).all(...params));
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
    const { identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, notes, batch_id } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Identificador requerido' });
    db.prepare(
      "INSERT INTO pigs (identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, notes, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(identifier, name || null, breed || null, sex || 'macho', birth_date || null, purchase_date || null, purchase_cost || 0, notes || null, batch_id || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un cerdo con ese identificador' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/pigs/:id', (req, res) => {
  try {
    const { identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, status, notes, batch_id } = req.body;
    db.prepare(
      "UPDATE pigs SET identifier=?, name=?, breed=?, sex=?, birth_date=?, purchase_date=?, purchase_cost=?, status=?, notes=?, batch_id=?, updated_at=datetime('now','localtime') WHERE id=?"
    ).run(identifier, name, breed, sex || 'macho', birth_date, purchase_date, purchase_cost, status || 'active', notes, batch_id || null, req.params.id);
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

    const batchesCount = db.prepare('SELECT COUNT(*) as count FROM batches').get();
    const lowStockItems = db.prepare('SELECT * FROM inventory_items WHERE current_qty <= min_qty ORDER BY name').all();

    res.json({
      activePigs: activePigs.count,
      totalPigs: totalPigs.count,
      batchesCount: batchesCount.count,
      lowStockItems,
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
    const saleRecord = db.prepare('SELECT * FROM sales WHERE pig_id = ?').get(req.params.id);
    const totalExpensesOnPig = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE pig_id = ?').get(req.params.id);
    res.json({ pig, feedRecords, weightRecords, healthRecords, saleRecord, totalFeedCost: totalFeed.cost, totalFeedKg: totalFeed.kg, totalHealthCost: totalHealth.total, totalExpensesOnPig: totalExpensesOnPig.total });
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

// ========== BATCHES API ==========
app.get('/api/batches', (req, res) => {
  try {
    const batches = db.prepare(`
      SELECT b.*, (SELECT COUNT(*) FROM pigs WHERE batch_id = b.id) as pig_count
      FROM batches b ORDER BY b.name
    `).all();
    res.json(batches);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/batches', (req, res) => {
  try {
    const { name, start_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO batches (name, start_date, notes) VALUES (?, ?, ?)')
      .run(name, start_date || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un lote con ese nombre' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/batches/:id', (req, res) => {
  try {
    const { name, start_date, notes } = req.body;
    db.prepare("UPDATE batches SET name=?, start_date=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(name, start_date || null, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/batches/:id', (req, res) => {
  try {
    db.prepare('UPDATE pigs SET batch_id = NULL WHERE batch_id = ?').run(req.params.id);
    db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== INVENTORY API ==========
app.get('/api/inventory/categories', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM inventory_categories ORDER BY name').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/items', (req, res) => {
  try {
    const { category_id, low_stock } = req.query;
    let sql = `SELECT i.*, c.name as category_name FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id WHERE 1=1`;
    const params = [];
    if (category_id) { sql += ' AND i.category_id = ?'; params.push(category_id); }
    if (low_stock) { sql += ' AND i.current_qty <= i.min_qty'; }
    sql += ' ORDER BY i.name';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/items', (req, res) => {
  try {
    const { name, category_id, current_qty, unit, min_qty, unit_cost, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO inventory_items (name, category_id, current_qty, unit, min_qty, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, category_id || null, current_qty || 0, unit || 'kg', min_qty || 0, unit_cost || 0, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventory/items/:id', (req, res) => {
  try {
    const { name, category_id, current_qty, unit, min_qty, unit_cost, notes } = req.body;
    db.prepare("UPDATE inventory_items SET name=?, category_id=?, current_qty=?, unit=?, min_qty=?, unit_cost=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(name, category_id || null, current_qty || 0, unit || 'kg', min_qty || 0, unit_cost || 0, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventory/items/:id', (req, res) => {
  try { db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/items/:id/movements', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM inventory_movements WHERE item_id = ? ORDER BY date DESC, id DESC').all(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/movements', (req, res) => {
  try {
    const { item_id, date, type, quantity, description } = req.body;
    if (!item_id || !date || !type || !quantity) return res.status(400).json({ error: 'item_id, date, type y quantity requeridos' });
    db.prepare('INSERT INTO inventory_movements (item_id, date, type, quantity, description) VALUES (?, ?, ?, ?, ?)')
      .run(item_id, date, type, quantity, description || null);
    db.prepare('UPDATE inventory_items SET current_qty = current_qty + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(type === 'in' ? quantity : -quantity, item_id);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DAILY LOGS API ==========
app.get('/api/daily_logs', (req, res) => {
  try {
    const { from, to, limit } = req.query;
    let sql = 'SELECT * FROM daily_logs WHERE 1=1';
    const params = [];
    if (from) { sql += ' AND date >= ?'; params.push(from); }
    if (to) { sql += ' AND date <= ?'; params.push(to); }
    sql += ' ORDER BY date DESC, id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily_logs', (req, res) => {
  try {
    const { date, title, content } = req.body;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    db.prepare('INSERT INTO daily_logs (date, title, content) VALUES (?, ?, ?)')
      .run(date, title || null, content || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/daily_logs/:id', (req, res) => {
  try {
    const { date, title, content } = req.body;
    db.prepare('UPDATE daily_logs SET date=?, title=?, content=? WHERE id=?')
      .run(date, title || null, content || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/daily_logs/:id', (req, res) => {
  try { db.prepare('DELETE FROM daily_logs WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== REPRODUCTION API ==========
app.get('/api/reproduction', (req, res) => {
  try {
    const { sow_id } = req.query;
    let sql = `SELECT r.*, s.identifier as sow_identifier, s.name as sow_name, b.identifier as boar_identifier
      FROM reproduction_records r
      JOIN pigs s ON r.sow_id = s.id
      LEFT JOIN pigs b ON r.boar_id = b.id
      WHERE 1=1`;
    const params = [];
    if (sow_id) { sql += ' AND r.sow_id = ?'; params.push(sow_id); }
    sql += ' ORDER BY r.mating_date DESC, r.id DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reproduction', (req, res) => {
  try {
    const { sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes } = req.body;
    if (!sow_id || !mating_date) return res.status(400).json({ error: 'sow_id y mating_date requeridos' });
    db.prepare(`INSERT INTO reproduction_records (sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(sow_id, boar_id || null, mating_date, expected_farrowing_date || null, farrowing_date || null, piglets_alive || 0, piglets_dead || 0, result || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reproduction/:id', (req, res) => {
  try {
    const { boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes } = req.body;
    db.prepare(`UPDATE reproduction_records SET boar_id=?, mating_date=?, expected_farrowing_date=?, farrowing_date=?, piglets_alive=?, piglets_dead=?, result=?, notes=? WHERE id=?`)
      .run(boar_id || null, mating_date, expected_farrowing_date || null, farrowing_date || null, piglets_alive || 0, piglets_dead || 0, result || null, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reproduction/:id', (req, res) => {
  try { db.prepare('DELETE FROM reproduction_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DEATH API ==========
app.post('/api/pigs/:id/death', (req, res) => {
  try {
    const { death_date, death_cause, notes } = req.body;
    if (!death_date) return res.status(400).json({ error: 'death_date requerido' });
    db.prepare("UPDATE pigs SET status='dead', death_date=?, death_cause=?, notes=COALESCE(?,'') || CHAR(10) || COALESCE(notes,''), updated_at=datetime('now','localtime') WHERE id=?")
      .run(death_date, death_cause || null, notes ? 'Muerte: ' + notes : null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== BATCH REPORTS ==========
app.get('/api/reports/batch/:id', (req, res) => {
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Lote no encontrado' });
    const pigs = db.prepare('SELECT * FROM pigs WHERE batch_id = ? ORDER BY identifier').all(req.params.id);
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(p.purchase_cost),0) as total_purchase,
        COALESCE((SELECT SUM(f.total_cost) FROM feeding_records f JOIN pigs p2 ON f.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_feed,
        COALESCE((SELECT SUM(h.cost) FROM health_records h JOIN pigs p2 ON h.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_health,
        COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN pigs p2 ON e.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_expenses,
        COALESCE((SELECT SUM(s.total_amount) FROM sales s JOIN pigs p2 ON s.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_sales
    `).get(req.params.id, req.params.id, req.params.id, req.params.id);
    res.json({ batch, pigs, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reports/compare-batches', (req, res) => {
  try {
    const { batch_ids } = req.body;
    if (!batch_ids || !batch_ids.length) return res.status(400).json({ error: 'batch_ids requerido' });
    const result = [];
    for (const id of batch_ids) {
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      if (!batch) continue;
      const pigCount = db.prepare('SELECT COUNT(*) as c FROM pigs WHERE batch_id = ?').get(id).c;
      const soldCount = db.prepare("SELECT COUNT(*) as c FROM pigs WHERE batch_id = ? AND status='sold'").get(id).c;
      const deadCount = db.prepare("SELECT COUNT(*) as c FROM pigs WHERE batch_id = ? AND status='dead'").get(id).c;
      const totals = db.prepare(`
        SELECT
          COALESCE(SUM(p.purchase_cost),0) as total_purchase,
          COALESCE((SELECT SUM(f.total_cost) FROM feeding_records f JOIN pigs p2 ON f.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_feed,
          COALESCE((SELECT SUM(h.cost) FROM health_records h JOIN pigs p2 ON h.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_health,
          COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN pigs p2 ON e.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_expenses,
          COALESCE((SELECT SUM(s.total_amount) FROM sales s JOIN pigs p2 ON s.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_sales
      `).get(id, id, id, id);
      result.push({ batch, pigCount, soldCount, deadCount, ...totals });
    }
    res.json(result);
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
      partner_transactions: db.prepare('SELECT * FROM partner_transactions').all(),
      batches: db.prepare('SELECT * FROM batches').all(),
      inventory_categories: db.prepare('SELECT * FROM inventory_categories').all(),
      inventory_items: db.prepare('SELECT * FROM inventory_items').all(),
      inventory_movements: db.prepare('SELECT * FROM inventory_movements').all(),
      daily_logs: db.prepare('SELECT * FROM daily_logs').all(),
      reproduction: db.prepare('SELECT * FROM reproduction_records').all()
    };
    res.json(backup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restore', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.pigs) return res.status(400).json({ error: 'Respaldos inválido' });
    db.exec('PRAGMA foreign_keys=OFF');
    ['reproduction_records', 'inventory_movements', 'inventory_items', 'inventory_categories', 'daily_logs', 'batches', 'partner_transactions', 'partners', 'health_records', 'weight_records', 'sales', 'expenses', 'feeding_records', 'pigs'].forEach(t => {
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
    const insertBatch = db.prepare('INSERT INTO batches (id, name, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    (data.batches || []).forEach(r => insertBatch.run(r.id, r.name, r.start_date, r.notes, r.created_at, r.updated_at));
    const insertInvCat = db.prepare('INSERT INTO inventory_categories (id, name) VALUES (?, ?)');
    (data.inventory_categories || []).forEach(r => insertInvCat.run(r.id, r.name));
    const insertInvItem = db.prepare('INSERT INTO inventory_items (id, name, category_id, current_qty, unit, min_qty, unit_cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.inventory_items || []).forEach(r => insertInvItem.run(r.id, r.name, r.category_id, r.current_qty, r.unit, r.min_qty, r.unit_cost, r.notes, r.created_at, r.updated_at));
    const insertInvMov = db.prepare('INSERT INTO inventory_movements (id, item_id, date, type, quantity, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    (data.inventory_movements || []).forEach(r => insertInvMov.run(r.id, r.item_id, r.date, r.type, r.quantity, r.description, r.created_at));
    const insertLog = db.prepare('INSERT INTO daily_logs (id, date, title, content, created_at) VALUES (?, ?, ?, ?, ?)');
    (data.daily_logs || []).forEach(r => insertLog.run(r.id, r.date, r.title, r.content, r.created_at));
    const insertRepro = db.prepare('INSERT INTO reproduction_records (id, sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.reproduction || []).forEach(r => insertRepro.run(r.id, r.sow_id, r.boar_id, r.mating_date, r.expected_farrowing_date, r.farrowing_date, r.piglets_alive, r.piglets_dead, r.result, r.notes, r.created_at));
    db.exec('PRAGMA foreign_keys=ON');
    res.json({ ok: true, count: { pigs: data.pigs.length, feeding: (data.feeding || []).length, expenses: (data.expenses || []).length, sales: (data.sales || []).length, weight: (data.weight || []).length, health: (data.health || []).length, partners: (data.partners || []).length, batches: (data.batches || []).length, inventory_items: (data.inventory_items || []).length, daily_logs: (data.daily_logs || []).length, reproduction: (data.reproduction || []).length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== START ==========
app.listen(PORT, () => {
  console.log(`🚀 Sistema Cerdos by LOMI corriendo en http://localhost:${PORT}`);
});
