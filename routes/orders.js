/**
 * Orders Management Routes (TrypheneMart API)
 * Protected endpoints requiring valid JWT authentication token
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ----------------------------------------------------------------------------
// POST /api/orders - Create a new order (Protected)
// ----------------------------------------------------------------------------
router.post('/orders', verifyToken, async (req, res) => {
  try {
    const { items, address } = req.body;
    const userId = req.user.id;

    // Data Validation Layer
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your shopping cart is empty.' });
    }

    // Fetch product details to compute exact prices
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const prods = await db.query('SELECT id, name, price FROM products WHERE id = ?', [item.id]);
      if (prods && prods.length > 0) {
        const prod = prods[0];
        const qty = parseInt(item.quantite) || 1;
        const lineTotal = prod.price * qty;
        subtotal += lineTotal;

        orderItemsData.push({
          product_id: prod.id,
          name: prod.name,
          quantity: qty,
          unit_price: prod.price,
          total_price: lineTotal
        });
      }
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid products in order.' });
    }

    // Computations
    const shippingFee = subtotal >= 499 ? 0 : 40;
    const taxAmount = subtotal * 0.05;
    const totalAmount = subtotal + shippingFee + taxAmount;
    const referenceCode = '#TRYP-' + Math.floor(10000 + Math.random() * 90000);

    // Insert Order Record
    const orderResult = await db.query(
      `INSERT INTO orders (reference_code, user_id, subtotal, shipping_fee, tax_amount, total_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [referenceCode, userId, subtotal, shippingFee, taxAmount, totalAmount]
    );

    const orderId = orderResult.insertId || Date.now();

    // Insert Order Items
    for (const item of orderItemsData) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Order created and confirmed successfully!',
      order: {
        id: orderId,
        reference_code: referenceCode,
        subtotal: subtotal.toFixed(2),
        shipping_fee: shippingFee.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        items_count: orderItemsData.length
      }
    });
  } catch (err) {
    console.error('Order Creation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to process order. Please try again.' });
  }
});

// ----------------------------------------------------------------------------
// GET /api/orders - Get user order history (Protected)
// ----------------------------------------------------------------------------
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const orders = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders history.' });
  }
});

module.exports = router;
