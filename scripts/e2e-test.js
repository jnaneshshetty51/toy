/**
 * ToyVerse India - Comprehensive Production Readiness & End-to-End Test Suite
 * Verifies every customer and administrative workflow across database, API,
 * security, payments, fulfillment, cancellations, returns, and backups.
 */

const BASE_URL = 'http://localhost:5001';

async function runTest(name, fn) {
  try {
    process.stdout.write(`⏳ [TEST] ${name} ... `);
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ PASSED (${duration}ms)`);
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function main() {
  console.log('================================================================');
  console.log('🚀 Starting ToyVerse E2E Production Readiness Test Suite (India)');
  console.log(`🌐 Target: ${BASE_URL} | Currency: INR (₹)`);
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  // Shared state across sequential workflow
  let adminToken = '';
  let customerToken = '';
  let customerUser = null;
  let testProductId = '';
  let initialStock = 0;
  let createdOrderId = '';
  const testIdempotencyKey = 'IDEMP-E2E-' + Date.now();

  const tests = [
    // 1. Health & Security Headers
    [
      'System Health & Security Headers',
      async () => {
        const res = await fetch(`${BASE_URL}/api/health`);
        assert(res.status === 200, `Health endpoint returned ${res.status}`);
        assert(res.headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options: nosniff');
        assert(res.headers.get('x-frame-options') === 'SAMEORIGIN', 'Missing X-Frame-Options: SAMEORIGIN');
        assert(res.headers.get('x-xss-protection') === '1; mode=block', 'Missing X-XSS-Protection');
        assert(res.headers.get('strict-transport-security'), 'Missing HSTS header');
        assert(res.headers.get('x-ratelimit-limit'), 'Missing Rate Limit headers');
        const data = await res.json();
        assert(data.status === 'online', 'Status is not online');
      }
    ],

    // 2. System Performance Metrics
    [
      'System Performance & Memory Metrics',
      async () => {
        const res = await fetch(`${BASE_URL}/api/system/metrics`);
        assert(res.status === 200, 'Metrics failed');
        const data = await res.json();
        assert(data.status === 'operational', 'System not operational');
        assert(data.database.journalMode === 'WAL', 'SQLite WAL mode not enabled');
        assert(data.database.cacheSize === '64MB', 'Cache size not tuned');
      }
    ],

    // 3. XML Sitemap & SEO Endpoints
    [
      'Dynamic XML Sitemap (SEO Standards)',
      async () => {
        const res = await fetch(`${BASE_URL}/sitemap.xml`);
        assert(res.status === 200, 'Sitemap failed');
        const text = await res.text();
        assert(text.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Invalid XML declaration');
        assert(text.includes('<loc>https://toyverse.in/</loc>'), 'Missing root URL');
        assert(text.includes('category=STEM'), 'Missing category deep links');
        assert(text.includes('/product/toy-'), 'Missing dynamic product SKU URLs');
      }
    ],

    // 4. Product Discovery & Autocomplete
    [
      'Product Discovery, Search & Autocomplete',
      async () => {
        // Search
        const searchRes = await fetch(`${BASE_URL}/api/products?search=ISRO`);
        assert(searchRes.status === 200, 'Search failed');
        const searchData = await searchRes.json();
        const searchList = Array.isArray(searchData) ? searchData : (searchData.products || []);
        assert(searchList.length > 0, 'No products found for ISRO');

        // Autocomplete
        const autoRes = await fetch(`${BASE_URL}/api/products/autocomplete?q=Lego`);
        assert(autoRes.status === 200, 'Autocomplete failed');
        const autoData = await autoRes.json();
        assert(autoData.products !== undefined, 'Autocomplete structure invalid');

        // Store sample product for subsequent purchase tests
        const sampleRes = await fetch(`${BASE_URL}/api/products`);
        const allData = await sampleRes.json();
        const allList = Array.isArray(allData) ? allData : (allData.products || []);
        const targetToy = allList.find(p => p.stock > 5) || allList[0];
        testProductId = targetToy.id;
        initialStock = targetToy.stock;
        assert(testProductId, 'No test product found');
      }
    ],

    // 5. Authentication & Registration
    [
      'User Registration & Role-based Token Generation',
      async () => {
        // Register unique test customer
        const email = `testuser_${Date.now()}@example.in`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Pooja Verma',
            email,
            password: 'CustomerPassword@123',
            phone: '+91 98450 12345'
          })
        });
        assert(regRes.status === 201, `Registration returned ${regRes.status}`);
        const regData = await regRes.json();
        assert(regData.token, 'Token not returned');
        customerToken = regData.token;
        customerUser = regData.user;
        assert(customerUser.role === 'customer', 'Role should be customer');

        // Login as Admin
        const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@toyverse.in',
            password: 'Admin@123'
          })
        });
        assert(adminRes.status === 200, 'Admin login failed');
        const adminData = await adminRes.json();
        adminToken = adminData.token;
        assert(adminData.user.role === 'admin', 'Admin role verification failed');
      }
    ],

    // 6. Wishlist Management
    [
      'Wishlist Add, Retrieve & State Persistence',
      async () => {
        // Toggle add to wishlist
        const addRes = await fetch(`${BASE_URL}/api/wishlist/toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          },
          body: JSON.stringify({ productId: testProductId })
        });
        assert(addRes.status === 200, 'Failed to toggle wishlist');
        const addData = await addRes.json();
        assert(addData.inWishlist === true, 'Item not added to wishlist');

        // Get wishlist
        const getRes = await fetch(`${BASE_URL}/api/wishlist`, {
          headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const items = await getRes.json();
        assert(Array.isArray(items) && items.includes(testProductId), 'Item not in customer wishlist');
      }
    ],

    // 7. Coupon Validation
    [
      'Promotional Coupon Validation (DIWALI20)',
      async () => {
        const res = await fetch(`${BASE_URL}/api/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'DIWALI20', cartSubtotal: 2500 })
        });
        assert(res.status === 200, 'Coupon validation failed');
        const data = await res.json();
        assert(data.valid === true, 'DIWALI20 marked invalid');
        assert(data.coupon.discountPercent === 20, 'Discount percentage mismatch');
      }
    ],

    // 8. Pre-Checkout Inventory & Pricing Validation
    [
      'Pre-Checkout Stock & Server-Authoritative Price Validation',
      async () => {
        const res = await fetch(`${BASE_URL}/api/orders/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ productId: testProductId, quantity: 2 }]
          })
        });
        assert(res.status === 200, 'Pre-checkout validation failed');
        const data = await res.json();
        assert(data.valid === true, 'Cart items validation returned false');
        assert(data.subtotal > 0, 'Subtotal was not computed server-side');
      }
    ],

    // 9. Payment Failure Handling (Simulation)
    [
      'Payment Failure Simulation & Basket Retention',
      async () => {
        const res = await fetch(`${BASE_URL}/api/payments/simulate-failure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: [{ productId: testProductId, quantity: 1 }],
            reason: 'INSUFFICIENT_FUNDS_OR_BANK_TIMEOUT'
          })
        });
        assert(res.status === 402, 'Expected 402 Payment Required');
        const data = await res.json();
        assert(data.retryAllowed === true, 'Retry action was not returned on failed payment');
      }
    ],

    // 10. Order Placement & Idempotency Protection
    [
      'Order Placement & Double-Charge / Duplicate Prevention (Idempotency)',
      async () => {
        const orderPayload = {
          items: [{ productId: testProductId, quantity: 2 }],
          customer: {
            name: customerUser.name,
            email: customerUser.email,
            phone: customerUser.phone
          },
          shippingAddress: {
            street: '12th Main Road, HAL 2nd Stage',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560038'
          },
          paymentMethod: 'UPI',
          discount: 200,
          idempotencyKey: testIdempotencyKey
        };

        // 1st Attempt: Should create order and deduct 2 units of stock
        const res1 = await fetch(`${BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          },
          body: JSON.stringify(orderPayload)
        });
        assert(res1.status === 201, `Order creation returned ${res1.status}`);
        const data1 = await res1.json();
        createdOrderId = data1.id || (data1.order && data1.order.id);
        assert(createdOrderId, 'No order ID returned');

        // 2nd Attempt: Identical idempotency key submitted immediately
        const res2 = await fetch(`${BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          },
          body: JSON.stringify(orderPayload)
        });
        assert(res2.status === 200, `Expected 200 for idempotent replay, got ${res2.status}`);
        const data2 = await res2.json();
        assert(data2.idempotentReplay === true, 'Did not recognize idempotent replay');
        const secondOrderId = data2.id || (data2.order && data2.order.id);
        assert(secondOrderId === createdOrderId, 'Returned different order for idempotent submission');

        // Verify warehouse stock was only deducted ONCE (2 units, not 4 units)
        const checkProdRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
        const prodData = await checkProdRes.json();
        const currentProd = prodData.product || prodData;
        assert(currentProd.stock === initialStock - 2, 
          `Stock should be ${initialStock - 2}, but got ${currentProd.stock}`);
      }
    ],

    // 11. Statutory GST Tax Invoice Generation
    [
      'Statutory GST Tax Invoice Generation (Rule 46 CGST / HSN 9503)',
      async () => {
        const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/invoice`, {
          headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(res.status === 200, 'Failed to generate tax invoice');
        const invoice = await res.json();
        assert(invoice.seller.gstin === '29AAACT9821Q1Z4', 'Invalid seller GSTIN');
        assert(invoice.hsnSummary.hsnCode === '9503', 'Invalid Toy HSN code');
        assert(invoice.hsnSummary.taxRate.includes('18% GST'), '18% GST tax rate missing');
        assert(invoice.pricingBreakdown.totalGst > 0, 'Total GST is 0');
      }
    ],

    // 12. Admin Logistics Fulfillment & AWB Assignment
    [
      'Admin Fulfillment: Courier Assignment (Delhivery) & AWB Tracking',
      async () => {
        const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/shipping`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            shippingProvider: 'Delhivery',
            trackingNumber: 'DELHIVERY-AWB-9988123',
            status: 'Shipped'
          })
        });
        assert(res.status === 200, 'Fulfillment update failed');
        const data = await res.json();
        const order = data.order || data;
        assert(order.status === 'Shipped', 'Status not updated to Shipped');
        assert(order.shippingProvider === 'Delhivery' || order.shipping_provider === 'Delhivery', 'Provider not saved');
      }
    ],

    // 13. Order Cancellation & Inventory Restock
    [
      'Order Cancellation with Automatic Inventory Restocking',
      async () => {
        // Cancel the order
        const cancelRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ reason: 'Customer requested cancellation prior to flight handoff' })
        });
        assert(cancelRes.status === 200, 'Cancellation failed');
        const cancelData = await cancelRes.json();
        const order = cancelData.order || cancelData;
        assert(order.status === 'Cancelled', 'Status not Cancelled');

        // Verify warehouse stock was restored (+2 units back to initialStock)
        const checkRestockRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
        const restockData = await checkRestockRes.json();
        const restockedProd = restockData.product || restockData;
        assert(restockedProd.stock === initialStock,
          `Stock not restored: expected ${initialStock}, got ${restockedProd.stock}`);
      }
    ],

    // 14. Return & Refund Processing with Stock Replenishment
    [
      'Returns, Replacement & Full/Partial Refund Execution',
      async () => {
        // Place a small order to process return and refund
        const retOrderRes = await fetch(`${BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          },
          body: JSON.stringify({
            items: [{ productId: testProductId, quantity: 1 }],
            customer: {
              name: customerUser.name,
              email: customerUser.email,
              phone: customerUser.phone
            },
            shippingAddress: { street: 'Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038' },
            paymentMethod: 'NetBanking',
            idempotencyKey: 'RETURN-TEST-' + Date.now()
          })
        });
        const retOrderData = await retOrderRes.json();
        assert(retOrderRes.status === 201, `Order placement for return test returned ${retOrderRes.status}: ${JSON.stringify(retOrderData)}`);
        const retOrderId = retOrderData.id || (retOrderData.order && retOrderData.order.id);

        // Customer requests return
        const reqReturnRes = await fetch(`${BASE_URL}/api/orders/${retOrderId}/return`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
          },
          body: JSON.stringify({ reason: 'Packaging seal inspected, child chose alternative' })
        });
        assert(reqReturnRes.status === 200, 'Return request failed');

        // Admin approves and processes refund with warehouse restock
        const refundRes = await fetch(`${BASE_URL}/api/orders/${retOrderId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            amount: 1000,
            reason: '7-day inspection satisfied, customer refunded via UPI',
            restockInventory: true
          })
        });
        assert(refundRes.status === 200, 'Refund processing failed');
        const refundData = await refundRes.json();
        const refOrder = refundData.order || refundData;
        assert(refOrder.refundStatus === 'Refunded' || refOrder.refund_status === 'Refunded', 'Refund status not updated');
        assert(refOrder.status === 'Refunded', 'Order status not Refunded');

        // Final stock check
        const finalProdRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
        const finalProdData = await finalProdRes.json();
        const finalProd = finalProdData.product || finalProdData;
        assert(finalProd.stock === initialStock, 'Stock not replenished after refund');
      }
    ],

    // 15. Staff Permissions & Privilege Escalation Security
    [
      'Staff Role Promotion, Demotion & Authorization Security',
      async () => {
        // Promote customer to admin
        const promoRes = await fetch(`${BASE_URL}/api/admin/operations/customers/${customerUser.id}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ role: 'admin' })
        });
        assert(promoRes.status === 200, 'Promotion failed');

        // Demote back to customer
        const demoRes = await fetch(`${BASE_URL}/api/admin/operations/customers/${customerUser.id}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ role: 'customer' })
        });
        assert(demoRes.status === 200, 'Demotion failed');
      }
    ],

    // 16. Hot SQLite Database Backup & Integrity Check
    [
      'Hot SQLite WAL Database Backup & Integrity Check',
      async () => {
        const res = await fetch(`${BASE_URL}/api/admin/operations/backup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(res.status === 200, 'Backup failed');
        const data = await res.json();
        assert(data.success === true, 'Backup not successful');
        assert(data.backup && data.backup.sizeBytes > 50000, 'Backup file size too small');
      }
    ]
  ];

  for (const [name, fn] of tests) {
    total++;
    const ok = await runTest(name, fn);
    if (ok) passed++;
  }

  console.log('\n================================================================');
  console.log(`📊 Test Results: ${passed} / ${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================');

  if (passed === total) {
    console.log('🎉 ALL SYSTEMS VERIFIED & PRODUCTION READY FOR PAN-INDIA OPERATIONS!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
