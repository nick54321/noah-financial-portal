const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'portal.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for performance/safety
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    wallet_address TEXT,
    wallet_type TEXT,
    auth_nonce TEXT,
    noah_customer_id TEXT,
    noah_onboarding_status TEXT DEFAULT 'not_started',
    role TEXT DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    price_usd REAL NOT NULL,
    status TEXT NOT NULL,
    start_date TEXT NOT NULL,
    expiration_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_ref TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pricing_config (
    plan_type TEXT PRIMARY KEY,
    price_usd REAL NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS virtual_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    noah_account_id TEXT,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    account_number TEXT,
    routing_number TEXT,
    bank_name TEXT,
    beneficiary_name TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS beneficiaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    noah_payment_method_id TEXT,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    bank_name TEXT,
    account_identifier TEXT NOT NULL,
    routing_identifier TEXT,
    type TEXT DEFAULT 'Individual',
    country TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    noah_transaction_id TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sub_status TEXT,
    from_currency TEXT NOT NULL,
    from_amount REAL NOT NULL,
    to_currency TEXT NOT NULL,
    to_amount REAL NOT NULL,
    fee_amount REAL DEFAULT 0,
    exchange_rate REAL,
    destination_address TEXT,
    beneficiary_id TEXT,
    details_json TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    event_type TEXT NOT NULL,
    event_version TEXT,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed',
    error_message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );
`);

// Seed default pricing if empty
const countPricing = db.prepare('SELECT COUNT(*) as count FROM pricing_config').get();
if (countPricing.count === 0) {
  const insertPricing = db.prepare(`
    INSERT INTO pricing_config (plan_type, price_usd, name, description, is_active, updated_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  const now = new Date().toISOString();
  insertPricing.run('USD', 75.00, 'USD IBAN', 'Provision and access USD IBAN banking services.', now);
  insertPricing.run('EUR', 75.00, 'EUR IBAN', 'Provision and access EUR IBAN banking services.', now);
  insertPricing.run('COMBO', 150.00, 'USD + EUR Combo', 'Full access to both USD and EUR IBAN banking services.', now);
}

module.exports = db;
