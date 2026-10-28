import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all addresses for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
    res.json(rows.map(a => ({
      id: a.id,
      userId: a.user_id,
      label: a.label,
      fullName: a.full_name,
      street: a.street,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: a.phone,
      isDefault: Boolean(a.is_default)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

// POST Add or update address
router.post('/', authenticateToken, (req, res) => {
  try {
    const { id, label, fullName, street, city, state, pincode, phone, isDefault } = req.body;

    if (!fullName || !street || !city || !state || !pincode) {
      return res.status(400).json({ error: 'Full address details and PIN code are required.' });
    }

    const addrId = id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // If making default, reset others
    if (isDefault) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    db.prepare(`
      INSERT OR REPLACE INTO addresses (id, user_id, label, full_name, street, city, state, pincode, phone, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      addrId,
      req.user.id,
      label || 'Home',
      fullName,
      street,
      city,
      state,
      pincode,
      phone || req.user.phone || '',
      isDefault ? 1 : 0
    );

    const saved = db.prepare('SELECT * FROM addresses WHERE id = ?').get(addrId);
    res.status(201).json({
      id: saved.id,
      userId: saved.user_id,
      label: saved.label,
      fullName: saved.full_name,
      street: saved.street,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
      phone: saved.phone,
      isDefault: Boolean(saved.is_default)
    });
  } catch (err) {
    console.error('Error saving address:', err);
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

// DELETE address
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Address removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});

export default router;
