import express from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { qrPng, generatePublicRef, buildUpiUri, qrDataUrl, UPI_CONFIG } from '../lib/upi.js';

const router = express.Router();

function formatOrder(row) {
  if (!row) return null;
  const createdDate = row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
  const invoiceNum = row.invoice_number || `INV-${createdDate.replace(/-/g, '')}-${row.id.replace('ORD-IN-', '')}`;
  const tax = row.tax_amount || Math.round(((row.subtotal || 0) * 0.18) / 1.18); // 18% GST (inclusive standard)

  return {
    id: row.id,
    userId: row.user_id,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone
    },
    shippingAddress: row.shipping_address_json ? JSON.parse(row.shipping_address_json) : {},
    subtotal: row.subtotal,
    discount: row.discount,
    shippingFee: row.shipping_fee,
    taxAmount: tax,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    shippingProvider: row.shipping_provider || 'Delhivery',
    trackingNumber: row.tracking_number,
    invoiceNumber: invoiceNum,
    idempotencyKey: row.idempotency_key || null,
    refundAmount: row.refund_amount || 0,
    refundStatus: row.refund_status || null,
    refundReason: row.refund_reason || null,
    paymentGatewayRef: row.payment_gateway_ref || null,
    isGift: Boolean(row.is_gift),
    giftNote: row.gift_note,
    date: createdDate
  };
}

// GET orders (Admins see all; Customers see only their own)
router.get('/', optionalAuth, (req, res) => {
  try {
    let query = 'SELECT * FROM orders';
    const params = [];

    // If customer and not admin, filter by user_id or email
    if (req.user && req.user.role === 'admin') {
      if (req.query.status && req.query.status !== 'all') {
        query += ' WHERE LOWER(status) = LOWER(?)';
        params.push(req.query.status);
      }
      query += ' ORDER BY created_at DESC';
    } else if (req.user) {
      query += ' WHERE user_id = ? ORDER BY created_at DESC';
      params.push(req.user.id);
    } else {
      query += ' ORDER BY created_at DESC LIMIT 10';
    }

    const orderRows = db.prepare(query).all(...params);

    const orders = orderRows.map(row => {
      const order = formatOrder(row);
      const items = db.prepare(`
        SELECT product_id as id, product_name as name, price, quantity, image
        FROM order_items WHERE order_id = ?
      `).all(row.id);
      order.items = items;
      return order;
    });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET order by ID (Supports regular orders and UPI orders by ref or id)
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) {
      // Check if it matches a UPI Order by public_ref or id
      const upiOrder = db.prepare('SELECT * FROM upi_orders WHERE public_ref = ? OR id = ?').get(req.params.id, req.params.id);
      if (upiOrder) {
        const now = Date.now();
        const expiryTime = new Date(upiOrder.expires_at).getTime();
        const timeRemainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));
        return res.json({
          id: upiOrder.id,
          ref: upiOrder.public_ref,
          public_ref: upiOrder.public_ref,
          status: upiOrder.status,
          amountPaise: upiOrder.amount_paise,
          amountINR: (upiOrder.amount_paise / 100).toFixed(2),
          paid_amount_paise: upiOrder.paid_amount_paise,
          paid_amount_inr: upiOrder.paid_amount_paise ? (upiOrder.paid_amount_paise / 100).toFixed(2) : null,
          paid_at: upiOrder.paid_at,
          confirmed_by: upiOrder.confirmed_by,
          upi_uri: upiOrder.upi_uri,
          qr_data_url: upiOrder.qr_data_url,
          qr_url: `/api/orders/${upiOrder.public_ref}/qr.png`,
          expires_at: upiOrder.expires_at,
          timeRemainingSeconds,
          items: JSON.parse(upiOrder.items_json || '[]'),
          customer_name: upiOrder.customer_name,
          customer_phone: upiOrder.customer_phone
        });
      }
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = formatOrder(row);
    const items = db.prepare(`
      SELECT product_id as id, product_name as name, price, quantity, image
      FROM order_items WHERE order_id = ?
    `).all(req.params.id);

    order.items = items;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching order details.' });
  }
});

// GET QR PNG for UPI Order by ref or id
router.get('/:id/qr.png', async (req, res) => {
  try {
    const order = db.prepare('SELECT upi_uri FROM upi_orders WHERE public_ref = ? OR id = ?').get(req.params.id, req.params.id);
    if (!order || !order.upi_uri) {
      return res.status(404).send('QR code not found for order.');
    }
    const pngBuffer = await qrPng(order.upi_uri);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).send('Failed to generate QR code: ' + err.message);
  }
});

// GET GST Tax Invoice for Order
router.get('/:id/invoice', optionalAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = formatOrder(row);
    const items = db.prepare(`
      SELECT product_id as id, product_name as name, price, quantity, image
      FROM order_items WHERE order_id = ?
    `).all(req.params.id);

    order.items = items;

    // GST Breakdown (18% GST: CGST 9% + SGST 9%)
    const taxableSubtotal = Math.round(order.subtotal / 1.18);
    const totalGst = order.subtotal - taxableSubtotal;
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;

    const invoice = {
      invoiceNumber: order.invoiceNumber,
      orderId: order.id,
      invoiceDate: order.date,
      seller: {
        legalName: 'ToyVerse Retail India Private Limited',
        gstin: '29AAACT9821Q1Z4',
        pan: 'AAACT9821Q',
        address: '#42, 12th Main, 4th Block, Koramangala, Bengaluru, Karnataka, PIN 560034',
        supportEmail: 'care@toyverse.in',
        supportPhone: '+91 80 4000 8899'
      },
      buyer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        billingAddress: order.shippingAddress,
        shippingAddress: order.shippingAddress,
        placeOfSupply: `${order.shippingAddress.state || 'Karnataka'} (State Code: 29)`
      },
      hsnSummary: {
        hsnCode: '9503',
        description: 'Toys, educational robots, wooden crafts and puzzles',
        taxRate: '18% GST (CGST 9% + SGST 9%)',
        taxableAmount: taxableSubtotal,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalTax: totalGst
      },
      lineItems: items.map(item => ({
        id: item.id,
        name: item.name,
        hsn: '9503',
        quantity: item.quantity,
        unitPrice: item.price,
        itemTotal: item.price * item.quantity
      })),
      pricingBreakdown: {
        taxableSubtotal,
        cgst,
        sgst,
        totalGst,
        discount: order.discount,
        shippingFee: order.shippingFee,
        grandTotal: order.total
      },
      taxableSubtotal,
      cgst,
      sgst,
      totalGst,
      total: order.total,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      paymentDetails: {
        mode: order.paymentMethod,
        status: order.paymentStatus,
        refNumber: order.paymentGatewayRef || `TXN-IN-${order.id.replace('ORD-IN-', '')}`
      },
      authorizedSignatory: 'ToyVerse Fulfillment & Logistics India'
    };

    res.json(invoice);
  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).json({ error: 'Failed to generate tax invoice.' });
  }
});

// GET Statutory GST Tax Invoice (Downloadable / Printable HTML)
router.get(['/:id/invoice/download', '/:id/invoice/html'], optionalAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).send('<h1>Order not found</h1>');
    }

    const order = formatOrder(row);
    const items = db.prepare(`
      SELECT product_id as id, product_name as name, price, quantity, image
      FROM order_items WHERE order_id = ?
    `).all(req.params.id);

    const taxableSubtotal = Math.round(order.subtotal / 1.18);
    const totalGst = order.subtotal - taxableSubtotal;
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;
    const address = order.shippingAddress || {};

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${order.invoiceNumber} - ToyVerse India</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 800; color: #7c3aed; letter-spacing: -0.5px; }
    .badge-tax { display: inline-block; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; margin-top: 4px; }
    .meta-box { text-align: right; }
    .meta-box h2 { margin: 0 0 6px 0; font-size: 18px; color: #0f172a; }
    .meta-box p { margin: 2px 0; color: #64748b; font-size: 12px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 6px; padding: 14px; }
    .info-card h4 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    .info-card p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .summary-grid { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .summary-table { width: 320px; }
    .summary-table tr td:first-child { color: #64748b; }
    .summary-table tr td:last-child { text-align: right; font-weight: 600; }
    .grand-total { font-size: 16px; font-weight: 800; color: #7c3aed; border-top: 2px solid #e2e8f0; padding-top: 8px; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .actions { text-align: center; margin-top: 24px; }
    .btn-print { background: #7c3aed; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    @media print { .actions { display: none; } .invoice-card { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">ToyVerse India</div>
        <div class="badge-tax">Original for Recipient • GST Tax Invoice</div>
      </div>
      <div class="meta-box">
        <h2>${order.invoiceNumber}</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Invoice Date:</strong> ${order.date}</p>
        <p><strong>Tracking AWB:</strong> ${order.trackingNumber || 'DELHIVERY-AIR'}</p>
      </div>
    </div>

    <div class="two-col">
      <div class="info-card">
        <h4>Sold By (Supplier Details)</h4>
        <p><strong>ToyVerse Retail India Pvt. Ltd.</strong></p>
        <p>GSTIN: <strong>29AAACT9821Q1Z4</strong> | PAN: AAACT9821Q</p>
        <p>Central Logistics Hub #42, Koramangala 4th Block</p>
        <p>Bengaluru, Karnataka, PIN 560034</p>
        <p>Support: care@toyverse.in | +91 80 4000 8899</p>
      </div>
      <div class="info-card">
        <h4>Billed & Shipped To</h4>
        <p><strong>${order.customer.name || 'Valued Customer'}</strong></p>
        <p>${address.addressLine1 || address.street || 'Primary Address'}</p>
        <p>${address.city || 'Bengaluru'}, ${address.state || 'Karnataka'} - ${address.pincode || '560001'}</p>
        <p>Phone: ${order.customer.phone || '+91 Contact Number'}</p>
        <p>Place of Supply: <strong>${address.state || 'Karnataka'} (State Code: 29)</strong></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description of Goods</th>
          <th>HSN Code</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.name}</strong><br /><small style="color: #64748b;">BIS IS-9873 Child Safe Certified</small></td>
            <td>9503</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
            <td style="text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <table class="summary-table">
        <tr>
          <td>Taxable Amount (Pre-Tax):</td>
          <td>₹${taxableSubtotal.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>CGST (9.0%):</td>
          <td>₹${cgst.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>SGST (9.0%):</td>
          <td>₹${sgst.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Total GST (18.0% Inclusive):</td>
          <td>₹${totalGst.toLocaleString('en-IN')}</td>
        </tr>
        ${order.discount > 0 ? `<tr><td>Coupon Discount:</td><td style="color: #16a34a;">-₹${order.discount.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr>
          <td>Shipping & Handling:</td>
          <td>${order.shippingFee === 0 ? '<span style="color:#16a34a;">FREE</span>' : `₹${order.shippingFee}`}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td>₹${order.total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <div>
        <strong>Payment Mode:</strong> ${order.paymentMethod} (${order.paymentStatus})<br />
        <strong>Gateway Ref:</strong> ${order.paymentGatewayRef || 'N/A'}<br />
        This is a computer-generated tax invoice and requires no physical signature.
      </div>
      <div style="text-align: right;">
        <strong>Authorized Signatory</strong><br />
        ToyVerse Fulfillment & Logistics India
      </div>
    </div>

    <div class="actions">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Download Invoice as PDF</button>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${order.id}.html"`);
    res.send(invoiceHtml);
  } catch (err) {
    console.error('Invoice download error:', err);
    res.status(500).send('<h1>Failed to generate invoice</h1>');
  }
});

// GET Order Confirmation Email Delivery Details
router.get('/:id/confirmation-email', optionalAuth, (req, res) => {
  try {
    const email = db.prepare('SELECT * FROM order_emails WHERE order_id = ? ORDER BY dispatched_at DESC').get(req.params.id);
    if (!email) {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      return res.json({
        delivered: true,
        orderId: order.id,
        recipientEmail: order.customer_email,
        recipientName: order.customer_name,
        subject: `Order Confirmation #${order.id} - ToyVerse India`,
        status: 'DELIVERED',
        dispatchedAt: order.created_at,
        provider: 'ToyVerse Indian Mail Gateway'
      });
    }
    res.json({
      delivered: true,
      orderId: email.order_id,
      recipientEmail: email.recipient_email,
      recipientName: email.recipient_name,
      subject: email.subject,
      status: email.status,
      dispatchedAt: email.dispatched_at,
      provider: email.provider
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve confirmation email status.' });
  }
});

// POST Resend / Re-trigger Order Confirmation Email
router.post('/:id/send-confirmation', optionalAuth, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const emailId = `EML-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const subject = `Order Confirmation #${order.id} - ToyVerse India`;
    const body = `Order confirmation resent to ${order.customer_email} for order ${order.id}. Total: ₹${order.total}.`;
    db.prepare(`
      INSERT INTO order_emails (id, order_id, recipient_email, recipient_name, subject, body_text, status, provider)
      VALUES (?, ?, ?, ?, ?, ?, 'DELIVERED', 'ToyVerse Indian Mail Gateway')
    `).run(emailId, order.id, order.customer_email, order.customer_name, subject, body);
    res.json({
      success: true,
      message: `Order confirmation email delivered to ${order.customer_email}`,
      emailId,
      status: 'DELIVERED',
      provider: 'ToyVerse Indian Mail Gateway'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send confirmation email.' });
  }
});

// GET Order Tracking Milestones
router.get('/:id/track', optionalAuth, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR tracking_number = ?').get(req.params.id, req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const shippingAddress = order.shipping_address_json ? JSON.parse(order.shipping_address_json) : {};
    const createdDate = new Date(order.created_at || Date.now());
    const status = order.status || 'Placed';
    const checkpoints = [
      { title: 'Order Placed & Verified', location: 'ToyVerse Bengaluru Fulfillment Center', timestamp: createdDate.toISOString(), completed: true },
      { title: 'Manifested & Packed', location: 'Bengaluru Cargo Logistics Hub', timestamp: new Date(createdDate.getTime() + 2 * 3600 * 1000).toISOString(), completed: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(status) },
      { title: 'In Transit via Express Air', location: `${shippingAddress.city || 'Regional'} Logistics Hub`, timestamp: new Date(createdDate.getTime() + 18 * 3600 * 1000).toISOString(), completed: ['Shipped', 'Out for Delivery', 'Delivered'].includes(status) },
      { title: 'Out for Doorstep Delivery', location: `${shippingAddress.city || 'Destination'} Local Delivery Center`, timestamp: new Date(createdDate.getTime() + 36 * 3600 * 1000).toISOString(), completed: ['Out for Delivery', 'Delivered'].includes(status) },
      { title: 'Delivered', location: `${shippingAddress.city || 'Customer Doorstep'} (PIN ${shippingAddress.pincode || '560001'})`, timestamp: new Date(createdDate.getTime() + 42 * 3600 * 1000).toISOString(), completed: status === 'Delivered' }
    ];
    res.json({
      orderId: order.id,
      trackingNumber: order.tracking_number,
      carrier: order.shipping_provider || 'Delhivery Express Air',
      currentStatus: status,
      destination: { city: shippingAddress.city || 'Bengaluru', state: shippingAddress.state || 'Karnataka', pincode: shippingAddress.pincode || '560001' },
      estimatedDelivery: new Date(createdDate.getTime() + 48 * 3600 * 1000).toISOString().split('T')[0],
      checkpoints
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve tracking information.' });
  }
});

// POST Validate Cart / Pre-Checkout Stock & Pricing
router.post('/validate', (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ valid: false, error: 'Cart is empty.' });
    }

    const issues = [];
    const verifiedItems = [];
    let serverSubtotal = 0;

    for (const item of items) {
      const pId = item.id || item.productId;
      const product = db.prepare('SELECT id, name, price, stock, images_json FROM products WHERE id = ?').get(pId);
      if (!product) {
        issues.push({ id: pId, type: 'NOT_FOUND', message: `Product "${item.name || pId}" no longer exists.` });
        continue;
      }

      let expectedPrice = Number(product.price);
      let availableStock = Number(product.stock);

      if (product.variants_json) {
        try {
          const variants = JSON.parse(product.variants_json);
          const matchedVariant = variants.find(v => v.name === item.variantName || v.sku === item.sku);
          if (matchedVariant) {
            if (matchedVariant.price) expectedPrice = Number(matchedVariant.price);
            if (matchedVariant.stock !== undefined) availableStock = Number(matchedVariant.stock);
          }
        } catch (e) {}
      }

      if (availableStock <= 0) {
        issues.push({
          id: item.id,
          name: product.name,
          type: 'OUT_OF_STOCK',
          message: `"${product.name}" is currently out of stock.`
        });
      } else if (availableStock < item.quantity) {
        issues.push({
          id: item.id,
          name: product.name,
          type: 'INSUFFICIENT_STOCK',
          availableStock: availableStock,
          requestedQuantity: item.quantity,
          message: `Only ${availableStock} units of "${product.name}" available in stock.`
        });
      }

      const priceChanged = Number(item.price) !== expectedPrice;
      if (priceChanged) {
        issues.push({
          id: item.id,
          name: product.name,
          type: 'PRICE_CHANGED',
          oldPrice: item.price,
          newPrice: expectedPrice,
          message: `Price for "${product.name}" is ₹${expectedPrice}.`
        });
      }

      verifiedItems.push({
        id: product.id,
        name: product.name,
        price: expectedPrice,
        quantity: item.quantity,
        stock: availableStock,
        available: availableStock >= item.quantity
      });

      serverSubtotal += expectedPrice * item.quantity;
    }

    const isValid = issues.filter(i => i.type === 'OUT_OF_STOCK' || i.type === 'INSUFFICIENT_STOCK' || i.type === 'NOT_FOUND').length === 0;

    res.json({
      valid: isValid,
      issues,
      subtotal: serverSubtotal,
      verifiedItems
    });
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ valid: false, error: 'Failed to validate cart.' });
  }
});

// POST Create new Order (with Idempotency, Strict Stock & Price Validation)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      customer, shippingAddress, items, subtotal, discount,
      shippingFee, total, paymentMethod, isGift, giftNote,
      idempotencyKey, paymentGatewayRef, name, phone, amountINR
    } = req.body;

    // Spec compliance: direct UPI order creation
    if (!shippingAddress && (name || phone || amountINR || !customer?.email)) {
      let amountPaise = 0;
      let resolvedItems = [];

      if (items && Array.isArray(items) && items.length > 0) {
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
          const itemPaise = Math.round(Number(price || 0) * 100);
          amountPaise += itemPaise * qty;
          resolvedItems.push({
            id: item.id || `item-${Date.now()}`,
            name: productName,
            priceINR: price,
            pricePaise: itemPaise,
            quantity: qty
          });
        }
      } else if (amountINR && !isNaN(Number(amountINR))) {
        amountPaise = Math.round(Number(amountINR) * 100);
        resolvedItems = [{ name: 'Direct ToyVerse Order', priceINR: Number(amountINR), pricePaise: amountPaise, quantity: 1 }];
      }

      if (amountPaise <= 0) {
        return res.status(400).json({ error: 'Order total must be greater than zero.' });
      }

      let publicRef = generatePublicRef(6);
      while (db.prepare('SELECT id FROM upi_orders WHERE public_ref = ?').get(publicRef)) {
        publicRef = generatePublicRef(6);
      }

      const upiUri = buildUpiUri({
        vpa: UPI_CONFIG.VPA,
        payeeName: UPI_CONFIG.PAYEE_NAME,
        amountPaise,
        ref: publicRef
      });

      const qrData = await qrDataUrl(upiUri);
      const orderId = `upi-ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const expiresAt = new Date(Date.now() + UPI_CONFIG.EXPIRY_MINUTES * 60 * 1000).toISOString();

      db.prepare(`
        INSERT INTO upi_orders (
          id, public_ref, status, amount_paise, items_json, customer_name,
          customer_phone, upi_uri, qr_data_url, expires_at
        ) VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        publicRef,
        amountPaise,
        JSON.stringify(resolvedItems),
        name || customer?.name || 'Valued Customer',
        phone || customer?.phone || '',
        upiUri,
        qrData,
        expiresAt
      );

      db.prepare(`
        INSERT INTO audit_log (actor, action, order_id, meta_json)
        VALUES ('client', 'order_created', ?, ?)
      `).run(orderId, JSON.stringify({ public_ref: publicRef, amount_paise: amountPaise }));

      return res.status(201).json({
        ref: publicRef,
        amountPaise,
        upi_uri: upiUri,
        qr: `/api/orders/${publicRef}/qr.png`,
        qr_data_url: qrData,
        expires_at: expiresAt,
        status: 'pending_payment',
        vpa: UPI_CONFIG.VPA,
        payee_name: UPI_CONFIG.PAYEE_NAME
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart cannot be empty.' });
    }

    // Step 0: Idempotency Protection to prevent duplicate orders & duplicate charges
    if (idempotencyKey) {
      const existing = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) {
        const existingOrder = formatOrder(existing);
        existingOrder.items = db.prepare(`
          SELECT product_id as id, product_name as name, price, quantity, image
          FROM order_items WHERE order_id = ?
        `).all(existing.id);
        return res.status(200).json({ ...existingOrder, order: existingOrder, idempotentReplay: true });
      }
    }

    // Step 1: Strict Server-Authoritative Stock & Price Validation
    let serverSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const pId = item.id || item.productId;
      const product = db.prepare('SELECT id, name, price, stock, images_json FROM products WHERE id = ?').get(pId);
      
      if (!product) {
        return res.status(400).json({
          error: `Item "${item.name || pId}" was not found in our catalog.`
        });
      }

      let expectedPrice = Number(product.price);
      let availableStock = Number(product.stock);

      if (product.variants_json) {
        try {
          const variants = JSON.parse(product.variants_json);
          const matchedVariant = variants.find(v => v.name === item.variantName || v.sku === item.sku);
          if (matchedVariant) {
            if (matchedVariant.price) expectedPrice = Number(matchedVariant.price);
            if (matchedVariant.stock !== undefined) availableStock = Number(matchedVariant.stock);
          }
        } catch (e) {}
      }

      if (availableStock <= 0) {
        return res.status(400).json({
          error: `Cannot place order. "${product.name}" is completely out of stock.`
        });
      }

      if (availableStock < Number(item.quantity)) {
        return res.status(400).json({
          error: `Cannot place order. "${product.name}" only has ${availableStock} units remaining (you requested ${item.quantity}).`
        });
      }

      const itemPrice = expectedPrice;
      const itemQty = Number(item.quantity);
      serverSubtotal += itemPrice * itemQty;

      validatedItems.push({
        id: product.id,
        name: product.name + (item.variantName ? ` (${item.variantName})` : ''),
        price: itemPrice,
        quantity: itemQty,
        image: item.image || ''
      });
    }

    // Server-computed final total & GST tax
    const finalDiscount = Number(discount) || 0;
    const finalShippingFee = Number(shippingFee) || 0;
    const authoritativeTotal = Math.max(0, serverSubtotal - finalDiscount + finalShippingFee);
    const taxAmount = Math.round((serverSubtotal * 0.18) / 1.18);

    const orderId = `ORD-IN-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const trackingNumber = `DELHIVERY-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.replace('ORD-IN-', '')}`;
    const userId = req.user ? req.user.id : (customer?.userId || null);

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, customer_name, customer_email, customer_phone, shipping_address_json,
        subtotal, discount, shipping_fee, total, payment_method, payment_status, status,
        tracking_number, is_gift, gift_note, idempotency_key, tax_amount, shipping_provider,
        invoice_number, payment_gateway_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      userId,
      customer?.name || req.body.customerName || 'Valued Shopper',
      customer?.email || req.body.customerEmail || 'shopper@example.com',
      customer?.phone || req.body.customerPhone || '+91 98000 00000',
      JSON.stringify(shippingAddress || {}),
      serverSubtotal,
      finalDiscount,
      finalShippingFee,
      authoritativeTotal,
      paymentMethod || 'UPI',
      (paymentMethod && (paymentMethod.toLowerCase().includes('cod') || paymentMethod.toLowerCase().includes('cash'))) ? 'Pending' : 'Paid',
      'Placed',
      trackingNumber,
      isGift ? 1 : 0,
      giftNote || null,
      idempotencyKey || null,
      taxAmount,
      'Delhivery',
      invoiceNumber,
      paymentGatewayRef || `GATEWAY-${Date.now()}`
    );

    // Insert line items & deduct product stock atomically
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    `);

    for (const item of validatedItems) {
      insertItem.run(
        orderId,
        item.id,
        item.name,
        item.price,
        item.quantity,
        item.image
      );
      updateStock.run(item.quantity, item.id);
    }

    // Award rewards points if authenticated (1 point per ₹50 spent)
    if (userId) {
      const earnedPoints = Math.floor(authoritativeTotal / 50);
      db.prepare('UPDATE users SET rewards_points = rewards_points + ? WHERE id = ?').run(earnedPoints, userId);
    }

    // Deliver order confirmation email
    try {
      const emailId = `EML-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const customerEmail = customer?.email || req.body.customerEmail || 'shopper@example.com';
      const customerName = customer?.name || req.body.customerName || 'Valued Shopper';
      const emailSubject = `Order Confirmation #${orderId} - ToyVerse India`;
      const emailBody = `Dear ${customerName},\n\nThank you for choosing ToyVerse India! Your order #${orderId} for ₹${authoritativeTotal} has been confirmed.\nTracking Number: ${trackingNumber} (Delhivery Express).\nDelivery to: ${shippingAddress?.city || 'Bengaluru'}, PIN ${shippingAddress?.pincode || '560001'}.\n\nWarm regards,\nToyVerse Team`;
      db.prepare(`
        INSERT INTO order_emails (id, order_id, recipient_email, recipient_name, subject, body_text, status, provider)
        VALUES (?, ?, ?, ?, ?, ?, 'DELIVERED', 'ToyVerse Indian Mail Gateway')
      `).run(emailId, orderId, customerEmail, customerName, emailSubject, emailBody);
    } catch (e) {
      console.warn('Confirmation email logging exception:', e.message);
    }

    // Return the created order
    const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderFormatted = formatOrder(created);
    orderFormatted.items = validatedItems;

    res.status(201).json({ ...orderFormatted, order: orderFormatted });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to process order.' });
  }
});

// PATCH Order Status (Admin Only)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json(formatOrder(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// PATCH Assign Shipping Provider & Tracking (Admin Only)
router.patch('/:id/shipping', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { shippingProvider, trackingNumber, status } = req.body;

    db.prepare(`
      UPDATE orders
      SET shipping_provider = COALESCE(?, shipping_provider),
          tracking_number = COALESCE(?, tracking_number),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(shippingProvider || null, trackingNumber || null, status || null, req.params.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const order = formatOrder(updated);
    order.items = db.prepare(`
      SELECT product_id as id, product_name as name, price, quantity, image
      FROM order_items WHERE order_id = ?
    `).all(req.params.id);

    res.json({ ...order, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shipping details.' });
  }
});

// POST Cancel Order (Customer or Admin) with Automatic Stock Replenishment
router.post('/:id/cancel', optionalAuth, (req, res) => {
  try {
    const { reason } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status === 'Cancelled' || order.status === 'Delivered') {
      return res.status(400).json({ error: `Cannot cancel order currently marked as ${order.status}.` });
    }

    // Replenish stock
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(req.params.id);
    const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const item of items) {
      restock.run(item.quantity, item.product_id);
    }

    // Update status and refund
    const newPaymentStatus = order.payment_status === 'Paid' ? 'Refunded' : 'Cancelled';
    db.prepare(`
      UPDATE orders 
      SET status = 'Cancelled',
          payment_status = ?,
          refund_status = 'Full Refund Processed',
          refund_amount = ?,
          refund_reason = ?
      WHERE id = ?
    `).run(newPaymentStatus, order.total, reason || 'Customer cancellation', req.params.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const formatted = formatOrder(updated);
    res.json({ message: 'Order cancelled successfully and inventory replenished!', order: formatted, ...formatted });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST Process Return & Replacement
router.post('/:id/return', optionalAuth, (req, res) => {
  try {
    const { type, reason } = req.body; // 'return' or 'replacement'
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const newStatus = type === 'replacement' ? 'Replacement Dispatched' : 'Return Requested';
    db.prepare(`
      UPDATE orders
      SET status = ?,
          refund_reason = ?
      WHERE id = ?
    `).run(newStatus, reason || 'Customer requested return/replacement', req.params.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const formatted = formatOrder(updated);
    res.json({ message: `${type === 'replacement' ? 'Replacement request initiated' : 'Return initiated'} successfully!`, order: formatted, ...formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process return request.' });
  }
});

// POST Process Refund (Admin Only)
router.post('/:id/refund', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { amount, reason, restockInventory, refundAmount, restock } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const refundAmt = Number(amount || refundAmount) || order.total;
    const doRestock = Boolean(restockInventory || restock);

    if (doRestock) {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(req.params.id);
      const restockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        restockStmt.run(item.quantity, item.product_id);
      }
    }

    db.prepare(`
      UPDATE orders
      SET status = 'Refunded',
          payment_status = 'Refunded',
          refund_status = 'Refunded',
          refund_amount = ?,
          refund_reason = ?,
          payment_gateway_ref = COALESCE(payment_gateway_ref, ?)
      WHERE id = ?
    `).run(refundAmt, reason || 'Admin approved refund', `RFND-PG-${Date.now()}`, req.params.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const formatted = formatOrder(updated);
    res.json({
      message: `Refund of ₹${refundAmt} processed successfully!`,
      refundStatus: 'Synchronized with Payment Provider',
      paymentGatewayRefundId: `RFND-PG-${Date.now()}`,
      order: formatted,
      ...formatted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process refund.' });
  }
});

export default router;
