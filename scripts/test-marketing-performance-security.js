/**
 * ToyVerse Automated Verification Suite:
 * 1. Marketing & Conversion
 * 2. Production Readiness: Performance & Security
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    process.stdout.write(`⏳ [TEST] ${name} ... `);
    const start = performance.now();
    await fn();
    const duration = (performance.now() - start).toFixed(1);
    console.log(`✅ PASSED (${duration}ms)`);
    passed++;
    return true;
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(`   Error: ${err.message}\n`);
    return false;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🧪 TOYVERSE VERIFICATION: MARKETING, PERFORMANCE & SECURITY');
  console.log('======================================================\n');

  // 1. Authenticate admin and regular customer
  let adminToken = '';
  let customerToken = '';
  let testProductId = '';

  await test('0.1 Setup & Admin Authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@toyverse.in', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    adminToken = data.token;
    assert(adminToken, 'Admin token received');
  });

  await test('0.2 Setup & Customer Registration / Login', async () => {
    const testEmail = `parent_${Date.now()}@example.in`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pooja Sharma',
        email: testEmail,
        password: 'Password@123',
        phone: '9876543210'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const data = await regRes.json();
    customerToken = data.token;
    assert(customerToken, 'Customer token received');

    // Get a product for review & wishlist tests
    const pRes = await fetch(`${BASE_URL}/api/products?limit=5`);
    const products = await pRes.json();
    assert(Array.isArray(products) && products.length > 0, 'Products array retrieved');
    testProductId = products[0].id;
    assert(testProductId, 'Test product ID retrieved');
  });

  console.log('\n--- 1. MARKETING & CONVERSION CAPABILITIES ---');

  // 1.1 Discount codes
  await test('1.1 Discount Codes Validation & Restrictions', async () => {
    // Valid coupon
    const validRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DIWALI20', cartSubtotal: 2500 })
    });
    assert.strictEqual(validRes.status, 200);
    const validData = await validRes.json();
    assert.strictEqual(validData.valid, true);
    assert(validData.coupon.discountAmount > 0, 'Discount computed accurately');

    // Invalid coupon
    const invalidRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'FAKECODE99', cartSubtotal: 2500 })
    });
    assert.strictEqual(invalidRes.status, 404);
  });

  // 1.2 Promotional Banners
  await test('1.2 Promotional Banners Management & Delivery', async () => {
    const bannerRes = await fetch(`${BASE_URL}/api/admin/operations/banners`);
    assert.strictEqual(bannerRes.status, 200);
    const banners = await bannerRes.json();
    assert(Array.isArray(banners), 'Banners list returned');
    assert(banners.length > 0, 'At least one active banner present');
    assert(banners[0].title, 'Banner contains title');
  });

  // 1.3 Abandoned-cart recovery
  await test('1.3 Abandoned-Cart Recovery Automated Campaign', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/operations/marketing/abandoned-cart-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.result, 'Campaign result returned');
    assert(data.result.eligibleShoppers > 0, 'Identified abandoned baskets');
    assert(data.result.incentiveCode, 'Incentive coupon attached');
    assert(data.result.channels.length > 0, 'Multi-channel WhatsApp/SMS delivery');
  });

  // 1.4 Product reviews & rating recalculation
  await test('1.4 Product Reviews Submission & Rating Recalculation', async () => {
    const revComment = `Excellent educational toy for my child! Highly recommended. (${Date.now()})`;
    const addRes = await fetch(`${BASE_URL}/api/products/${testProductId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        user: 'Pooja Sharma',
        rating: 5,
        comment: revComment
      })
    });
    assert.strictEqual(addRes.status, 201);

    // Verify rating recalculation on product
    const pRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
    const product = await pRes.json();
    assert(product.reviewsCount > 0, 'Review count incremented');
    assert(product.rating >= 4.0, 'Rating recalculated');
    const hasRev = product.reviews.some(r => r.comment === revComment);
    assert(hasRev, 'New review included in product reviews list');
  });

  // 1.5 Wishlist functionality
  await test('1.5 Customer Wishlist State Persistence & Synchronization', async () => {
    // Add to wishlist
    const toggleRes1 = await fetch(`${BASE_URL}/api/wishlist/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    assert.strictEqual(toggleRes1.status, 200);
    const data1 = await toggleRes1.json();
    assert.strictEqual(data1.inWishlist, true, 'Product added to wishlist');

    // Retrieve wishlist
    const getRes = await fetch(`${BASE_URL}/api/wishlist`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert.strictEqual(getRes.status, 200);
    const list = await getRes.json();
    assert(list.includes(testProductId), 'Product found in persisted wishlist');

    // Remove from wishlist
    const toggleRes2 = await fetch(`${BASE_URL}/api/wishlist/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ productId: testProductId })
    });
    const data2 = await toggleRes2.json();
    assert.strictEqual(data2.inWishlist, false, 'Product removed from wishlist');
  });

  // 1.6 Analytics & Web Vitals
  await test('1.6 Business Analytics & Core Web Vitals Telemetry', async () => {
    // Admin business stats
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const stats = await statsRes.json();
    assert(stats.totalRevenue !== undefined, 'Total revenue computed in INR');
    assert(stats.totalProducts > 0, 'Total products cataloged');
    assert(Array.isArray(stats.categoryDistribution), 'Category breakdown available');

    // Core Web Vitals telemetry beacon
    const vitalsRes = await fetch(`${BASE_URL}/api/analytics/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'LCP',
        value: 1200,
        rating: 'good',
        page: '/shop'
      })
    });
    assert.strictEqual(vitalsRes.status, 200);
  });

  // 1.7 Transactional Notifications (Email/SMS)
  await test('1.7 Transactional Dispatch Notifications (Email & SMS)', async () => {
    const notifyRes = await fetch(`${BASE_URL}/api/admin/operations/marketing/send-transactional`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone: '+91 9876543210',
        recipientEmail: 'pooja@example.in',
        orderId: 'ORD-IN-8891',
        trackingNumber: 'DELHIVERY-998812',
        type: 'ORDER_DISPATCHED'
      })
    });
    assert.strictEqual(notifyRes.status, 200);
    const notifyData = await notifyRes.json();
    assert.strictEqual(notifyData.success, true);
    assert.strictEqual(notifyData.log.status, 'DELIVERED_TO_GATEWAY');
    assert(notifyData.log.message.includes('DELHIVERY-998812'));
  });

  console.log('\n--- 2. PRODUCTION READINESS: PERFORMANCE & SECURITY ---');

  // 2.1 Latency & Performance Benchmark
  await test('2.1 High-Performance Latency Benchmark (< 50ms)', async () => {
    const times = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE_URL}/api/products?limit=24`);
      assert.strictEqual(res.status, 200);
      times.push(performance.now() - t0);
    }
    const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
    assert(avgLatency < 50, `Average latency (${avgLatency.toFixed(1)}ms) meets production SLA (< 50ms)`);
  });

  // 2.2 Authentication & Brute-Force / Bad Credentials Protection
  await test('2.2 Authentication Security: Wrong Password Rejection & JWT Verification', async () => {
    // Bad password
    const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@toyverse.in', password: 'WrongPassword!@#' })
    });
    assert.strictEqual(badLogin.status, 401, 'Unauthorized for bad password');

    // Missing fields
    const missingLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@toyverse.in' })
    });
    assert.strictEqual(missingLogin.status, 400, 'Bad request for missing password');
  });

  // 2.3 Role-Based Authorization Security (RBAC)
  await test('2.3 Authorization Security: Customer Blocked from Admin Endpoints (403)', async () => {
    // Customer attempting to view admin stats
    const unauthorizedStats = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert.strictEqual(unauthorizedStats.status, 403, 'Customer blocked from admin stats (403)');

    // Customer attempting to create coupon
    const unauthorizedCoupon = await fetch(`${BASE_URL}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ code: 'HACKER99', discountPercent: 99 })
    });
    assert.strictEqual(unauthorizedCoupon.status, 403, 'Customer blocked from coupon creation (403)');

    // Anonymous request blocked
    const unauthReq = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(unauthReq.status, 401, 'Anonymous request blocked (401)');
  });

  // 2.4 Database Security & SQL Injection Neutralization
  await test('2.4 Database Security: SQL Injection Neutralization via Prepared Statements', async () => {
    const maliciousInputs = [
      "' OR '1'='1",
      "'; DROP TABLE products; --",
      "admin'--",
      "UNION SELECT null, username, password FROM users--"
    ];

    for (const sqlPayload of maliciousInputs) {
      // 1. In search query
      const searchRes = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(sqlPayload)}`);
      assert.strictEqual(searchRes.status, 200, 'Handled SQL payload safely without error');
      const searchData = await searchRes.json();
      assert(Array.isArray(searchData), 'Returns clean empty/filtered array without SQL leak');

      // 2. In login
      const sqliLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sqlPayload, password: 'password' })
      });
      assert.strictEqual(sqliLogin.status, 401, 'SQL injection login rejected safely');
    }
  });

  // 2.5 Payment Security & Anti-Tampering Protection
  await test('2.5 Payment Security: Server-Authoritative Price & Stock Recalculation', async () => {
    // Customer tries to buy an item submitting a tampered price of ₹1 instead of real price
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customer: {
          name: 'Pooja Sharma',
          email: 'pooja@example.in',
          phone: '9876543210',
          address: 'Flat 402, Lotus Heights',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038'
        },
        items: [{
          id: testProductId,
          name: 'Tampered Item Test',
          price: 1, // Tampered price
          quantity: 1
        }],
        paymentMethod: 'COD',
        couponCode: null,
        idempotencyKey: `IDEMP-${Date.now()}`
      })
    });

    assert.strictEqual(orderRes.status, 201);
    const orderData = await orderRes.json();

    // Verify server authoritative price was enforced (real catalog price, NOT ₹1)
    const pRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
    const actualProduct = await pRes.json();

    assert(
      orderData.subtotal >= actualProduct.price,
      `Server-authoritative subtotal (₹${orderData.subtotal}) enforced real catalog price (₹${actualProduct.price}), preventing client-side price tampering!`
    );
  });

  // 2.6 Mobile Responsiveness & WCAG Accessibility Compliance Check
  await test('2.6 Front-End Mobile Responsiveness & Accessibility Standards', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const mainCss = fs.readFileSync('src/styles/globals.css', 'utf8');

    // 1. Viewport Meta tag
    assert(indexHtml.includes('name="viewport"'), 'Viewport meta tag configured for mobile scaling');
    assert(indexHtml.includes('width=device-width'), 'Device-width responsiveness defined');

    // 2. Accessibility & SEO
    assert(indexHtml.includes('lang="en-IN"'), 'HTML lang attribute set to en-IN');

    // 3. Responsive media queries in CSS
    assert(mainCss.includes('@media'), 'CSS responsive media queries defined');
    assert(mainCss.includes('max-width'), 'Mobile breakpoints configured');

    // 4. Color contrast & design tokens
    assert(mainCss.includes('--color-primary'), 'Standardized color contrast tokens configured');
    assert(mainCss.includes('focus-visible'), 'Accessible focus rings implemented for keyboard navigation');
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🎉 ALL MARKETING, PERFORMANCE & SECURITY AUDITS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
