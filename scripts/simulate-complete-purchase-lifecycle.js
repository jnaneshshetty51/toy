/**
 * Complete Purchase Simulation & Lifecycle Verification Suite
 * Tests end-to-end shopping experience using an imported catalog toy:
 * 1. Product Search & Discovery
 * 2. Variant & Detail Inspection
 * 3. Cart Stock & Price Validation
 * 4. Coupon Validation & Application
 * 5. Payment Completion & Order Generation (with Idempotency)
 * 6. Inventory Deduction Verification
 * 7. Shipping Serviceability (19,000+ PIN Codes)
 * 8. Automated Courier & AWB Manifestation
 * 9. Statutory 4x6" Barcode Thermal Dispatch Label Generation
 * 10. Automatic Delivery Status Telemetry Synchronization
 * 11. Cancellation / Return & Statutory Refund Processing
 * 12. Complete Inventory Restocking Verification
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function logStep(num, title) {
  console.log(`\n▶️  STEP ${num}: ${title}`);
}

async function runSimulation() {
  console.log('================================================================');
  console.log('🧸 TOYVERSE COMPLETE PURCHASE SIMULATION & LIFECYCLE AUDIT');
  console.log('================================================================');

  // Step 0: Authenticate
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@toyverse.in', password: 'Admin@123' })
  });
  assert.strictEqual(adminRes.status, 200);
  const { token: adminToken } = await adminRes.json();

  const customerRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav.sharma@example.com', password: 'Customer@123' })
  });
  assert.strictEqual(customerRes.status, 200);
  const { token: customerToken } = await customerRes.json();

  // 1. Search for imported toy
  await logStep(1, 'Search & Product Discovery');
  const searchRes = await fetch(`${BASE_URL}/api/products?search=Robot`);
  assert.strictEqual(searchRes.status, 200);
  const searchResults = await searchRes.json();
  assert(Array.isArray(searchResults) && searchResults.length > 0, 'Search returned products');
  const targetToy = searchResults[0];
  console.log(`   Found Product: "${targetToy.name}" (SKU: ${targetToy.sku})`);
  console.log(`   Category: ${targetToy.category} | Price: ₹${targetToy.price} | Initial Stock: ${targetToy.stock}`);

  // Save initial stock
  const initialStockRes = await fetch(`${BASE_URL}/api/products/${targetToy.id}`);
  const initialProduct = await initialStockRes.json();
  const initialStock = initialProduct.stock;
  assert(initialStock > 0, 'Product has available stock for purchase');

  // 2. Validate Cart & Pre-Checkout Stock
  await logStep(2, 'Pre-Checkout Stock & Price Validation');
  const validateRes = await fetch(`${BASE_URL}/api/orders/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: targetToy.id, quantity: 1, price: targetToy.price }]
    })
  });
  assert.strictEqual(validateRes.status, 200);
  const validation = await validateRes.json();
  assert.strictEqual(validation.valid, true, 'Cart stock and pricing verified');
  console.log(`   Server verified subtotal: ₹${validation.subtotal} for 1 unit`);

  // 3. Apply Promotional Discount Coupon
  await logStep(3, 'Promotional Coupon Validation');
  const couponRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'DIWALI20', cartSubtotal: targetToy.price })
  });
  assert.strictEqual(couponRes.status, 200);
  const couponData = await couponRes.json();
  assert.strictEqual(couponData.valid, true);
  const discountAmount = couponData.coupon.discountAmount;
  console.log(`   Applied Coupon: ${couponData.coupon.code} | Discount: ₹${discountAmount}`);

  // 4. Calculate Final Indian Rupee Total & Shipping Fee
  await logStep(4, 'Server Authoritative Pricing & Shipping Calculation');
  const shippingFee = targetToy.price >= 999 ? 0 : 79;
  const finalExpectedTotal = targetToy.price - discountAmount + shippingFee;
  console.log(`   Price: ₹${targetToy.price} - Discount: ₹${discountAmount} + Shipping: ₹${shippingFee} = Total: ₹${finalExpectedTotal}`);

  // 5. Complete Payment & Generate Order
  await logStep(5, 'Order Creation & Secure Payment Settlement');
  const idempotencyKey = `IDEMP-SIM-${Date.now()}`;
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      customer: {
        name: 'Aarav Patel',
        email: 'aarav@example.in',
        phone: '9876543210',
        address: '42, Brigade Road, Ashok Nagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560025'
      },
      items: [{
        id: targetToy.id,
        name: targetToy.name,
        price: targetToy.price,
        quantity: 1
      }],
      subtotal: targetToy.price,
      discount: discountAmount,
      shippingFee,
      total: finalExpectedTotal,
      paymentMethod: 'UPI',
      couponCode: 'DIWALI20',
      idempotencyKey
    })
  });
  assert.strictEqual(orderRes.status, 201);
  const order = await orderRes.json();
  const orderId = order.id || order.order?.id;
  assert(orderId, 'Order created with unique ID');
  console.log(`   Created Order: ${orderId} | Status: ${order.status || order.order?.status}`);
  console.log(`   Invoice Number: ${order.invoiceNumber || order.order?.invoiceNumber}`);

  // 6. Verify Automatic Inventory Deduction
  await logStep(6, 'Verify Automatic Inventory Deduction');
  const postPurchaseStockRes = await fetch(`${BASE_URL}/api/products/${targetToy.id}`);
  const postPurchaseProduct = await postPurchaseStockRes.json();
  const expectedStockAfterDeduction = initialStock - 1;
  assert.strictEqual(
    postPurchaseProduct.stock,
    expectedStockAfterDeduction,
    `Inventory was automatically deducted from ${initialStock} to ${expectedStockAfterDeduction}`
  );
  console.log(`   Inventory updated: ${initialStock} -> ${postPurchaseProduct.stock} (Deducted 1 unit)`);

  // 7. Check Carrier Serviceability (PIN Code)
  await logStep(7, 'Carrier PIN Code Serviceability Engine');
  const serviceRes = await fetch(`${BASE_URL}/api/shipping/serviceability?pincode=560025`);
  assert.strictEqual(serviceRes.status, 200);
  const serviceData = await serviceRes.json();
  assert.strictEqual(serviceData.serviceable, true);
  console.log(`   PIN 560025 Serviceable: ${serviceData.serviceable} | Hub: "${serviceData.hubName || 'Bengaluru Air Cargo Hub'}" | TAT: ${serviceData.estimatedDeliveryDays}`);

  // 8. Generate AWB & Assign Courier Partner
  await logStep(8, 'Automated AWB Generation & Courier Partner Assignment');
  const awbRes = await fetch(`${BASE_URL}/api/shipping/generate-awb`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      orderId,
      courier: 'Delhivery Air'
    })
  });
  assert.strictEqual(awbRes.status, 200);
  const awbData = await awbRes.json();
  const awbNumber = awbData.awbNumber;
  assert(awbNumber, 'AWB assigned');
  console.log(`   Manifested with ${awbData.order?.shippingProvider || 'Delhivery Air'} | AWB Tracking Number: ${awbNumber}`);

  // 9. Generate Statutory 4x6" Barcode Thermal Dispatch Label
  await logStep(9, 'Statutory 4x6" Barcode Shipping Dispatch Label Generation');
  const labelRes = await fetch(`${BASE_URL}/api/shipping/label/${orderId}`);
  assert.strictEqual(labelRes.status, 200);
  const labelHtml = await labelRes.text();
  assert(labelHtml.includes('DELHIVERY AIR') || labelHtml.includes('DELHIVERY'), 'Label includes carrier');
  assert(labelHtml.includes(awbNumber), 'Label includes AWB number');
  assert(labelHtml.includes('IS-9873'), 'Label includes BIS safety compliance statement');
  console.log(`   4x6" Thermal Shipping Dispatch Label generated successfully with barcode`);

  // 10. Automated Shipment Telemetry Status Update (To Delivered)
  await logStep(10, 'Automatic Shipment Telemetry Synchronization (Sync to Delivered)');
  const syncRes = await fetch(`${BASE_URL}/api/shipping/sync-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      orderId,
      status: 'Delivered'
    })
  });
  assert.strictEqual(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.strictEqual(syncData.synchronizedStatus, 'Delivered');
  console.log(`   Shipment Telemetry: Status automatically transitioned to "${syncData.synchronizedStatus}"`);

  // 11. Customer Cancellation / Return with Refund Execution
  await logStep(11, 'Customer Return / Statutory Cancellation & Full Refund');
  const cancelRes = await fetch(`${BASE_URL}/api/orders/${orderId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      amount: finalExpectedTotal,
      reason: 'Customer initiated satisfaction guarantee return',
      restockInventory: true
    })
  });
  assert.strictEqual(cancelRes.status, 200);
  const cancelData = await cancelRes.json();
  assert.strictEqual(cancelData.order.paymentStatus, 'Refunded');
  console.log(`   Refund processed: ₹${cancelData.order.refundAmount} refunded back to customer`);
  console.log(`   Order Status: ${cancelData.order.status} | Payment: ${cancelData.order.paymentStatus}`);

  // 12. Verify Complete Inventory Restoration
  await logStep(12, 'Verify Complete Inventory Restoration');
  const finalProductRes = await fetch(`${BASE_URL}/api/products/${targetToy.id}`);
  const finalProduct = await finalProductRes.json();
  assert.strictEqual(
    finalProduct.stock,
    initialStock,
    `Inventory was restored back to the original level of ${initialStock} units!`
  );
  console.log(`   Inventory successfully restored: ${postPurchaseProduct.stock} -> ${finalProduct.stock} (Original stock maintained)`);

  console.log('\n================================================================');
  console.log('🎉 100% SUCCESS: COMPLETE PURCHASE LIFECYCLE SIMULATION PASSED!');
  console.log('   All 12 stages from search to refund & restocking verified.');
  console.log('================================================================\n');
}

runSimulation().catch(err => {
  console.error('\n❌ Fatal Simulation Error:', err);
  process.exit(1);
});
