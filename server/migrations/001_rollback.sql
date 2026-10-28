-- ToyVerse SQLite Migration 001: Rollback Schema
-- Direction: DOWN

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS upi_events;
DROP TABLE IF EXISTS upi_orders;
DROP TABLE IF EXISTS shipping_rules;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
