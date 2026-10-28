import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET Wishlist product IDs for authenticated user
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(req.user.id);
    res.json(rows.map(r => r.product_id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist.' });
  }
});

// POST Toggle Product in Wishlist
router.post('/toggle', authenticateToken, (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required.' });
    }

    const existing = db.prepare('SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);

    let inWishlist = false;
    if (existing) {
      db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
      inWishlist = false;
    } else {
      db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
      inWishlist = true;
    }

    const updatedRows = db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(req.user.id);
    res.json({
      inWishlist,
      wishlist: updatedRows.map(r => r.product_id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update wishlist.' });
  }
});

export default router;
