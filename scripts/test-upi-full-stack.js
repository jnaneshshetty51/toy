import crypto from 'node:crypto';

const API_BASE = 'http://localhost:5001/api';
const SECRET = 'toyverse_upi_secret_key_2026';

function computeSignature(secret, rawBody, timestamp) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

async function runTests() {
  console.log('🚀 Starting Full-Stack UPI Gateway & Reconciler Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // Test 1: Server-Authoritative Order Creation with Base32 Ref
  // -------------------------------------------------------------
  console.log('1️⃣ Testing Server-Side UPI Order Creation & QR...');
  const order1Res = await fetch(`${API_BASE}/upi/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountINR: 799, name: 'Vikram Malhotra', phone: '9876543210' })
  });
  const order1 = await order1Res.json();

  assert(order1Res.status === 201, 'Order created with HTTP 201');
  assert(order1.amountPaise === 79900, 'Amount stored as integer paise (79900 paise)');
  assert(/^ORD-[2-9A-HJ-NP-Z]{6}$/.test(order1.ref), `Public ref "${order1.ref}" uses unguessable Base32 (no 0/O/1/I)`);
  assert(order1.upi_uri.includes('pa=toyverse%40icici') || order1.upi_uri.includes('pa=toyverse'), 'UPI URI contains payee VPA');
  assert(order1.upi_uri.includes(`tn=${order1.ref}`), 'UPI URI contains public_ref in tn field');
  assert(order1.qr_data_url && order1.qr_data_url.startsWith('data:image/png;base64,'), 'QR code rendered as server-side data URL');

  // Verify binary PNG route
  const qrPngRes = await fetch(`http://localhost:5001/api/orders/${order1.ref}/qr.png`);
  assert(qrPngRes.status === 200, 'GET /api/orders/:ref/qr.png returns HTTP 200');
  assert(qrPngRes.headers.get('content-type') === 'image/png', 'QR PNG returns image/png content type');

  // -------------------------------------------------------------
  // Test 2: Layer 1 Exact Match Webhook Ingestion
  // -------------------------------------------------------------
  console.log('\n2️⃣ Testing Layer 1 Webhook Matching (Exact Ref in Note + Exact Amount)...');
  const rawBody1 = JSON.stringify({
    source: 'android_forwarder',
    text: `Dear Customer, A/c 4321 credited by Rs 799.00 on 18-Oct-26 by UPI/981230491029/${order1.ref}. Bal: Rs 42,000.00`
  });
  const ts1 = Math.floor(Date.now() / 1000);
  const sig1 = computeSignature(SECRET, rawBody1, ts1);

  const webhook1Res = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': ts1.toString(),
      'x-signature': sig1
    },
    body: rawBody1
  });
  const webhook1 = await webhook1Res.json();

  assert(webhook1.ok === true, 'Webhook accepted with HTTP 200');
  assert(webhook1.match_status === 'matched', 'Match status is "matched"');
  assert(webhook1.matched_layer === 'layer1_exact_ref', 'Matched via Layer 1 (exact ref)');

  // Poll status from /api/orders/:ref
  const status1Res = await fetch(`${API_BASE}/orders/${order1.ref}`);
  const status1 = await status1Res.json();
  assert(status1.status === 'paid', 'Order status updated to "paid"');
  assert(status1.confirmed_by === 'webhook', 'Confirmed by webhook');
  assert(status1.paid_amount_paise === 79900, 'Settled amount in paise verified');

  // -------------------------------------------------------------
  // Test 3: Idempotency & Replay Attack Defense
  // -------------------------------------------------------------
  console.log('\n3️⃣ Testing Security Model: Replay Skew Window & Idempotency Deduplication...');
  
  // Re-send exact same webhook -> must be detected as duplicate
  const dupRes = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': ts1.toString(),
      'x-signature': sig1
    },
    body: rawBody1
  });
  const dup = await dupRes.json();
  assert(dup.message === 'duplicate_event_ignored', 'Duplicate event recognized and ignored via event_hash');

  // Stale timestamp (> 300s skew)
  const staleTs = Math.floor(Date.now() / 1000) - 500;
  const staleSig = computeSignature(SECRET, rawBody1, staleTs);
  const staleRes = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': staleTs.toString(),
      'x-signature': staleSig
    },
    body: rawBody1
  });
  assert(staleRes.status === 400, 'Stale timestamp rejected with HTTP 400');

  // Tampered signature
  const tamperedRes = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': ts1.toString(),
      'x-signature': '0000000000000000000000000000000000000000000000000000000000000000'
    },
    body: rawBody1
  });
  assert(tamperedRes.status === 401, 'Tampered HMAC signature rejected with HTTP 401');

  // -------------------------------------------------------------
  // Test 4: Layer 2 Truncated/Dropped Note Matching (Amount + Time Window)
  // -------------------------------------------------------------
  console.log('\n4️⃣ Testing Layer 2 Matching (Bank Truncated/Dropped Ref Note)...');
  const uniquePaise = 184500; // ₹1845.00
  const order2Res = await fetch(`${API_BASE}/upi/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountINR: 1845, name: 'Pooja Hegde', phone: '9845011223' })
  });
  const order2 = await order2Res.json();

  // Send notification with NO reference in note
  const rawBody2 = JSON.stringify({
    source: 'android_forwarder',
    text: `ICICI Bank: Acct XX981 credited with INR 1,845.00 on 18-Oct-26 via UPI txn 992810294819. Net Bal: INR 54,000.00`
  });
  const ts2 = Math.floor(Date.now() / 1000);
  const sig2 = computeSignature(SECRET, rawBody2, ts2);

  const webhook2Res = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': ts2.toString(),
      'x-signature': sig2
    },
    body: rawBody2
  });
  const webhook2 = await webhook2Res.json();

  assert(webhook2.match_status === 'matched', 'Layer 2 matched successfully');
  assert(webhook2.matched_layer === 'layer2_time_window', 'Identified via Layer 2 (amount + 60m window)');

  const status2Res = await fetch(`${API_BASE}/orders/${order2.ref}`);
  const status2 = await status2Res.json();
  assert(status2.status === 'paid', 'Order confirmed paid via Layer 2 resolution');

  // -------------------------------------------------------------
  // Test 5: Layer 3 Amount Mismatch & Human Review Queue
  // -------------------------------------------------------------
  console.log('\n5️⃣ Testing Layer 3 Amount Mismatch (Underpayment Protection)...');
  const order3Res = await fetch(`${API_BASE}/upi/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountINR: 2500, name: 'Aarav Gupta', phone: '9711223344' })
  });
  const order3 = await order3Res.json();

  // Customer paid ₹1500 instead of ₹2500
  const rawBody3 = JSON.stringify({
    source: 'android_forwarder',
    text: `Dear SBI User, your A/c ending 1234 credited by Rs 1500.00 on 18-Oct-26 by UPI/391029481920/${order3.ref}.`
  });
  const ts3 = Math.floor(Date.now() / 1000);
  const sig3 = computeSignature(SECRET, rawBody3, ts3);

  const webhook3Res = await fetch(`${API_BASE}/webhooks/upi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': ts3.toString(),
      'x-signature': sig3
    },
    body: rawBody3
  });
  const webhook3 = await webhook3Res.json();

  assert(webhook3.match_status === 'amount_mismatch', 'Amount mismatch flagged in payment event');

  const status3Res = await fetch(`${API_BASE}/orders/${order3.ref}`);
  const status3 = await status3Res.json();
  assert(status3.status === 'amount_mismatch', 'Order flagged as amount_mismatch in queue (NEVER auto-confirmed)');

  // -------------------------------------------------------------
  // Test 6: Android Forwarder Heartbeat & Health Monitor
  // -------------------------------------------------------------
  console.log('\n6️⃣ Testing Android Forwarder Heartbeat & Ping Monitor...');
  const heartbeatRes = await fetch(`${API_BASE}/webhooks/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_name: 'Android Pixel 4a (Bank SIM 1)',
      battery_level: 98,
      is_charging: 1,
      network_type: 'WiFi (JioFiber_5G)',
      ip_address: '192.168.1.45'
    })
  });
  const heartbeat = await heartbeatRes.json();
  assert(heartbeat.ok === true && heartbeat.status === 'healthy', 'Heartbeat recorded and marked healthy');

  console.log(`\n🎉 ALL ${passed}/${total} SPECIFICATION TESTS PASSED SUCCESSFULLY!`);
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
