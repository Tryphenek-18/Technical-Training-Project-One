/**
 * TrypheneMart - Node.js / Express.js Application Server
 * Serves static web frontend & handles RESTful API endpoints with JWT auth
 * Author: KEKE EUNICE TRYPHENE
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'TrypheneMart API is running smoothly.', timestamp: new Date() });
});

// Fallback to index.html for SPA routing if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 TrypheneMart Server listening on http://localhost:${PORT}`);
    console.log(`📦 Database Ready | Auth Protected Order Routes Active`);
    console.log(`====================================================`);
});
