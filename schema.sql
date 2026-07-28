-- ============================================================================
-- TrypheneMart - Online Grocery Delivery System Database Schema
-- Target Database Engine: MySQL 8.0+
-- Author: KEKE EUNICE TRYPHENE
-- ============================================================================

CREATE DATABASE IF NOT EXISTS tryphenemart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tryphenemart_db;

-- Disable foreign key checks during table creation
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Table: users (Utilisateurs)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 2. Table: categories (Catégories de Produits)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '🍎',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 3. Table: products (Produits)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_unit VARCHAR(50) DEFAULT 'per item',
  image_url VARCHAR(500) NOT NULL,
  is_veg TINYINT(1) DEFAULT 1,
  brand VARCHAR(80) DEFAULT 'TrypheneFresh',
  rating DECIMAL(3,2) DEFAULT 4.5,
  review_count INT DEFAULT 0,
  description TEXT,
  in_stock TINYINT(1) DEFAULT 1,
  is_promo TINYINT(1) DEFAULT 0,
  old_price DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_products_category (category_id),
  INDEX idx_products_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 4. Table: addresses (Adresses de Livraison)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS addresses;
CREATE TABLE addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  is_default TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 5. Table: order_statuses (Statuts des Commandes)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS order_statuses;
CREATE TABLE order_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 6. Table: payment_methods (Méthodes de Paiement)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS payment_methods;
CREATE TABLE payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 7. Table: orders (Commandes)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_code VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  address_id INT DEFAULT NULL,
  status_id INT NOT NULL DEFAULT 1,
  payment_method_id INT DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (status_id) REFERENCES order_statuses(id),
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_ref (reference_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 8. Table: order_items (Lignes de Commande)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 9. Table: cart_sessions (Paniers Utilisateurs)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS cart_sessions;
CREATE TABLE cart_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 10. Table: cart_items (Éléments du Panier)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (cart_id) REFERENCES cart_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY unique_cart_product (cart_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- INITIAL TEST DATA INSERTIONS
-- ============================================================================

-- Insert Categories
INSERT INTO categories (id, code, name, icon) VALUES
(1, 'fruits-veg', 'Fruits & Vegetables', '🍎'),
(2, 'dairy-bakery', 'Dairy & Bakery', '🥛'),
(3, 'snacks', 'Snacks & Munchies', '🥨'),
(4, 'beverages', 'Beverages & Teas', '🧃'),
(5, 'household', 'Household & Cleaning', '🧹');

-- Insert Order Statuses
INSERT INTO order_statuses (id, code, label) VALUES
(1, 'PENDING', 'Pending Validation'),
(2, 'PROCESSING', 'Preparing Order'),
(3, 'OUT_FOR_DELIVERY', 'Out for Delivery'),
(4, 'DELIVERED', 'Delivered'),
(5, 'CANCELLED', 'Cancelled');

-- Insert Payment Methods
INSERT INTO payment_methods (id, code, label) VALUES
(1, 'COD', 'Cash on Delivery'),
(2, 'UPI', 'UPI / Google Pay / PhonePe'),
(3, 'CARD', 'Credit / Debit Card');

-- Insert Products
INSERT INTO products (id, category_id, name, price, price_unit, image_url, is_veg, brand, rating, review_count, description, in_stock, is_promo, old_price) VALUES
(1, 1, 'Fresh Shimla Apples', 149.00, 'per kg', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80', 1, 'BioFarm', 4.80, 124, 'Crispy and sweet organic Shimla apples harvested directly from orchards in Himachal Pradesh.', 1, 1, 180.00),
(2, 1, 'Hass Avocados (Pack of 2)', 199.00, 'pack of 2', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80', 1, 'NaturePure', 4.60, 89, 'Ready-to-eat creamy Hass avocados. Rich in healthy fats, perfect for salads and toasts.', 1, 0, NULL),
(3, 1, 'Organic Robusta Bananas', 49.00, 'per kg', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80', 1, 'BioFarm', 4.90, 210, 'Naturally ripened chemical-free bananas. Great source of potassium.', 1, 0, NULL),
(4, 2, 'Fresh Toned Milk 1L', 66.00, '1 Litre pouch', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80', 1, 'Amul', 4.70, 340, 'Pasteurised fresh toned milk fortified with Vitamin A & D.', 1, 0, NULL),
(5, 2, 'Fresh Malai Paneer 200g', 115.00, '200g pack', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80', 1, 'Amul', 4.90, 195, 'Soft and wholesome cottage cheese crafted from pure cow milk.', 1, 1, 130.00),
(6, 2, 'Natural Set Dahi / Curd 400g', 50.00, '400g tub', 'https://images.unsplash.com/photo-1584278860011-61d0066f0c5d?auto=format&fit=crop&w=600&q=80', 1, 'Amul', 4.50, 162, 'Thick, creamy, and mildly sour set curd for healthy digestion.', 1, 0, NULL),
(7, 3, 'Spiced Masala Potato Chips', 40.00, '150g pack', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80', 1, 'RoyalGourmet', 4.40, 98, 'Kettle-cooked crispy potato wafers seasoned with Indian spices.', 1, 0, NULL),
(8, 3, 'Chicken Tikka Club Sandwich', 169.00, 'per unit', 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80', 0, 'RoyalGourmet', 4.30, 75, 'Fresh wholewheat bread stuffed with smoked chicken tikka chunks.', 1, 0, NULL),
(9, 3, 'Tandoori Roasted Chicken Platter', 299.00, 'ready portion', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80', 0, 'RoyalGourmet', 4.80, 178, 'Juicy chicken pieces marinated in clay-oven tandoori spices.', 1, 1, 349.00),
(10, 4, 'Pure Alphonso Mango Juice 1L', 120.00, '1L bottle', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80', 1, 'NaturePure', 4.70, 142, 'Rich pulp juice crafted from authentic Ratnagiri Alphonso mangoes.', 1, 0, NULL),
(11, 4, 'South Indian Filter Coffee Beans 500g', 380.00, '500g pack', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80', 1, 'RoyalGourmet', 4.90, 230, 'Dark roasted Arabica & Robusta coffee beans from Chikmagalur.', 1, 1, 450.00),
(12, 5, 'Eco Surface Cleaner Spray 750ml', 175.00, '750ml spray', 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80', 1, 'GreenHome', 4.60, 54, 'Plant-based biodegradable multi-surface cleaner with lemon oils.', 1, 0, NULL),
(13, 5, 'Organic Liquid Detergent 2L', 499.00, '2L bottle', 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80', 1, 'GreenHome', 4.80, 142, 'Hypoallergenic liquid detergent tough on stains, gentle on fabrics.', 1, 0, NULL);

-- Insert Demo Customer User
INSERT INTO users (id, full_name, email, password_hash, phone, role) VALUES
(1, 'KEKE EUNICE TRYPHENE', 'ket.180804@gmail.com', '$2a$10$w9V4mH7Yw9y6Xk6y1v2Z3eB7vH4w5y6z7A8B9C0D1E2F3G4H5I6J', '+91 7696614979', 'customer');

-- Insert Default Customer Address
INSERT INTO addresses (id, user_id, street, city, state, postal_code, is_default) VALUES
(1, 1, 'Innovation Hub Campus', 'Mohali', 'Punjab', '140301', 1);
