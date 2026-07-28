/**
 * Products & Categories Routes (TrypheneMart API)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ----------------------------------------------------------------------------
// GET /api/products - List all products or filter by category/search
// ----------------------------------------------------------------------------
router.get('/products', async (req, res) => {
  try {
    const products = await db.query(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.price_unit    AS priceUnit,
        p.image_url     AS image,
        p.is_veg        AS isVeg,
        p.brand,
        p.rating,
        p.review_count  AS reviewCount,
        p.description,
        p.in_stock      AS inStock,
        p.is_promo      AS isPromo,
        p.old_price     AS oldPrice,
        c.code          AS category,
        c.name          AS categoryName
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      ORDER BY p.id ASC
    `);

    // Normalize boolean fields from TINYINT to JS boolean
    products.forEach(p => {
      p.isVeg   = p.isVeg   === 1 || p.isVeg   === true;
      p.inStock = p.inStock === 1 || p.inStock === true;
      p.isPromo = p.isPromo === 1 || p.isPromo === true;
    });

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    // Fallback to produits.js local dataset
    try {
      const fallbackList = require('../produits.js');
      res.json({ success: true, count: fallbackList.length, data: fallbackList });
    } catch (fallbackErr) {
      res.status(500).json({ success: false, message: 'Failed to fetch products.' });
    }
  }
});

// ----------------------------------------------------------------------------
// GET /api/categories - List grocery categories
// ----------------------------------------------------------------------------
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

module.exports = router;
