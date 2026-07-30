const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, 'cerdos.db'));

db.exec(`PRAGMA journal_mode=WAL`);
db.exec(`PRAGMA foreign_keys=ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pigs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE NOT NULL,
    name TEXT,
    breed TEXT,
    birth_date TEXT,
    purchase_date TEXT,
    purchase_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS feeding_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    food_type TEXT,
    quantity_kg REAL NOT NULL,
    cost_per_kg REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    pig_id INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    pig_id INTEGER,
    buyer_name TEXT,
    quantity_kg REAL,
    price_per_kg REAL,
    total_amount REAL NOT NULL,
    sale_type TEXT DEFAULT 'pig',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS weight_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    record_type TEXT NOT NULL,
    description TEXT,
    medicine TEXT,
    cost REAL DEFAULT 0,
    next_due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );
`);

// Create indexes
const indexSqls = [
  'CREATE INDEX IF NOT EXISTS idx_feeding_pig ON feeding_records(pig_id)',
  'CREATE INDEX IF NOT EXISTS idx_feeding_date ON feeding_records(date)',
  'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
  'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)',
  'CREATE INDEX IF NOT EXISTS idx_weight_pig ON weight_records(pig_id)',
  'CREATE INDEX IF NOT EXISTS idx_health_pig ON health_records(pig_id)',
];
indexSqls.forEach(sql => db.exec(sql));

module.exports = db;
