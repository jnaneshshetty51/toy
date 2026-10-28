import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TOYVERSE VERIFICATION: COMPLETE ADMIN & SHIPPING');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ PASS [${total}]: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL [${total}]: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  // Obtain admin credentials / token
  let adminToken = '';
  await test('0. Authenticate Admin Token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@toyverse.in', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.token, 'Has admin token');
    adminToken = data.token;
  });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  });

  // -----------------------------------------------------------------
  // 1. COMPLETE ADMIN DASHBOARD MANAGEMENT
  // -----------------------------------------------------------------
  console.log('\n--- 1. ADMIN DASHBOARD CAPABILITIES ---');

  await test('1.1 Manage Products without code: Create, Adjust Stock & Delete', async () => {
    // Create new toy
    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: 'Aerospace Space Shuttle Discovery Edition',
        category: 'STEM & Learning',
        brand: 'ISRO Junior',
        price: 2499,
        originalPrice: 2999,
        stock: 50,
        sku: `ISRO-TEST-${Date.now()}`
      })
    });
    assert.strictEqual(createRes.status, 201);
    const newToy = await createRes.json();
    assert(newToy.id, 'Toy created');

    // Adjust stock without code
    const stockRes = await fetch(`${BASE_URL}/api/products/${newToy.id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ delta: -5 })
    });
    assert.strictEqual(stockRes.status, 200);
    const updatedStock = await stockRes.json();
    assert.strictEqual(updatedStock.stock, 45, 'Stock adjusted without code');

    // Delete toy
    const delRes = await fetch(`${BASE_URL}/api/products/${newToy.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    assert.strictEqual(delRes.status, 200);
  });

  await test('1.2 Manage 18 Categories & Pricing Aggregates', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/operations/categories`);
    assert.strictEqual(res.status, 200);
    const categories = await res.json();
    assert(categories.length >= 18, 'At least 18 categories present');
    assert(categories[0].name, 'Category has name');
    assert(categories[0].status, 'Category has status');
  });

  await test('1.3 Manage Brands Directory', async () => {
    const res = await fetch(`${BASE_URL}/api/products/meta/brands`);
    assert.strictEqual(res.status, 200);
    const brands = await res.json();
    assert(Array.isArray(brands) && brands.length > 0, 'Brands retrieved');
  });

  await test('1.4 Manage Customers & Staff Permissions', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/operations/customers`, { headers: getAuthHeaders() });
    assert.strictEqual(res.status, 200);
    const customers = await res.json();
    assert(customers.length > 0, 'Customer directory accessible');
    const targetUser = customers[0];

    // Promote/Demote staff permission without code
    const roleRes = await fetch(`${BASE_URL}/api/admin/operations/customers/${targetUser.id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: 'manager' })
    });
    assert.strictEqual(roleRes.status, 200);

    // Restore
    await fetch(`${BASE_URL}/api/admin/operations/customers/${targetUser.id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: targetUser.role })
    });
  });

  await test('1.5 Manage Promotional Coupons', async () => {
    const code = `TEST-${Date.now().toString(36).toUpperCase()}`;
    const createRes = await fetch(`${BASE_URL}/api/coupons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        code,
        discountPercent: 15,
        minOrderINR: 1200,
        description: 'Automated test discount'
      })
    });
    assert.strictEqual(createRes.status, 201);

    // Toggle active status without code
    const toggleRes = await fetch(`${BASE_URL}/api/coupons/${code}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    assert.strictEqual(toggleRes.status, 200);
    const toggled = await toggleRes.json();
    assert.strictEqual(Boolean(toggled.active), false, 'Coupon deactivated without code');
  });

  await test('1.6 Manage Promotional Banners & Announcements', async () => {
    const bannerRes = await fetch(`${BASE_URL}/api/admin/operations/banners`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: 'Diwali Special Mega Discount',
        subtitle: 'Use code DIWALI20 for instant 20% off',
        ctaText: 'Claim Offer',
        ctaLink: '/shop?deals=true'
      })
    });
    assert.strictEqual(bannerRes.status, 201);
    const banner = await bannerRes.json();
    assert(banner.id, 'Banner created');
  });

  // -----------------------------------------------------------------
  // 2. SHIPPING INTEGRATION & AUTOMATION
  // -----------------------------------------------------------------
  console.log('\n--- 2. SHIPPING INTEGRATION & LOGISTICS ---');

  await test('2.1 PIN Code Serviceability Engine (19,000+ PIN Codes)', async () => {
    // Metro test (Bengaluru)
    const resMetro = await fetch(`${BASE_URL}/api/shipping/serviceability?pincode=560038`);
    assert.strictEqual(resMetro.status, 200);
    const dataMetro = await resMetro.json();
    assert.strictEqual(dataMetro.serviceable, true);
    assert.strictEqual(dataMetro.codAvailable, true);
    assert(dataMetro.estimatedDeliveryDays.includes('Business Days'));
    console.log(`     PIN 560038 -> Hub: "${dataMetro.routingHub}" | TAT: ${dataMetro.estimatedDeliveryDays}`);

    // Tier-2 test (Kochi)
    const resTier = await fetch(`${BASE_URL}/api/shipping/serviceability?pincode=682001`);
    assert.strictEqual(resTier.status, 200);
    const dataTier = await resTier.json();
    assert.strictEqual(dataTier.serviceable, true);
  });

  // Create an order for shipping tests
  let shipOrder = null;
  await test('2.2 Create order for dispatch & label generation', async () => {
    const productsRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await productsRes.json();
    const p = prods[0];

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: p.id, name: p.name, price: p.price, quantity: 1, image: p.image }],
        shippingAddress: {
          name: 'Vikramaditya Rao',
          phone: '9845123456',
          addressLine1: '#12, Palm Meadows, Whitefield',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560066'
        },
        paymentMethod: 'Cash on Delivery (COD)'
      })
    });
    assert.strictEqual(res.status, 201);
    shipOrder = await res.json();
    assert(shipOrder.id, 'Order created');
  });

  await test('2.3 Automated AWB Generation & Courier Partner Assignment', async () => {
    const res = await fetch(`${BASE_URL}/api/shipping/generate-awb`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        orderId: shipOrder.id,
        courier: 'Delhivery'
      })
    });
    assert.strictEqual(res.status, 200);
    const awbData = await res.json();
    assert.strictEqual(awbData.success, true);
    assert(awbData.awbNumber.startsWith('DELHIVERY-'), 'AWB assigned');
    assert.strictEqual(awbData.status, 'Shipped');
    console.log(`     Order: ${shipOrder.id} -> Manifested with Delhivery Air | AWB: ${awbData.awbNumber}`);
  });

  await test('2.4 Statutory 4x6" Barcode Shipping Dispatch Label Generation', async () => {
    const res = await fetch(`${BASE_URL}/api/shipping/label/${shipOrder.id}`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Shipping Label'), 'Valid shipping label document');
    assert(html.includes('DELHIVERY'), 'Contains carrier name');
    assert(html.includes('AWB:'), 'Contains AWB reference');
    assert(html.includes('SHIP TO:'), 'Contains consignee block');
    assert(html.includes('CASH ON DELIVERY'), 'Contains COD payment stamp');
    assert(html.includes('BIS IS-9873'), 'Safety standard stamped on packaging');
  });

  await test('2.5 Automatic Shipment Telemetry Synchronization (Sync Status)', async () => {
    const res = await fetch(`${BASE_URL}/api/shipping/sync-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: shipOrder.id,
        status: 'Delivered'
      })
    });
    assert.strictEqual(res.status, 200);
    const syncData = await res.json();
    assert.strictEqual(syncData.synchronizedStatus, 'Delivered');
    assert.strictEqual(syncData.paymentStatus, 'Paid', 'COD automatically marked as Paid upon delivery');
    console.log(`     Shipment Telemetry: Auto-updated to Delivered | COD settled to Paid`);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🎉 ALL ADMIN & SHIPPING INTEGRATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
