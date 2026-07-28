/**
 * Database Connection Module for TrypheneMart
 * Configured for MySQL, with automatic local fallback for class project evaluation
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'tryphenemart_db';

let pool = null;
let useSQLite = false;
let sqliteDb = null;

async function initDB() {
  try {
    // Attempt MySQL connection
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ Connected to MySQL Database:', DB_NAME);
  } catch (err) {
    console.warn('⚠️ MySQL connection not available, falling back to SQLite for local execution.');
    useSQLite = true;

    const dbPath = path.join(__dirname, '..', 'tryphenemart_local.db');
    sqliteDb = new sqlite3.Database(dbPath);

    // Initialize SQLite schema & test data
    setupSQLiteSchema(sqliteDb);
  }
}

function setupSQLiteSchema(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍎'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      price_unit TEXT DEFAULT 'per item',
      image_url TEXT NOT NULL,
      is_veg INTEGER DEFAULT 1,
      brand TEXT DEFAULT 'TrypheneFresh',
      rating REAL DEFAULT 4.5,
      review_count INTEGER DEFAULT 0,
      description TEXT,
      in_stock INTEGER DEFAULT 1,
      is_promo INTEGER DEFAULT 0,
      old_price REAL DEFAULT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      subtotal REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    )`);

    // Check if products exist, seed if empty
    db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
      if (!err && row.count === 0) {
        console.log('🌱 Seeding local database with products...');
        const productsList = require('../produits.js');
        const stmt = db.prepare(`INSERT INTO products (id, category_id, name, price, price_unit, image_url, is_veg, brand, rating, review_count, description, in_stock, is_promo, old_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        productsList.forEach(p => {
          let catId = 1;
          if (p.category === 'dairy-bakery') catId = 2;
          if (p.category === 'snacks') catId = 3;
          if (p.category === 'beverages') catId = 4;
          if (p.category === 'household') catId = 5;

          stmt.run(p.id, catId, p.name, p.price, p.priceUnit, p.image, p.isVeg ? 1 : 0, p.brand, p.rating, p.reviewCount, p.description, p.inStock ? 1 : 0, p.isPromo ? 1 : 0, p.oldPrice || null);
        });
        stmt.finalize();
      }
    });
  });
}

// Database Query Wrapper
async function query(sql, params = []) {
  if (!useSQLite && pool) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

// Start DB connection
initDB();

module.exports = {
  query
};
