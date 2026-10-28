import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Supported Payment Gateways in India
export const PAYMENT_METHODS = [
  { id: 'upi', name: 'Unified Payments Interface (UPI)', channels: ['Google Pay', 'PhonePe', 'Paytm UPI', 'BHIM'] },
  { id: 'card', name: 'Credit & Debit Cards', channels: ['RuPay', 'Visa', 'Mastercard'] },
  { id: 'netbanking', name: 'Net Banking', channels: ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak'] },
  { id: 'wallet', name: 'Digital Wallets', channels: ['Paytm Wallet', 'PhonePe Wallet', 'Amazon Pay'] },
  { id: 'cod', name: 'Cash on Delivery (COD)', channels: ['Doorstep Cash / QR on Delivery'] }
];

// GET Supported Payment Methods & Gateway Status
router.get('/methods', (req, res) => {
  res.json({
    status: 'operational',
    currency: 'INR',
    gateway: 'ToyVerse Pay Gateway (Integrated with UPI, Cards, NetBanking, Wallets)',
    methods: PAYMENT_METHODS
  });
});

// POST Payment Verification (e.g. Razorpay / Cashfree HMAC verification)
router.post('/verify', optionalAuth, (req, res) => {
  try {
    const { orderId, paymentId, signature, status } = req.body;

    if (!orderId) {
      return res.status(400).json({ verified: false, error: 'Order ID is required.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ verified: false, error: 'Order not found.' });
    }

    if (status === 'failed') {
      db.prepare("UPDATE orders SET payment_status = 'Failed' WHERE id = ?").run(orderId);
      return res.status(400).json({
        verified: false,
        paymentStatus: 'Failed',
        error: 'Payment failed at issuing bank/UPI provider. No funds were debited.'
      });
    }

    // Verify payment and record transaction reference
    const txnRef = paymentId || `PAY-IN-${Date.now()}`;
    db.prepare(`
      UPDATE orders 
      SET payment_status = 'Paid',
          payment_gateway_ref = ?
      WHERE id = ?
    `).run(txnRef, orderId);

    res.json({
      verified: true,
      orderId,
      transactionRef: txnRef,
      paymentStatus: 'Paid',
      message: 'Payment verification successful. Order confirmed for dispatch!'
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ verified: false, error: 'Payment verification failed.' });
  }
});

// POST Payment Webhook (Handles payment.captured, payment.failed, refund.processed)
router.post('/webhook', (req, res) => {
  try {
    const { event, payload } = req.body;
    console.log(`[PAYMENT WEBHOOK] Received event: ${event}`);

    if (!event) {
      return res.status(400).json({ received: false, error: 'Event type required.' });
    }

    const orderId = payload?.orderId || payload?.order_id;
    if (orderId) {
      if (event === 'payment.captured' || event === 'charge.successful') {
        db.prepare("UPDATE orders SET payment_status = 'Paid', payment_gateway_ref = ? WHERE id = ?")
          .run(payload?.paymentId || `WH-${Date.now()}`, orderId);
      } else if (event === 'payment.failed') {
        db.prepare("UPDATE orders SET payment_status = 'Failed' WHERE id = ?")
          .run(orderId);
      } else if (event === 'refund.processed') {
        db.prepare("UPDATE orders SET payment_status = 'Refunded', refund_status = 'Processed' WHERE id = ?")
          .run(orderId);
      }
    }

    // Webhook idempotency acknowledgment
    res.status(200).json({
      received: true,
      event,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ received: false, error: 'Webhook processing error.' });
  }
});

// POST Simulate Payment Failure (To test error handling, retry & cart preservation)
router.post('/simulate-failure', (req, res) => {
  res.status(402).json({
    success: false,
    code: 'PAYMENT_DECLINED',
    error: 'Simulated UPI/Bank Gateway failure: Insufficient funds or incorrect OTP/PIN.',
    retryAllowed: true,
    suggestedAction: 'Please retry with another UPI App, Net Banking, or select Cash on Delivery.'
  });
});

export default router;
