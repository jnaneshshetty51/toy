import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase } from './db.js';

// Route handlers
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import addressRoutes from './routes/addresses.js';
import wishlistRoutes from './routes/wishlist.js';
import statsRoutes from './routes/stats.js';
import paymentRoutes from './routes/payments.js';
import operationsRoutes from './routes/operations.js';
import shippingRoutes from './routes/shipping.js';
import upiRoutes from './routes/upi.js';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Database schema and seeds
initDatabase();

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-Memory Sliding Window Rate Limiting
const ipRequestCounts = new Map();
const authRequestCounts = new Map();

function generalRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;

  let client = ipRequestCounts.get(ip);
  if (!client || now - client.startTime > windowMs) {
    client = { count: 1, startTime: now };
  } else {
    client.count++;
  }
  ipRequestCounts.set(ip, client);

  res.setHeader('X-RateLimit-Limit', '200');
  res.setHeader('X-RateLimit-Remaining', Math.max(0, 200 - client.count));

  if (client.count > 200) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please retry after a brief pause.',
      retryAfterSeconds: Math.ceil((windowMs - (now - client.startTime)) / 1000)
    });
  }
  next();
}

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;

  let client = authRequestCounts.get(ip);
  if (!client || now - client.startTime > windowMs) {
    client = { count: 1, startTime: now };
  } else {
    client.count++;
  }
  authRequestCounts.set(ip, client);

  const maxAttempts = (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') ? 500 : 50;
  if (client.count > maxAttempts) {
    return res.status(429).json({
      error: 'Security alert: Too many authentication attempts from this IP. Please wait 60 seconds.'
    });
  }
  next();
}

app.use(generalRateLimiter);

// High-Precision Performance & Slow Query / Request Monitoring (Req 118)
const slowRequestsLog = [];
let totalRequestsHandled = 0;
const latencySamples = [];

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  totalRequestsHandled++;

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    
    latencySamples.push(durationMs);
    if (latencySamples.length > 500) latencySamples.shift();

    if (durationMs > 150 && !req.path.startsWith('/dist/')) {
      const entry = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        timestamp: new Date().toISOString()
      };
      slowRequestsLog.push(entry);
      if (slowRequestsLog.length > 100) slowRequestsLog.shift();
      console.warn(`[SLOW REQ ALERT] ${req.method} ${req.path} took ${entry.durationMs}ms`);
    }
  });
  next();
});

// Request logging in development
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Health check & Service Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    store: 'ToyVerse India',
    currency: 'INR (₹)',
    timestamp: new Date().toISOString()
  });
});

// System & Performance Metrics (Req 118)
app.get(['/api/system/performance', '/api/system/metrics'], (req, res) => {
  const mem = process.memoryUsage();
  
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const p50 = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100 : 0;
  const p95 = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100 : 0;
  const p99 = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100 : 0;

  let dbStats = {
    engine: 'SQLite (Native node:sqlite WAL)',
    cacheSize: '64MB',
    synchronous: 'NORMAL',
    journalMode: 'WAL'
  };
  try {
    const pageCount = db.prepare('PRAGMA page_count;').get();
    const pageSize = db.prepare('PRAGMA page_size;').get();
    dbStats.totalPages = pageCount?.page_count;
    dbStats.pageSizeBytes = pageSize?.page_size;
    dbStats.dbSizeBytes = (pageCount?.page_count || 0) * (pageSize?.page_size || 4096);
  } catch {}

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'operational',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memoryUsageMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024)
    },
    performance: {
      totalRequestsHandled,
      slowRequestsCount: slowRequestsLog.length,
      latencyMs: {
        p50,
        p95,
        p99
      },
      slowThresholdMs: 150,
      recentSlowRequests: slowRequestsLog.slice(-10)
    },
    database: dbStats,
    security: {
      headersEnabled: true,
      rateLimitingActive: true,
      authProtectionActive: true,
      sqlInjectionProtection: 'Prepared Parameterized Statements'
    }
  });
});

// Real User Monitoring (RUM) Core Web Vitals Collector
const vitalsLog = [];
app.post('/api/analytics/vitals', (req, res) => {
  const { metric, value, rating, url } = req.body;
  if (metric && value !== undefined) {
    vitalsLog.push({
      metric,
      value: Math.round(value * 100) / 100,
      rating: rating || 'good',
      url: url || '/',
      recordedAt: new Date().toISOString()
    });
    if (vitalsLog.length > 300) vitalsLog.shift();
  }
  res.json({ received: true });
});

app.get('/api/analytics/vitals', (req, res) => {
  res.json({
    recordedVitalsCount: vitalsLog.length,
    recent: vitalsLog.slice(-15)
  });
});

// Robots.txt Indexing Directives (SEO)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /shop
Allow: /product/
Allow: /sitemap.xml

# Protected administrative & authenticated routes
Disallow: /admin/
Disallow: /admin
Disallow: /account/
Disallow: /account
Disallow: /checkout/
Disallow: /checkout
Disallow: /api/

# Host and XML Sitemap Reference
Host: https://toyverse.in
Sitemap: https://toyverse.in/sitemap.xml
`);
});

// XML Sitemap Generation (SEO)
app.get('/sitemap.xml', (req, res) => {
  try {
    const products = db.prepare('SELECT id, created_at FROM products').all();
    const categoryRows = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''").all();
    const categories = categoryRows.map(r => r.category);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>https://toyverse.in/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>https://toyverse.in/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>https://toyverse.in/cart</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>\n`;

    categories.forEach(cat => {
      xml += `  <url><loc>https://toyverse.in/shop?category=${encodeURIComponent(cat)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    products.forEach(p => {
      const mod = p.created_at ? p.created_at.split('T')[0].split(' ')[0] : '2026-10-17';
      xml += `  <url><loc>https://toyverse.in/product/${p.id}</loc><lastmod>${mod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap:', err);
    res.status(500).send(`Error generating sitemap: ${err.message}`);
  }
});

// API Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use(['/api/admin/stats', '/api/stats'], statsRoutes);
app.use(['/api/admin/operations', '/api/operations'], operationsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/webhooks', upiRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

// Serve static frontend assets if dist exists (Production Standalone Mode)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Content-Hashed Immutable Production Assets (Req 114 & 117)
      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
        res.setHeader('X-CDN-Cache', 'HIT-ORIGIN');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));

  // Client-side SPA routing fallback (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/robots.txt' && req.path !== '/sitemap.xml') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Please upload files under 50MB.' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 ToyVerse Backend Server running on http://localhost:${PORT}`);
  console.log(`✨ Currency: Indian Rupee (INR ₹) | Database: SQLite (Native WAL)`);
  if (fs.existsSync(distPath)) {
    console.log(`📦 Serving production build from ${distPath}`);
  }
});

// Graceful Shutdown Handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed cleanly');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed cleanly');
    process.exit(0);
  });
});

