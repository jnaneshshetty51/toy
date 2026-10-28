import express from 'express';
import db, { logAudit } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all coupons
router.get('/', (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY active DESC').all();
    res.json(coupons.map(c => ({
      code: c.code,
      discountPercent: c.discount_percent,
      minSpend: c.min_spend,
      maxDiscount: c.max_discount,
      description: c.description,
      freeShipping: Boolean(c.free_shipping),
      active: Boolean(c.active)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons.' });
  }
});

// POST Validate Coupon against cart subtotal in INR
router.post('/validate', (req, res) => {
  try {
    const { code, cartSubtotal } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(cleanCode);

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired promotional code.' });
    }

    const subtotal = Number(cartSubtotal || req.body.cartTotal) || 0;
    if (coupon.min_spend && subtotal < coupon.min_spend) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order value of ₹${coupon.min_spend} required for code ${coupon.code}.`
      });
    }

    let discountAmount = 0;
    if (coupon.discount_percent > 0) {
      discountAmount = (subtotal * coupon.discount_percent) / 100;
      if (coupon.max_discount > 0 && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    }

    res.json({
      valid: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      coupon: {
        code: coupon.code,
        discountPercent: coupon.discount_percent,
        minSpend: coupon.min_spend,
        freeShipping: Boolean(coupon.free_shipping),
        discountAmount: Math.round(discountAmount)
      }
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Error checking coupon code.' });
  }
});

// POST Create Coupon (Admin Only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { code, discountPercent, minSpend, maxDiscount, description, freeShipping } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    db.prepare(`
      INSERT OR REPLACE INTO coupons (code, discount_percent, min_spend, max_discount, description, free_shipping, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      cleanCode,
      Number(discountPercent) || 0,
      Number(minSpend) || 0,
      Number(maxDiscount) || 0,
      description || '',
      freeShipping ? 1 : 0
    );

    logAudit(req.user?.email || 'admin', 'coupon_created', cleanCode, { discountPercent, minSpend, maxDiscount });
    res.status(201).json({ message: 'Coupon created successfully.', code: cleanCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
});

// PATCH Toggle Coupon (Admin Only)
router.patch('/:code/toggle', authenticateToken, requireAdmin, (req, res) => {
  try {
    const coupon = db.prepare('SELECT active FROM coupons WHERE code = ?').get(req.params.code.toUpperCase());
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    const newActive = coupon.active ? 0 : 1;
    db.prepare('UPDATE coupons SET active = ? WHERE code = ?').run(newActive, req.params.code.toUpperCase());
    logAudit(req.user?.email || 'admin', 'coupon_toggled', req.params.code.toUpperCase(), { active: Boolean(newActive) });
    res.json({ code: req.params.code.toUpperCase(), active: Boolean(newActive) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon status.' });
  }
});

// DELETE Coupon (Admin Only)
router.delete('/:code', authenticateToken, requireAdmin, (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    db.prepare('DELETE FROM coupons WHERE code = ?').run(code);
    logAudit(req.user?.email || 'admin', 'coupon_deleted', code);
    res.json({ success: true, message: `Coupon "${code}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
});

export default router;
