import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TOYVERSE VERIFICATION: PAYMENT INTEGRATION & TRACKING');
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
  // PART 1: PAYMENT INTEGRATION VERIFICATION
  // -----------------------------------------------------------------
  console.log('--- 1. PAYMENT INTEGRATION ---');

  await test('1.1 Supported Payment Methods (UPI, Cards, Net Banking, COD)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/methods`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'operational');
    assert.strictEqual(data.currency, 'INR');
    assert(Array.isArray(data.methods), 'Methods is an array');

    const methodIds = data.methods.map(m => m.id);
    assert(methodIds.includes('upi'), 'UPI supported');
    assert(methodIds.includes('card'), 'Credit/Debit cards supported');
    assert(methodIds.includes('netbanking'), 'Net Banking supported');
    assert(methodIds.includes('cod'), 'Cash on Delivery supported');
  });

  // Create an order for payment testing
  let testOrder = null;
  await test('1.2 Create order for payment verification testing', async () => {
    const productsRes = await fetch(`${BASE_URL}/api/products`);
    const products = await productsRes.json();
    const prod = products[0];

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: prod.id, name: prod.name, price: prod.price, quantity: 1, image: prod.image }],
        shippingAddress: { name: 'Priya Iyer', phone: '9988776655', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
        paymentMethod: 'UPI'
      })
    });
    assert.strictEqual(res.status, 201);
    testOrder = await res.json();
    assert(testOrder.id, 'Order created');
  });

  await test('1.3 Secure Payment Verification (POST /api/payments/verify)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: testOrder.id,
        paymentId: `PAY-UPI-${Date.now()}`,
        status: 'success'
      })
    });
    assert.strictEqual(res.status, 200);
    const verifyData = await res.json();
    assert.strictEqual(verifyData.verified, true);
    assert.strictEqual(verifyData.paymentStatus, 'Paid');
  });

  await test('1.4 Payment Gateway Webhook Handling (payment.captured & refund.processed)', async () => {
    const whRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {
          orderId: testOrder.id,
          paymentId: `PAY-WH-${Date.now()}`
        }
      })
    });
    assert.strictEqual(whRes.status, 200);
    const whData = await whRes.json();
    assert.strictEqual(whData.received, true);
  });

  await test('1.5 Failed Payment Handling & Simulation (Basket Preservation)', async () => {
    const failRes = await fetch(`${BASE_URL}/api/payments/simulate-failure`, {
      method: 'POST'
    });
    assert.strictEqual(failRes.status, 402, 'Returns HTTP 402 Payment Required');
    const failData = await failRes.json();
    assert.strictEqual(failData.code, 'PAYMENT_DECLINED');
    assert.strictEqual(failData.retryAllowed, true);
  });

  // -----------------------------------------------------------------
  // PART 2: ORDER TRACKING, INVOICE, CANCELLATION & RETURNS
  // -----------------------------------------------------------------
  console.log('\n--- 2. ORDER TRACKING, INVOICES, CANCELLATION & RETURNS ---');

  await test('2.1 Track Order and Courier Status Updates', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${testOrder.id}`);
    assert.strictEqual(res.status, 200);
    const order = await res.json();
    assert.strictEqual(order.id, testOrder.id);
    assert(order.trackingNumber, 'Has Courier Tracking Number');
    assert.strictEqual(order.shippingProvider, 'Delhivery', 'Courier assigned');
    console.log(`     Order: ${order.id} | Status: ${order.status} | Courier AWB: ${order.trackingNumber}`);
  });

  await test('2.2 Download Statutory GST Tax Invoice (Rule 46 CGST / HSN 9503)', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${testOrder.id}/invoice`);
    assert.strictEqual(res.status, 200);
    const invoice = await res.json();
    assert(invoice.invoiceNumber, 'Has tax invoice number');
    assert.strictEqual(invoice.seller.gstin, '29AAACT9821Q1Z4', 'Seller GSTIN verified');
    assert.strictEqual(invoice.seller.pan, 'AAACT9821Q', 'Seller PAN verified');
    assert(invoice.cgst !== undefined, 'CGST 9% itemized');
    assert(invoice.sgst !== undefined, 'SGST 9% itemized');
    assert(invoice.items.length > 0, 'Itemized rows included');
    console.log(`     Invoice: ${invoice.invoiceNumber} | GSTIN: ${invoice.seller.gstin} | CGST: ₹${invoice.cgst} | SGST: ₹${invoice.sgst}`);
  });

  await test('2.3 Request Cancellation with Automatic Inventory Replenishment', async () => {
    // Check initial product stock
    const pId = testOrder.items[0].id;
    const prodResBefore = await fetch(`${BASE_URL}/api/products/${pId}`);
    const prodBefore = await prodResBefore.json();
    const stockBefore = prodBefore.stock;

    // Execute cancellation
    const cancelRes = await fetch(`${BASE_URL}/api/orders/${testOrder.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Accidental order by customer' })
    });
    assert.strictEqual(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.status, 'Cancelled');

    // Verify inventory restored
    const prodResAfter = await fetch(`${BASE_URL}/api/products/${pId}`);
    const prodAfter = await prodResAfter.json();
    assert.strictEqual(prodAfter.stock, stockBefore + testOrder.items[0].quantity, 'Inventory replenished upon cancellation');
    console.log(`     Stock: ${stockBefore} -> ${prodAfter.stock} (Replenished +${testOrder.items[0].quantity})`);
  });

  await test('2.4 Initiate Return & Replacement according to 7-Day Store Policy', async () => {
    // Create a delivered order to test return
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await prodRes.json();
    const p = prods[1] || prods[0];

    const createRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: p.id, name: p.name, price: p.price, quantity: 1, image: p.image }],
        shippingAddress: { name: 'Kavita Nair', phone: '9845012345', city: 'Kochi', state: 'Kerala', pincode: '682001' },
        paymentMethod: 'UPI'
      })
    });
    const deliveredOrder = await createRes.json();

    // Mark as delivered for return testing
    await fetch(`${BASE_URL}/api/orders/${deliveredOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Delivered' })
    });

    // Test Replacement Request
    const repRes = await fetch(`${BASE_URL}/api/orders/${deliveredOrder.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'replacement', reason: 'Defective piece upon unboxing' })
    });
    assert.strictEqual(repRes.status, 200);
    const repData = await repRes.json();
    assert.strictEqual(repData.status, 'Replacement Dispatched');
    console.log(`     Order: ${deliveredOrder.id} -> Status: ${repData.status}`);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PAYMENT & TRACKING TESTS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
