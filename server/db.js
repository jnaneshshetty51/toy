import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Production Database Configuration
export function isPostgres() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_HOST);
}

let pgPool = null;
export function getPool() {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    pgPool = new Pool(connectionString ? {
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    } : {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'toyverse'
    });
  }
  return pgPool;
}

const DB_PATH = path.join(__dirname, 'toyverse.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & performance optimizations for high concurrency
db.exec('PRAGMA busy_timeout = 10000;');
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (e) {
  // WAL mode already established by active connection
}
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA cache_size = -64000;'); // 64MB memory cache
db.exec('PRAGMA temp_store = MEMORY;');

// Initialize Tables
export function initDatabase() {
  db.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      tracking_number TEXT,
      is_gift INTEGER DEFAULT 0,
      gift_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

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

    CREATE TABLE IF NOT EXISTS order_emails (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      body_text TEXT,
      status TEXT NOT NULL DEFAULT 'DELIVERED',
      provider TEXT NOT NULL DEFAULT 'ToyVerse Transactional Gateway',
      dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      label TEXT,
      full_name TEXT NOT NULL,
      street TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      phone TEXT,
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      cta_text TEXT,
      cta_link TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Zero-Fee Autonomous UPI Payment Engine & Reconciler
    CREATE TABLE IF NOT EXISTS upi_orders (
      id TEXT PRIMARY KEY,
      public_ref TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      amount_paise INTEGER NOT NULL,
      items_json TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      upi_uri TEXT,
      qr_data_url TEXT,
      expires_at DATETIME NOT NULL,
      paid_at DATETIME,
      paid_amount_paise INTEGER,
      confirmed_by TEXT,
      store_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      parsed_amount_paise INTEGER,
      parsed_ref TEXT,
      parsed_vpa TEXT,
      bank_txn_id TEXT,
      matched_order_id TEXT,
      match_status TEXT NOT NULL DEFAULT 'unmatched',
      event_hash TEXT UNIQUE,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      order_id TEXT,
      meta_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forwarder_heartbeat (
      id TEXT PRIMARY KEY,
      device_name TEXT DEFAULT 'Android Pixel 4a (Bank SIM 1)',
      battery_level INTEGER DEFAULT 98,
      is_charging INTEGER DEFAULT 1,
      network_type TEXT DEFAULT 'WiFi',
      ip_address TEXT,
      last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'healthy'
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_age ON products(age_group);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
    CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
    CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products(is_bestseller);
    CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_upi_orders_status ON upi_orders(status);
    CREATE INDEX IF NOT EXISTS idx_upi_orders_ref ON upi_orders(public_ref);
    CREATE INDEX IF NOT EXISTS idx_upi_orders_created ON upi_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_events_hash ON payment_events(event_hash);
    CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events(match_status);
  `);

  // Seed default forwarder heartbeat record if empty
  try {
    const hb = db.prepare('SELECT id FROM forwarder_heartbeat WHERE id = ?').get('forwarder-primary');
    if (!hb) {
      db.prepare(`
        INSERT INTO forwarder_heartbeat (id, device_name, battery_level, is_charging, network_type, last_ping, status)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
      `).run('forwarder-primary', 'Android Pixel 4a (Bank SIM 1)', 98, 1, 'WiFi (JioFiber_5G)', 'healthy');
    }
  } catch (err) {
    console.error('Error seeding forwarder heartbeat:', err);
  }

  try {
    db.exec('ALTER TABLE products ADD COLUMN variants_json TEXT;');
  } catch (e) {
    // Column already exists or already migrated
  }

  try {
    db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT;');
    db.exec('ALTER TABLE users ADD COLUMN reset_expires INTEGER;');
    db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;');
    db.exec('ALTER TABLE users ADD COLUMN verification_otp TEXT;');
    db.exec('ALTER TABLE users ADD COLUMN verification_expires INTEGER;');
  } catch (e) {
    // Columns already exist
  }

  try {
    db.exec('ALTER TABLE orders ADD COLUMN idempotency_key TEXT;');
    db.exec('ALTER TABLE orders ADD COLUMN tax_amount REAL DEFAULT 0;');
    db.exec('ALTER TABLE orders ADD COLUMN shipping_provider TEXT DEFAULT "Delhivery";');
    db.exec('ALTER TABLE orders ADD COLUMN invoice_number TEXT;');
    db.exec('ALTER TABLE orders ADD COLUMN refund_amount REAL DEFAULT 0;');
    db.exec('ALTER TABLE orders ADD COLUMN refund_status TEXT;');
    db.exec('ALTER TABLE orders ADD COLUMN refund_reason TEXT;');
    db.exec('ALTER TABLE orders ADD COLUMN payment_gateway_ref TEXT;');
  } catch (e) {
    // Order columns already exist
  }

  seedData();
}

// Seed initial users, products with INR currency, coupons & addresses
function seedData() {
  // 1. Seed Users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
    const customerPasswordHash = bcrypt.hashSync('Customer@123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, avatar, rewards_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin
    insertUser.run(
      'user-admin-1',
      'ToyVerse Store Admin',
      'admin@toyverse.in',
      adminPasswordHash,
      '+91 98765 43210',
      'admin',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      1200
    );

    // Customer
    insertUser.run(
      'user-cust-1',
      'Aarav Sharma',
      'aarav.sharma@example.com',
      customerPasswordHash,
      '+91 98450 12345',
      'customer',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      580
    );
  }

  // 2. Seed Coupons if empty
  const couponCount = db.prepare('SELECT COUNT(*) as count FROM coupons').get().count;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(`
      INSERT INTO coupons (code, discount_percent, min_spend, max_discount, description, free_shipping, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertCoupon.run('DIWALI20', 20, 999, 1000, 'Diwali Festival Wonder: 20% OFF on orders above ₹999', 0, 1);
    insertCoupon.run('FIRST10', 10, 499, 500, 'Welcome Joy: 10% OFF on your first purchase above ₹499', 0, 1);
    insertCoupon.run('FREESHIP', 0, 0, 0, 'Free Priority Express Delivery across India', 1, 1);
    insertCoupon.run('TOYVERSE', 15, 799, 600, 'Flat 15% OFF storewide for Club Members', 0, 1);
  }

  // 3. Seed Products if empty
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, name, sku, category, age_group, brand, price, original_price, rating, reviews_count,
        stock, is_featured, is_bestseller, is_new_arrival, images_json, description, features_json, specs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const TOYS_INR = [
      {
        id: "toy-1",
        name: "CyberBot 3000 Programmable STEM Robot",
        sku: "STEM-ROB-001",
        category: "STEM & Learning",
        age_group: "9-12 yrs",
        brand: "RoboMind India",
        price: 4999,
        original_price: 6499,
        rating: 4.9,
        reviews_count: 128,
        stock: 24,
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Empower your young engineer with CyberBot 3000! Features block-based drag-and-drop coding in English & Hindi, ultrasonic obstacle sensors, interactive RGB emotion eyes, and rechargeable Li-ion battery.",
        features_json: JSON.stringify([
          "App-enabled programming via Bluetooth (iOS & Android)",
          "Ultrasonic obstacle avoidance and sound tracking sensors",
          "BIS certified high-grade ABS construction",
          "Includes 20 step-by-step coding mission challenge cards"
        ]),
        specs_json: JSON.stringify({
          dimensions: "21.5 x 15.5 x 19.8 cm",
          weight: "750 grams",
          battery: "Built-in rechargeable Li-ion (Type-C cable included)",
          safety: "BIS Certified (IS 9873), Non-toxic recyclable ABS"
        })
      },
      {
        id: "toy-2",
        name: "Galactic Explorer ISRO Inspired Rocket & Launch Pad",
        sku: "LEGO-SPC-002",
        category: "LEGO & Building",
        age_group: "6-8 yrs",
        brand: "BrickWorks India",
        price: 3499,
        original_price: 4499,
        rating: 4.8,
        reviews_count: 94,
        stock: 18,
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Celebrate space exploration! This 680-piece building set includes a multistage rocket, mobile gantry crane, satellite deployment bay, and 3 astronaut minifigures.",
        features_json: JSON.stringify([
          "680 high-precision interlocking durable bricks",
          "Working launch gantry crane with magnetic cargo clasp",
          "Opening satellite bay with solar panels",
          "100% compatible with all leading building brick brands"
        ]),
        specs_json: JSON.stringify({
          dimensions: "36 x 24 x 45 cm (assembled)",
          weight: "1.1 kg",
          safety: "BIS standard compliant, lead-free"
        })
      },
      {
        id: "toy-3",
        name: "Ultra-Fluffy Cuddle Cloud Teddy Bear",
        sku: "PLUSH-TED-003",
        category: "Plush & Soft Toys",
        age_group: "0-2 yrs",
        brand: "HuggyFriends",
        price: 1299,
        original_price: 1699,
        rating: 4.9,
        reviews_count: 215,
        stock: 45,
        is_featured: 1,
        is_bestseller: 0,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "The ultimate cozy companion for little ones. Crafted with hypoallergenic microfiber fleece, embroidered child-safe facial details, and washable fabric.",
        features_json: JSON.stringify([
          "100% hypoallergenic organic microfiber filling",
          "Zero plastic button choking hazards (embroidered eyes)",
          "Machine washable on gentle cycle",
          "Perfect gift for newborns, infants, and toddlers"
        ]),
        specs_json: JSON.stringify({
          dimensions: "40 cm height",
          weight: "380 grams",
          safety: "Certified baby-safe 0+ months, OEKO-TEX certified"
        })
      },
      {
        id: "toy-4",
        name: "TurboDrift 4WD All-Terrain High-Speed Stunt RC Car",
        sku: "RC-CAR-004",
        category: "RC Vehicles & Drones",
        age_group: "9-12 yrs",
        brand: "SpeedX India",
        price: 2499,
        original_price: 3299,
        rating: 4.7,
        reviews_count: 88,
        stock: 12,
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 1,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Perform 360-degree flips, dual-side driving, and high-speed drift stunts! Features dual high-torque motors, off-road monster wheels, and bright LED headlamps.",
        features_json: JSON.stringify([
          "2.4GHz interference-free long-range remote (up to 50 meters)",
          "Double-sided stunt driving & 360° spin stunts",
          "Two rechargeable battery packs included for 50 mins playtime",
          "Heavy-duty crashproof bumper"
        ]),
        specs_json: JSON.stringify({
          dimensions: "18 x 16 x 8 cm",
          weight: "580 grams",
          battery: "2x 3.7V 800mAh Li-ion battery pack"
        })
      },
      {
        id: "toy-5",
        name: "Kingdoms of Bharat Grand Strategy Board Game",
        sku: "GAME-BRD-005",
        category: "Board Games & Puzzles",
        age_group: "12+ yrs",
        brand: "MythicPlay India",
        price: 1999,
        original_price: 2499,
        rating: 4.9,
        reviews_count: 76,
        stock: 30,
        is_featured: 0,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Engage in medieval historical strategy across ancient kingdoms. Collect spices, construct forts, trade rare gemstones, and negotiate alliances for 2-5 players.",
        features_json: JSON.stringify([
          "Modular double-sided kingdom map tiles",
          "75 handcrafted miniature figures and brass-look coins",
          "45 to 75 minutes engaging playtime per round",
          "Rulebook available in English and Hindi"
        ]),
        specs_json: JSON.stringify({
          dimensions: "30 x 30 x 7 cm",
          weight: "1.4 kg",
          players: "2 - 5 Players"
        })
      },
      {
        id: "toy-6",
        name: "MagnaTiles 3D Magnetic Castle & Architecture Set",
        sku: "STEM-MAG-006",
        category: "STEM & Learning",
        age_group: "3-5 yrs",
        brand: "ShapeCraft",
        price: 2799,
        original_price: 3499,
        rating: 4.8,
        reviews_count: 142,
        stock: 22,
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Spark architectural creativity with 100 translucent, jewel-toned magnetic tiles. Children develop spatial geometry, color balance, and engineering intuition.",
        features_json: JSON.stringify([
          "100 magnetic pieces including towers, arches, and stairways",
          "Reinforced ultrasonic welded ABS rivets for magnet safety",
          "Vibrant light-catcher translucent jewel colors",
          "Compatible with other major magnetic block brands"
        ]),
        specs_json: JSON.stringify({
          dimensions: "30 x 22 x 9 cm",
          weight: "1.6 kg",
          safety: "BIS & EN71 compliant, BPA and phthalate-free"
        })
      },
      {
        id: "toy-7",
        name: "Avian Garuda Mechanical Dragon Action Figure",
        sku: "ACT-DRG-007",
        category: "Action Figures & Heroes",
        age_group: "6-8 yrs",
        brand: "TitanForce India",
        price: 1799,
        original_price: 2199,
        rating: 4.6,
        reviews_count: 65,
        stock: 15,
        is_featured: 0,
        is_bestseller: 0,
        is_new_arrival: 1,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Mythical warrior companion with 18 points of articulation, dual flapping wings with spring trigger, glowing LED ruby eyes, and sound effects.",
        features_json: JSON.stringify([
          "18 points of poseable articulation",
          "40 cm flapping wingspan mechanism",
          "Sound and light roar effects",
          "Includes detachable hero armor figure"
        ]),
        specs_json: JSON.stringify({
          dimensions: "35 x 40 x 18 cm",
          weight: "650 grams",
          battery: "3x AAA batteries (included)"
        })
      },
      {
        id: "toy-8",
        name: "Wooden Sensory Musical Activity Cube",
        sku: "TOD-CUB-008",
        category: "STEM & Learning",
        age_group: "0-2 yrs",
        brand: "TinyTots India",
        price: 1899,
        original_price: 2399,
        rating: 4.9,
        reviews_count: 160,
        stock: 28,
        is_featured: 0,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Natural organic beechwood activity cube with 6 panels: musical xylophone, bead maze, shape sorter, spinning gears, clock dial, and tactile discovery flaps.",
        features_json: JSON.stringify([
          "Solid pinewood & beechwood with non-toxic water-based paints",
          "Flips inside out for compact travel storage",
          "Promotes sensory and motor skills development",
          "Smooth splinter-free rounded finish"
        ]),
        specs_json: JSON.stringify({
          dimensions: "20 x 20 x 35 cm",
          weight: "1.3 kg",
          safety: "100% natural wood, lead-free BIS certified"
        })
      },
      {
        id: "toy-9",
        name: "Royal Heritage Handcrafted Wooden Dollhouse",
        sku: "DOL-VIL-009",
        category: "Dolls & Playsets",
        age_group: "3-5 yrs",
        brand: "Lilliput Crafts",
        price: 5499,
        original_price: 6999,
        rating: 4.8,
        reviews_count: 52,
        stock: 9,
        is_featured: 1,
        is_bestseller: 0,
        is_new_arrival: 1,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "A 3-story heritage wooden dollhouse featuring 5 decorated rooms, miniature balcony, and 18 handcrafted wooden furniture accessories.",
        features_json: JSON.stringify([
          "3 stories, 5 rooms, outdoor balcony terrace",
          "Includes 18 pieces of wooden furniture and 4 doll figures",
          "Open-front design for easy cooperative play",
          "Engineered solid pinewood frame"
        ]),
        specs_json: JSON.stringify({
          dimensions: "60 x 30 x 80 cm",
          weight: "5.5 kg",
          safety: "Non-toxic paint, BIS child-safe certification"
        })
      },
      {
        id: "toy-10",
        name: "Himalayan Crystal Geode Excavation Science Kit",
        sku: "STEM-GEO-010",
        category: "STEM & Learning",
        age_group: "6-8 yrs",
        brand: "GeoLab India",
        price: 1199,
        original_price: 1499,
        rating: 4.7,
        reviews_count: 110,
        stock: 35,
        is_featured: 0,
        is_bestseller: 0,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Break open genuine mineral geodes to uncover quartz and amethyst crystal formations! Includes protective goggles, wooden mallet, chisel, and full-color learning guide.",
        features_json: JSON.stringify([
          "10 genuine natural geode specimens",
          "Child-safe protective goggles and digging tools",
          "2 display stands for showcasing favorite crystal halves",
          "Full color geology booklet"
        ]),
        specs_json: JSON.stringify({
          dimensions: "25 x 20 x 8 cm",
          weight: "950 grams",
          safety: "Includes safety goggles, adult supervision recommended"
        })
      },
      {
        id: "toy-11",
        name: "SkyPhantom HD Camera Drone for Beginners",
        sku: "RC-DRN-011",
        category: "RC Vehicles & Drones",
        age_group: "12+ yrs",
        brand: "SpeedX India",
        price: 4499,
        original_price: 5999,
        rating: 4.6,
        reviews_count: 73,
        stock: 8,
        is_featured: 1,
        is_bestseller: 0,
        is_new_arrival: 1,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Capture aerial views with 1080p FPV live video streaming to phone. Features altitude lock, one-key takeoff/landing, and propeller guard rings.",
        features_json: JSON.stringify([
          "1080p HD camera with Wi-Fi transmission",
          "Altitude lock & optical flow positioning",
          "One-key takeoff, landing & emergency return",
          "Nano-weight design under 250g (DGCA compliant in India)"
        ]),
        specs_json: JSON.stringify({
          dimensions: "25 x 25 x 6 cm (unfolded)",
          weight: "190 grams",
          flightTime: "24 minutes total (2 modular batteries)"
        })
      },
      {
        id: "toy-12",
        name: "Rangoli & Artist 142-Piece Deluxe Art Studio Case",
        sku: "ART-CSE-012",
        category: "Arts & Crafts",
        age_group: "6-8 yrs",
        brand: "ArtisanJunior India",
        price: 1699,
        original_price: 2199,
        rating: 4.9,
        reviews_count: 140,
        stock: 40,
        is_featured: 0,
        is_bestseller: 1,
        is_new_arrival: 0,
        images_json: JSON.stringify([
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1580481077197-9b294d1377cf?auto=format&fit=crop&w=800&q=80"
        ]),
        description: "Unleash infinite creativity with oil pastels, colored pencils, watercolor cakes, acrylic tubes, brushes, sharpener, and sketch pads in a metallic folding case.",
        features_json: JSON.stringify([
          "142 premium artistic tools arranged in pop-up tiered trays",
          "Washable, non-toxic pigments certified safe for young kids",
          "Aluminum carrying briefcase with secure latches",
          "Includes 2 mixed-media drawing pads"
        ]),
        specs_json: JSON.stringify({
          dimensions: "38 x 24 x 9 cm",
          weight: "1.9 kg",
          safety: "BIS and ASTM D-4236 non-toxic certified"
        })
      }
    ];

    for (const t of TOYS_INR) {
      insertProd.run(
        t.id, t.name, t.sku, t.category, t.age_group, t.brand, t.price, t.original_price,
        t.rating, t.reviews_count, t.stock, t.is_featured, t.is_bestseller, t.is_new_arrival,
        t.images_json, t.description, t.features_json, t.specs_json
      );
    }
  }

  // 4. Seed Addresses for default customer
  const addrCount = db.prepare('SELECT COUNT(*) as count FROM addresses').get().count;
  if (addrCount === 0) {
    const insertAddr = db.prepare(`
      INSERT INTO addresses (id, user_id, label, full_name, street, city, state, pincode, phone, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAddr.run(
      'addr-1',
      'user-cust-1',
      'Home (Bengaluru)',
      'Aarav Sharma',
      '#42, 12th Main, 4th Block, Koramangala',
      'Bengaluru',
      'Karnataka',
      '560034',
      '+91 98450 12345',
      1
    );

    insertAddr.run(
      'addr-2',
      'user-cust-1',
      'Office (Indiranagar)',
      'Aarav Sharma',
      'Level 4, Innovate Tech Park, 100 Feet Road',
      'Bengaluru',
      'Karnataka',
      '560038',
      '+91 98450 12345',
      0
    );
  }

  // 5. Seed Initial Orders if empty
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (ordersCount === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, customer_name, customer_email, customer_phone, shipping_address_json,
        subtotal, discount, shipping_fee, total, payment_method, payment_status, status, tracking_number, is_gift, gift_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Order 1
    insertOrder.run(
      'ORD-IN-8921',
      'user-cust-1',
      'Aarav Sharma',
      'aarav.sharma@example.com',
      '+91 98450 12345',
      JSON.stringify({
        address: '#42, 12th Main, 4th Block, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        country: 'India'
      }),
      6298,
      1000,
      0,
      5298,
      'UPI (Google Pay)',
      'Paid',
      'Delivered',
      'DTDC-IN-9948201',
      1,
      'Happy 10th Birthday Veer! Love, Chacha'
    );
    insertItem.run('ORD-IN-8921', 'toy-1', 'CyberBot 3000 Programmable STEM Robot', 4999, 1, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=400&q=80');
    insertItem.run('ORD-IN-8921', 'toy-3', 'Ultra-Fluffy Cuddle Cloud Teddy Bear', 1299, 1, 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=400&q=80');

    // Order 2
    insertOrder.run(
      'ORD-IN-8922',
      'user-cust-1',
      'Priya Nair',
      'priya.nair@example.com',
      '+91 98210 98765',
      JSON.stringify({
        address: 'Flat 502, Sea Green Apts, Worli Sea Face',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400018',
        country: 'India'
      }),
      3499,
      0,
      0,
      3499,
      'UPI (PhonePe)',
      'Paid',
      'Shipped',
      'BLUE-DART-8820194',
      0,
      null
    );
    insertItem.run('ORD-IN-8922', 'toy-2', 'Galactic Explorer ISRO Inspired Rocket & Launch Pad', 3499, 1, 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=400&q=80');

    // Order 3
    insertOrder.run(
      'ORD-IN-8923',
      'user-cust-1',
      'Vikram Patel',
      'vikram.p@example.com',
      '+91 99090 54321',
      JSON.stringify({
        address: 'B-14, Shanti Niketan, Near Vastrapur Lake',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        country: 'India'
      }),
      2499,
      250,
      0,
      2249,
      'Cash on Delivery (COD)',
      'Pending',
      'Processing',
      'DELHIVERY-7719283',
      0,
      null
    );
    insertItem.run('ORD-IN-8923', 'toy-4', 'TurboDrift 4WD All-Terrain High-Speed Stunt RC Car', 2499, 1, 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=400&q=80');
  }

  // 6. Seed Reviews
  const reviewsCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  if (reviewsCount === 0) {
    const prods = db.prepare('SELECT id FROM products LIMIT 3').all();
    if (prods.length > 0) {
      const p1 = prods[0]?.id;
      const p2 = prods[1]?.id || p1;
      const p3 = prods[2]?.id || p1;

      const insertRev = db.prepare(`
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertRev.run('rev-1', p1, 'user-cust-1', 'Ananya K. (Bengaluru)', 5, 'My 10-year-old son hasn’t put this down! Very intuitive and educational.', 1);
      insertRev.run('rev-2', p1, null, 'Rohan Mehta (Mumbai)', 5, 'Superb build quality. Packaging was top-notch with festive gift wrapping.', 1);
      insertRev.run('rev-3', p2, 'user-cust-1', 'Vikram S. (Hyderabad)', 5, 'Assembly was fun and engaging! High quality materials and child-safe.', 1);
      insertRev.run('rev-4', p3, null, 'Sneha Joshi (Pune)', 5, 'Incredibly fun and durable. Highly recommended for kids of all ages.', 1);
    }
  }
}

export function logAudit(actor, action, targetId = null, meta = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (actor, action, order_id, meta_json)
      VALUES (?, ?, ?, ?)
    `).run(
      actor || 'admin',
      action,
      targetId ? String(targetId) : null,
      typeof meta === 'string' ? meta : JSON.stringify(meta)
    );
  } catch (e) {
    console.warn('Failed to record audit log:', e.message);
  }
}

export default db;
