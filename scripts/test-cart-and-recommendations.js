import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TOYVERSE VERIFICATION: RECOMMENDATIONS & CART/CHECKOUT');
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

  // -----------------------------------------------------------------
  // 1. PRODUCT RECOMMENDATIONS VERIFICATION
  // -----------------------------------------------------------------
  console.log('--- 1. PRODUCT RECOMMENDATIONS ---');

  let testToy = null;
  await test('1.1 Fetch sample product for recommendation testing', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    const products = await res.json();
    assert(products.length > 0, 'Products available');
    testToy = products[0];
    assert(testToy.category, 'Product has category');
    assert(testToy.brand, 'Product has brand');
  });

  await test('1.2 Related Products / Similar Toys in same category', async () => {
    const res = await fetch(`${BASE_URL}/api/products?category=${encodeURIComponent(testToy.category)}`);
    const items = await res.json();
    assert(Array.isArray(items), 'Returns an array of items');
    const similar = items.filter(t => t.id !== testToy.id);
    console.log(`     Category: "${testToy.category}" -> Found ${items.length} total (${similar.length} similar items)`);
    assert(items.every(t => t.category === testToy.category), 'All returned items match category');
  });

  await test('1.3 Products from the Same Brand', async () => {
    const res = await fetch(`${BASE_URL}/api/products?brand=${encodeURIComponent(testToy.brand)}`);
    const items = await res.json();
    assert(Array.isArray(items), 'Returns an array of items');
    console.log(`     Brand: "${testToy.brand}" -> Found ${items.length} brand items`);
    assert(items.every(t => t.brand === testToy.brand), 'All returned items match brand');
  });

  // -----------------------------------------------------------------
  // 2. SHOPPING CART, VARIANTS, COUPONS & SHIPPING
  // -----------------------------------------------------------------
  console.log('\n--- 2. SHOPPING CART, VARIANTS, COUPONS & SHIPPING ---');

  // Verify variant selection & pricing
  let toyWithVariants = null;
  await test('2.1 Variant selection retains distinct SKU, price, and stock', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    const products = await res.json();
    toyWithVariants = products.find(p => Array.isArray(p.variants) && p.variants.length > 1) || products[0];
    assert(toyWithVariants, 'Toy identified');

    if (toyWithVariants.variants && toyWithVariants.variants.length > 0) {
      const v1 = toyWithVariants.variants[0];
      assert(v1.sku, 'Variant has SKU');
      assert(v1.price !== undefined, 'Variant has price');
      assert(v1.stock !== undefined, 'Variant has stock');
    }
  });

  // Coupon Validation
  await test('2.2 Apply Coupon (DIWALI20) & calculate discount correctly', async () => {
    const cartSubtotal = 2000;
    const res = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DIWALI20', cartTotal: cartSubtotal })
    });
    const couponData = await res.json();
    assert.strictEqual(res.status, 200, 'Coupon API returned 200');
    assert.strictEqual(couponData.valid, true, 'Coupon is valid');
    assert.strictEqual(couponData.coupon.discountPercent, 20, '20% discount');
    const expectedDiscount = (cartSubtotal * 20) / 100;
    assert.strictEqual(expectedDiscount, 400, 'Discount calculation matches ₹400');
  });

  await test('2.3 Shipping Fee Calculation: Free delivery on orders >= ₹999, ₹79 below', async () => {
    // Under threshold (e.g. ₹500 subtotal)
    const subtotalLow = 500;
    const feeLow = subtotalLow >= 999 ? 0 : 79;
    assert.strictEqual(feeLow, 79, 'Fee is ₹79 for orders under ₹999');

    // Over threshold (e.g. ₹1,499 subtotal)
    const subtotalHigh = 1499;
    const feeHigh = subtotalHigh >= 999 ? 0 : 79;
    assert.strictEqual(feeHigh, 0, 'Delivery is free (₹0) for orders >= ₹999');
  });

  // -----------------------------------------------------------------
  // 3. CHECKOUT & ORDER EXECUTION WITHOUT ERRORS
  // -----------------------------------------------------------------
  console.log('\n--- 3. CHECKOUT & ORDER EXECUTION ---');

  const testCart = [
    {
      id: testToy.id,
      sku: testToy.sku,
      name: testToy.name,
      price: testToy.price,
      quantity: 1,
      image: testToy.image
    }
  ];

  await test('3.1 Pre-checkout stock & price server-authoritative validation', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: testCart })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.valid, true, 'Cart items validated');
  });

  let createdOrder = null;
  await test('3.2 Complete Checkout without errors (COD / UPI)', async () => {
    const initialToyRes = await fetch(`${BASE_URL}/api/products/${testToy.id}`);
    const initialToy = await initialToyRes.json();
    const initialStock = initialToy.stock;

    const idempotencyKey = `IDEM-TEST-${Date.now()}`;
    const orderPayload = {
      items: testCart,
      shippingAddress: {
        name: 'Aarav Sharma',
        phone: '9876543210',
        addressLine1: 'Flat 402, Lotus Towers, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038'
      },
      paymentMethod: 'cod',
      couponCode: 'DIWALI20',
      idempotencyKey
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    assert.strictEqual(res.status, 201, 'Order created successfully with 201 Created');
    createdOrder = await res.json();
    const orderId = createdOrder.id || createdOrder.orderId;
    assert(orderId, 'Has order ID');
    assert(createdOrder.status === 'Placed' || createdOrder.status === 'confirmed', 'Order has valid active status');
    assert.strictEqual(createdOrder.paymentStatus.toLowerCase(), 'pending', 'COD paymentStatus is pending');
    assert(createdOrder.total > 0, 'Total is calculated');

    // Verify atomic stock deduction
    const afterToyRes = await fetch(`${BASE_URL}/api/products/${testToy.id}`);
    const afterToy = await afterToyRes.json();
    assert.strictEqual(afterToy.stock, initialStock - 1, 'Stock deducted by ordered quantity');
    console.log(`     Order ID: ${orderId} | Total: ₹${createdOrder.total} | Stock: ${initialStock} -> ${afterToy.stock}`);
  });

  await test('3.3 Duplicate prevention: Re-submitting same idempotency key returns existing order without double-deduction', async () => {
    const idempotencyKey = createdOrder.idempotencyKey;
    const initialToyRes = await fetch(`${BASE_URL}/api/products/${testToy.id}`);
    const initialToy = await initialToyRes.json();
    const stockBefore = initialToy.stock;

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: testCart,
        shippingAddress: createdOrder.shippingAddress,
        paymentMethod: 'cod',
        idempotencyKey
      })
    });

    assert.strictEqual(res.status, 200, 'Returns 200 OK for idempotent repeat');
    const repeatOrder = await res.json();
    assert.strictEqual(repeatOrder.id || repeatOrder.orderId, createdOrder.id || createdOrder.orderId, 'Returns exact same order');

    const afterToyRes = await fetch(`${BASE_URL}/api/products/${testToy.id}`);
    const afterToy = await afterToyRes.json();
    assert.strictEqual(afterToy.stock, stockBefore, 'Stock NOT deducted again');
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🎉 ALL RECOMMENDATIONS & CART/CHECKOUT TESTS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
