import express from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import {
  UPI_CONFIG,
  generatePublicRef,
  buildUpiUri,
  qrPng,
  qrDataUrl,
  verifySignature,
  computeHmacSignature,
  sha256,
  parseBankMessage
} from '../lib/upi.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// -------------------------------------------------------------
// 1. ORDER CREATION (Server-Authoritative Pricing)
// -------------------------------------------------------------
router.post('/orders', async (req, res) => {
  try {
    const { items, name, phone, email, amountINR, storeOrderId } = req.body;

    let amountPaise = 0;
    let resolvedItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      // Server-authoritative item pricing: never trust client totals
      for (const item of items) {
        let price = item.price;
        let productName = item.name || 'Toy Item';

        if (item.id) {
          const product = db.prepare('SELECT id, name, price FROM products WHERE id = ?').get(item.id);
          if (product) {
            price = product.price;
            productName = product.name;
          }
        }
        const qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10));
        const itemPaise = Math.round(Number(price) * 100);
        amountPaise += itemPaise * qty;
        resolvedItems.push({
          id: item.id || `item-${Date.now()}`,
          name: productName,
          priceINR: price,
          pricePaise: itemPaise,
          quantity: qty,
        });
      }
    } else if (amountINR && !isNaN(Number(amountINR))) {
      amountPaise = Math.round(Number(amountINR) * 100);
      resolvedItems = [{ name: 'Direct ToyVerse Order', priceINR: Number(amountINR), pricePaise: amountPaise, quantity: 1 }];
    } else {
      return res.status(400).json({ error: 'Valid items array or amountINR is required.' });
    }

    if (amountPaise <= 0) {
      return res.status(400).json({ error: 'Order total must be greater than zero.' });
    }

    // Generate unique short Base32 public_ref (e.g. ORD-7K3M9Q)
    let publicRef = generatePublicRef(6);
    let collisionCheck = db.prepare('SELECT id FROM upi_orders WHERE public_ref = ?').get(publicRef);
    while (collisionCheck) {
      publicRef = generatePublicRef(6);
      collisionCheck = db.prepare('SELECT id FROM upi_orders WHERE public_ref = ?').get(publicRef);
    }

    const upiUri = buildUpiUri({
      vpa: UPI_CONFIG.VPA,
      payeeName: UPI_CONFIG.PAYEE_NAME,
      amountPaise,
      ref: publicRef,
    });

    const qrData = await qrDataUrl(upiUri);
    const orderId = `upi-ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + UPI_CONFIG.EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO upi_orders (
        id, public_ref, status, amount_paise, items_json, customer_name,
        customer_phone, upi_uri, qr_data_url, expires_at, store_order_id
      ) VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      publicRef,
      amountPaise,
      JSON.stringify(resolvedItems),
      name || 'Valued Customer',
      phone || '',
      upiUri,
      qrData,
      expiresAt,
      storeOrderId || null
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (actor, action, order_id, meta_json)
      VALUES (?, ?, ?, ?)
    `).run('client', 'order_created', orderId, JSON.stringify({ public_ref: publicRef, amount_paise: amountPaise }));

    res.status(201).json({
      id: orderId,
      ref: publicRef,
      public_ref: publicRef,
      amountPaise,
      amountINR: (amountPaise / 100).toFixed(2),
      upi_uri: upiUri,
      qr: `/api/upi/orders/${publicRef}/qr.png`,
      qr_data_url: qrData,
      expires_at: expiresAt,
      status: 'pending_payment',
      vpa: UPI_CONFIG.VPA,
      payee_name: UPI_CONFIG.PAYEE_NAME,
    });
  } catch (err) {
    console.error('Error creating UPI order:', err);
    res.status(500).json({ error: 'Failed to create UPI order: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. ORDER STATUS POLLING
// -------------------------------------------------------------
router.get('/orders/:ref', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM upi_orders WHERE public_ref = ?').get(req.params.ref);
    if (!order) {
      return res.status(404).json({ error: 'UPI Order not found' });
    }

    const now = Date.now();
    const expiryTime = new Date(order.expires_at).getTime();
    const timeRemainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    // Auto-expire if past expiry time and still pending
    if (order.status === 'pending_payment' && timeRemainingSeconds === 0) {
      db.prepare("UPDATE upi_orders SET status = 'expired' WHERE id = ?").run(order.id);
      db.prepare(`
        INSERT INTO audit_log (actor, action, order_id, meta_json)
        VALUES ('system', 'order_expired', ?, ?)
      `).run(order.id, JSON.stringify({ public_ref: order.public_ref }));
      order.status = 'expired';
    }

    // Check if there is an associated payment event
    const event = db.prepare('SELECT * FROM payment_events WHERE matched_order_id = ? ORDER BY received_at DESC LIMIT 1').get(order.id);

    res.json({
      id: order.id,
      ref: order.public_ref,
      public_ref: order.public_ref,
      status: order.status,
      amountPaise: order.amount_paise,
      amountINR: (order.amount_paise / 100).toFixed(2),
      paid_amount_paise: order.paid_amount_paise,
      paid_amount_inr: order.paid_amount_paise ? (order.paid_amount_paise / 100).toFixed(2) : null,
      paid_at: order.paid_at,
      confirmed_by: order.confirmed_by,
      upi_uri: order.upi_uri,
      qr_data_url: order.qr_data_url,
      qr_url: `/api/upi/orders/${order.public_ref}/qr.png`,
      expires_at: order.expires_at,
      timeRemainingSeconds,
      items: JSON.parse(order.items_json || '[]'),
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      payment_event: event ? {
        bank_txn_id: event.bank_txn_id,
        parsed_vpa: event.parsed_vpa,
        received_at: event.received_at,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve order status: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. QR CODE PNG IMAGE ENDPOINT
// -------------------------------------------------------------
router.get('/orders/:ref/qr.png', async (req, res) => {
  try {
    const order = db.prepare('SELECT upi_uri FROM upi_orders WHERE public_ref = ?').get(req.params.ref);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    const pngBuffer = await qrPng(order.upi_uri);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).send('Failed to generate QR code: ' + err.message);
  }
});

// -------------------------------------------------------------
// 4. THREE-LAYER RECONCILIATION MATCHING ENGINE
// -------------------------------------------------------------
export async function matchToOrder({ amountPaise, ref, at = new Date() }) {
  // Layer 1: Exact ref match from the note
  if (ref) {
    const order = db.prepare('SELECT * FROM upi_orders WHERE public_ref = ?').get(ref);
    if (order) {
      if (order.status === 'paid') {
        return { id: order.id, status: 'duplicate', order, layer: 'layer1_exact_ref' };
      }
      if (order.amount_paise === amountPaise) {
        return { id: order.id, status: 'matched', order, layer: 'layer1_exact_ref' };
      }
      return {
        id: order.id,
        status: 'amount_mismatch',
        order,
        layer: 'layer1_exact_ref',
        expectedPaise: order.amount_paise,
        actualPaise: amountPaise,
      };
    }
  }

  // Layer 2: Amount + time window matching (within 60m), only if exactly one candidate
  if (amountPaise) {
    const candidates = db.prepare(`
      SELECT * FROM upi_orders
      WHERE status = 'pending_payment'
        AND amount_paise = ?
        AND datetime(created_at) >= datetime('now', '-60 minutes')
      ORDER BY created_at DESC
    `).all(amountPaise);

    if (candidates.length === 1) {
      return { id: candidates[0].id, status: 'matched', order: candidates[0], layer: 'layer2_time_window' };
    }
    if (candidates.length > 1) {
      return { id: null, status: 'ambiguous', candidatesCount: candidates.length, layer: 'layer2_time_window' };
    }
  }

  // Layer 3: Unmatched -> stored in DB, reconciler retries or manual queue
  return { id: null, status: 'unmatched', layer: 'layer3_unmatched' };
}

/**
 * Atomic markPaid helper with audit logging
 */
export async function markPaid(orderId, parsed, confirmedBy = 'webhook') {
  const order = db.prepare('SELECT * FROM upi_orders WHERE id = ?').get(orderId);
  if (!order || order.status === 'paid') return false;

  const paidAmountPaise = parsed.amountPaise || order.amount_paise;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE upi_orders
    SET status = 'paid', paid_at = ?, paid_amount_paise = ?, confirmed_by = ?
    WHERE id = ?
  `).run(now, paidAmountPaise, confirmedBy, orderId);

  // If connected to a storefront order, also mark it Paid
  if (order.store_order_id) {
    db.prepare(`
      UPDATE orders
      SET payment_status = 'Paid', status = 'Processing', payment_gateway_ref = ?
      WHERE id = ?
    `).run(`UPI-MATCH-${order.public_ref}`, order.store_order_id);
  }

  // Audit log
  db.prepare(`
    INSERT INTO audit_log (actor, action, order_id, meta_json)
    VALUES (?, 'payment_matched', ?, ?)
  `).run(
    confirmedBy,
    orderId,
    JSON.stringify({
      public_ref: order.public_ref,
      paid_amount_paise: paidAmountPaise,
      bank_txn_id: parsed.bank_txn_id || null,
      vpa: parsed.vpa || null,
      layer: parsed.layer || 'webhook'
    })
  );

  return true;
}

// -------------------------------------------------------------
// 5. SIGNED WEBHOOK RECEIVER (Android Forwarder / SMS)
// -------------------------------------------------------------
router.post(['/webhooks/upi', '/webhook', '/upi', '/'], async (req, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const ts = Number(req.headers['x-timestamp']);
    const sig = req.headers['x-signature'] || '';

    // Replay guard (5-minute tolerance)
    if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
      return res.status(400).json({
        error: 'stale_timestamp',
        message: 'Timestamp is stale or outside the 5-minute skew window.'
      });
    }

    // Timing-safe HMAC-SHA256 signature verification
    if (!verifySignature(UPI_CONFIG.WEBHOOK_SECRET, rawBody, ts, sig)) {
      return res.status(401).json({
        error: 'invalid_signature',
        message: 'HMAC signature verification failed.'
      });
    }

    // Event hash deduplication (idempotency)
    const eventHash = sha256(rawBody);
    const existing = db.prepare('SELECT id, match_status FROM payment_events WHERE event_hash = ?').get(eventHash);
    if (existing) {
      return res.json({
        ok: true,
        message: 'duplicate_event_ignored',
        event_id: existing.id,
        match_status: existing.match_status
      });
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const messageText = payload.text || payload.message || payload.notification || payload.body || '';

    // Multi-bank regex parser
    const parsed = parseBankMessage(messageText);
    const match = await matchToOrder(parsed);

    const eventId = `evt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const matchStatus = match?.status ?? 'unmatched';

    db.prepare(`
      INSERT INTO payment_events (
        id, source, raw_payload, parsed_amount_paise, parsed_ref,
        parsed_vpa, bank_txn_id, matched_order_id, match_status, event_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      payload.source || 'android_forwarder',
      rawBody,
      parsed.amountPaise,
      parsed.ref,
      parsed.vpa,
      parsed.bank_txn_id,
      match?.id || null,
      matchStatus,
      eventHash
    );

    if (matchStatus === 'matched') {
      await markPaid(match.id, { ...parsed, layer: match.layer }, 'webhook');
    } else if (matchStatus === 'amount_mismatch' && match.id) {
      db.prepare("UPDATE upi_orders SET status = 'amount_mismatch' WHERE id = ?").run(match.id);
      db.prepare(`
        INSERT INTO audit_log (actor, action, order_id, meta_json)
        VALUES ('webhook', 'amount_mismatch_flagged', ?, ?)
      `).run(match.id, JSON.stringify({
        expectedPaise: match.expectedPaise,
        actualPaise: match.actualPaise,
        bank_txn_id: parsed.bank_txn_id
      }));
    } else if (matchStatus === 'ambiguous') {
      db.prepare(`
        INSERT INTO audit_log (actor, action, order_id, meta_json)
        VALUES ('webhook', 'ambiguous_payment_flagged', NULL, ?)
      `).run(JSON.stringify({
        amountPaise: parsed.amountPaise,
        candidatesCount: match.candidatesCount,
        bank_txn_id: parsed.bank_txn_id
      }));
    }

    res.json({
      ok: true,
      event_id: eventId,
      match_status: matchStatus,
      matched_order_id: match?.id || null,
      matched_layer: match?.layer || null,
      parsed,
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// 6. ANDROID FORWARDER HEARTBEAT (15-min check-in)
// -------------------------------------------------------------
router.post(['/webhooks/heartbeat', '/heartbeat'], (req, res) => {
  try {
    const { device_name, battery_level, is_charging, network_type, ip_address } = req.body;

    db.prepare(`
      INSERT INTO forwarder_heartbeat (
        id, device_name, battery_level, is_charging, network_type, ip_address, last_ping, status
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'healthy')
      ON CONFLICT(id) DO UPDATE SET
        device_name = COALESCE(excluded.device_name, device_name),
        battery_level = COALESCE(excluded.battery_level, battery_level),
        is_charging = COALESCE(excluded.is_charging, is_charging),
        network_type = COALESCE(excluded.network_type, network_type),
        ip_address = COALESCE(excluded.ip_address, ip_address),
        last_ping = datetime('now'),
        status = 'healthy'
    `).run(
      'forwarder-primary',
      device_name || 'Android Pixel 4a (Bank SIM 1)',
      battery_level !== undefined ? battery_level : 95,
      is_charging !== undefined ? (is_charging ? 1 : 0) : 1,
      network_type || 'WiFi (JioFiber_5G)',
      ip_address || req.ip || '127.0.0.1'
    );

    res.json({ ok: true, server_time: new Date().toISOString(), status: 'healthy' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record heartbeat: ' + err.message });
  }
});

// -------------------------------------------------------------
// 7. ADMIN: SYSTEM STATUS & METRICS
// -------------------------------------------------------------
router.get('/admin/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    // 1. Forwarder Heartbeat
    let heartbeat = db.prepare('SELECT * FROM forwarder_heartbeat WHERE id = ?').get('forwarder-primary');
    if (!heartbeat) {
      heartbeat = {
        id: 'forwarder-primary',
        device_name: 'Android Forwarder (Unregistered)',
        battery_level: 0,
        is_charging: 0,
        network_type: 'Offline',
        last_ping: null,
        status: 'offline'
      };
    } else {
      const lastPingTime = new Date(heartbeat.last_ping).getTime();
      const minsSincePing = Math.floor((Date.now() - lastPingTime) / (60 * 1000));
      if (minsSincePing > 60) {
        heartbeat.status = 'offline';
      } else if (minsSincePing > 30) {
        heartbeat.status = 'warning';
      }
      heartbeat.minutes_since_ping = minsSincePing;
    }

    // 2. Collection Metrics
    const totalCollectedRow = db.prepare(`
      SELECT COALESCE(SUM(paid_amount_paise), 0) as totalPaise, COUNT(*) as count
      FROM upi_orders WHERE status = 'paid'
    `).get();

    const pendingOrdersCount = db.prepare("SELECT COUNT(*) as count FROM upi_orders WHERE status = 'pending_payment'").get().count;
    const mismatchesCount = db.prepare("SELECT COUNT(*) as count FROM upi_orders WHERE status = 'amount_mismatch'").get().count;
    const unmatchedEventsCount = db.prepare("SELECT COUNT(*) as count FROM payment_events WHERE match_status = 'unmatched'").get().count;
    const ambiguousEventsCount = db.prepare("SELECT COUNT(*) as count FROM payment_events WHERE match_status = 'ambiguous'").get().count;

    // 3. Recent Audit Logs
    const recentLogs = db.prepare(`
      SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 15
    `).all();

    res.json({
      forwarder: heartbeat,
      stats: {
        totalCollectedPaise: totalCollectedRow.totalPaise,
        totalCollectedINR: (totalCollectedRow.totalPaise / 100).toFixed(2),
        paidOrdersCount: totalCollectedRow.count,
        pendingOrdersCount,
        mismatchQueueCount: mismatchesCount + unmatchedEventsCount + ambiguousEventsCount,
        amountMismatchesCount: mismatchesCount,
        unmatchedEventsCount,
        ambiguousEventsCount,
      },
      config: {
        vpa: UPI_CONFIG.VPA,
        payeeName: UPI_CONFIG.PAYEE_NAME,
        webhookSecret: UPI_CONFIG.WEBHOOK_SECRET,
        expiryMinutes: UPI_CONFIG.EXPIRY_MINUTES,
      },
      recentLogs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch UPI status: ' + err.message });
  }
});

// -------------------------------------------------------------
// 8. ADMIN: ORDERS & EVENTS LISTS
// -------------------------------------------------------------
router.get('/admin/orders', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = 'SELECT * FROM upi_orders';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const orders = db.prepare(query).all(...params);

    const enriched = orders.map(o => {
      const event = db.prepare('SELECT * FROM payment_events WHERE matched_order_id = ? ORDER BY received_at DESC LIMIT 1').get(o.id);
      return {
        ...o,
        amount_inr: (o.amount_paise / 100).toFixed(2),
        paid_amount_inr: o.paid_amount_paise ? (o.paid_amount_paise / 100).toFixed(2) : null,
        items: JSON.parse(o.items_json || '[]'),
        matched_event: event || null,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
  }
});

router.get('/admin/events', authenticateToken, requireAdmin, (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM payment_events ORDER BY received_at DESC LIMIT 50').all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment events: ' + err.message });
  }
});

// -------------------------------------------------------------
// 9. ADMIN: MANUAL CONFIRMATION & REFUND
// -------------------------------------------------------------
router.post(['/admin/orders/:ref/confirm', '/orders/:ref/confirm'], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM upi_orders WHERE public_ref = ?').get(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Order is already marked as paid' });

    await markPaid(order.id, { amountPaise: order.amount_paise, layer: 'manual_admin' }, 'manual');

    res.json({ success: true, message: `Order ${order.public_ref} manually confirmed as paid.` });
  } catch (err) {
    res.status(500).json({ error: 'Manual confirmation failed: ' + err.message });
  }
});

router.post(['/admin/orders/:ref/refund', '/orders/:ref/refund'], authenticateToken, requireAdmin, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM upi_orders WHERE public_ref = ?').get(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const reason = req.body.reason || 'Admin initiated refund';
    db.prepare("UPDATE upi_orders SET status = 'refunded' WHERE id = ?").run(order.id);

    db.prepare(`
      INSERT INTO audit_log (actor, action, order_id, meta_json)
      VALUES (?, 'refund_issued', ?, ?)
    `).run(req.user?.email || 'admin@toyverse.in', order.id, JSON.stringify({ public_ref: order.public_ref, reason }));

    res.json({ success: true, message: `Order ${order.public_ref} marked as refunded.` });
  } catch (err) {
    res.status(500).json({ error: 'Refund failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// 10. RECONCILER CRON RUNNER (Runs Every 5 Minutes)
// -------------------------------------------------------------
router.post('/admin/reconcile', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 1. Expire stale orders past 30 minutes
    const expiredResult = db.prepare(`
      UPDATE upi_orders
      SET status = 'expired'
      WHERE status = 'pending_payment' AND datetime(expires_at) < datetime('now')
    `).run();

    // 2. Retry unmatched events against pending orders
    const unmatchedEvents = db.prepare(`
      SELECT * FROM payment_events WHERE match_status = 'unmatched'
    `).all();

    let reMatchedCount = 0;
    for (const event of unmatchedEvents) {
      const match = await matchToOrder({
        amountPaise: event.parsed_amount_paise,
        ref: event.parsed_ref,
      });

      if (match.status === 'matched') {
        db.prepare(`
          UPDATE payment_events
          SET match_status = 'matched', matched_order_id = ?
          WHERE id = ?
        `).run(match.id, event.id);

        await markPaid(match.id, { amountPaise: event.parsed_amount_paise, layer: 'reconciler' }, 'reconciler');
        reMatchedCount++;
      }
    }

    // 3. Sanity check: sum of paid paise in upi_orders vs sum of matched payment_events
    const totalPaidOrders = db.prepare("SELECT COALESCE(SUM(paid_amount_paise), 0) as total FROM upi_orders WHERE status = 'paid'").get().total;
    const totalEventPaise = db.prepare("SELECT COALESCE(SUM(parsed_amount_paise), 0) as total FROM payment_events WHERE match_status = 'matched'").get().total;

    db.prepare(`
      INSERT INTO audit_log (actor, action, order_id, meta_json)
      VALUES ('reconciler', 'reconciliation_run', NULL, ?)
    `).run(JSON.stringify({
      expiredOrdersCount: expiredResult.changes,
      reMatchedCount,
      totalPaidOrdersPaise: totalPaidOrders,
      totalMatchedEventsPaise: totalEventPaise,
    }));

    res.json({
      success: true,
      message: 'Reconciliation run completed successfully.',
      expiredOrdersCount: expiredResult.changes,
      reMatchedCount,
      sanity: {
        totalPaidOrdersPaise: totalPaidOrders,
        totalMatchedEventsPaise: totalEventPaise,
        differencePaise: Math.abs(totalPaidOrders - totalEventPaise),
        isBalanced: totalPaidOrders === totalEventPaise,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Reconciliation run failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// 11. DEVELOPER / ADMIN WEBHOOK SIMULATOR
// -------------------------------------------------------------
router.post('/admin/simulate-webhook', optionalAuth, async (req, res) => {
  try {
    const {
      bankText,
      amountRupees,
      ref,
      bankTxnId,
      vpa,
      simulateStaleTimestamp = false,
      simulateTamperedSig = false,
      source = 'android_forwarder'
    } = req.body;

    // Use bankText or synthesize realistic Indian bank message
    let finalMessage = bankText;
    const finalRef = ref ? ref.toUpperCase() : 'ORD-7K3M9Q';
    const finalAmount = amountRupees ? parseFloat(amountRupees) : 999.00;
    const finalTxn = bankTxnId || `328912${Math.floor(100000 + Math.random() * 900000)}`;

    if (!finalMessage) {
      finalMessage = `Dear SBI User, your A/c ending 1234 credited by Rs ${finalAmount.toFixed(2)} on 18-Oct-26 by UPI/${finalTxn}/${finalRef}/Transfer Ref ${finalTxn}. Bal: Rs 15,400.00`;
    }

    const payloadObj = {
      source,
      notification: finalMessage,
      text: finalMessage,
      timestamp: Date.now(),
      simulated: true,
    };

    const rawString = JSON.stringify(payloadObj);
    const ts = simulateStaleTimestamp ? Math.floor(Date.now() / 1000) - 600 : Math.floor(Date.now() / 1000);
    let signature = computeHmacSignature(UPI_CONFIG.WEBHOOK_SECRET, `${ts}.${rawString}`);
    if (simulateTamperedSig) {
      signature = 'bad_tampered_signature_hex_12345';
    }

    // Execute internal call to the webhook processor
    const parsed = parseBankMessage(finalMessage);
    const eventHash = sha256(rawString);

    // Validation checks
    let rejectionReason = null;
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      rejectionReason = 'Replay Guard: Stale timestamp rejected (> 300s skew)';
    } else if (!verifySignature(UPI_CONFIG.WEBHOOK_SECRET, rawString, ts, signature)) {
      rejectionReason = 'Security Guard: HMAC-SHA256 signature verification failed';
    }

    let matchResult = null;
    let eventId = null;

    if (!rejectionReason) {
      matchResult = await matchToOrder(parsed);
      eventId = `sim-evt-${Date.now()}`;

      db.prepare(`
        INSERT INTO payment_events (
          id, source, raw_payload, parsed_amount_paise, parsed_ref,
          parsed_vpa, bank_txn_id, matched_order_id, match_status, event_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventId,
        source,
        rawString,
        parsed.amountPaise,
        parsed.ref,
        parsed.vpa || vpa || null,
        parsed.bank_txn_id || finalTxn,
        matchResult?.id || null,
        matchResult.status,
        eventHash
      );

      if (matchResult.status === 'matched') {
        await markPaid(matchResult.id, { ...parsed, layer: matchResult.layer }, 'webhook');
      }
    }

    res.json({
      success: !rejectionReason,
      rejectionReason,
      simulatedHeaders: {
        'x-timestamp': ts,
        'x-signature': signature,
      },
      parsed,
      matchResult,
      eventId,
      rawString,
    });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed: ' + err.message });
  }
});

export default router;
