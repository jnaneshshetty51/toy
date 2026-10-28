-- ToyVerse PostgreSQL Migration 001: Initial Schema
-- Direction: UP

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  avatar TEXT,
  rewards_points INTEGER DEFAULT 450,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  sku VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(255) NOT NULL,
  age_group VARCHAR(100) NOT NULL,
  brand VARCHAR(255),
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 10,
  is_featured BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  images_json JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  features_json JSONB DEFAULT '[]',
  specs_json JSONB DEFAULT '{}',
  variants_json JSONB DEFAULT '[]',
  barcode VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_pg_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_pg_products_stock ON products(stock);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  shipping_address_json JSONB NOT NULL DEFAULT '{}',
  subtotal NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  shipping_fee NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Paid',
  status VARCHAR(50) NOT NULL DEFAULT 'Placed',
  shipping_provider VARCHAR(100) DEFAULT 'Delhivery',
  tracking_number VARCHAR(100),
  invoice_number VARCHAR(100),
  idempotency_key VARCHAR(255),
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  refund_amount NUMERIC(10, 2) DEFAULT 0,
  refund_status VARCHAR(50),
  refund_reason TEXT,
  payment_gateway_ref VARCHAR(255),
  is_gift BOOLEAN DEFAULT FALSE,
  gift_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_pg_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  image TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(50) PRIMARY KEY,
  discount_percent INTEGER DEFAULT 0,
  min_spend NUMERIC(10, 2) DEFAULT 0,
  max_discount NUMERIC(10, 2) DEFAULT 0,
  description TEXT,
  free_shipping BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  street TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(100) PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(100),
  user_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  subtitle TEXT,
  link VARCHAR(500),
  background_color VARCHAR(50) DEFAULT '#FF6B6B',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id VARCHAR(100) PRIMARY KEY,
  state VARCHAR(100) NOT NULL,
  standard_fee NUMERIC(10, 2) NOT NULL,
  express_fee NUMERIC(10, 2) NOT NULL,
  free_threshold NUMERIC(10, 2) NOT NULL,
  estimated_days INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS upi_orders (
  id VARCHAR(100) PRIMARY KEY,
  public_ref VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount_paise INTEGER NOT NULL,
  items_json JSONB NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  upi_uri TEXT NOT NULL,
  qr_data_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upi_events (
  id VARCHAR(100) PRIMARY KEY,
  bank_txn_id VARCHAR(255),
  amount_paise INTEGER NOT NULL,
  payer_vpa VARCHAR(255),
  raw_body TEXT,
  matched_ref VARCHAR(20),
  match_layer VARCHAR(50),
  received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(100),
  action VARCHAR(100),
  order_id VARCHAR(100),
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
