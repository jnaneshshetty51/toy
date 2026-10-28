-- ToyVerse SQLite Migration 001: Initial Schema
-- Direction: UP

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  avatar TEXT,
  rewards_points INTEGER DEFAULT 450,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  age_group TEXT NOT NULL,
  brand TEXT,
  price REAL NOT NULL,
  original_price REAL,
  rating REAL DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 10,
  is_featured INTEGER DEFAULT 0,
  is_bestseller INTEGER DEFAULT 0,
  is_new_arrival INTEGER DEFAULT 0,
  images_json TEXT NOT NULL,
  description TEXT,
  features_json TEXT,
  specs_json TEXT,
  variants_json TEXT,
  barcode TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'Paid',
  status TEXT NOT NULL DEFAULT 'Placed',
  shipping_provider TEXT DEFAULT 'Delhivery',
  tracking_number TEXT,
  invoice_number TEXT,
  idempotency_key TEXT,
  tax_amount REAL DEFAULT 0,
  refund_amount REAL DEFAULT 0,
  refund_status TEXT,
  refund_reason TEXT,
  payment_gateway_ref TEXT,
  is_gift INTEGER DEFAULT 0,
  gift_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  image TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_percent INTEGER DEFAULT 0,
  min_spend REAL DEFAULT 0,
  max_discount REAL DEFAULT 0,
  description TEXT,
  free_shipping INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  is_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  link TEXT,
  background_color TEXT DEFAULT '#FF6B6B',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  standard_fee REAL NOT NULL,
  express_fee REAL NOT NULL,
  free_threshold REAL NOT NULL,
  estimated_days INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS upi_orders (
  id TEXT PRIMARY KEY,
  public_ref TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  upi_uri TEXT NOT NULL,
  qr_data_url TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upi_events (
  id TEXT PRIMARY KEY,
  bank_txn_id TEXT,
  amount_paise INTEGER NOT NULL,
  payer_vpa TEXT,
  raw_body TEXT,
  matched_ref TEXT,
  match_layer TEXT,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT,
  order_id TEXT,
  meta_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
