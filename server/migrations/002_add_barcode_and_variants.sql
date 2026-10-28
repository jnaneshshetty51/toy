-- ToyVerse SQLite Migration 002: Add barcode
-- Direction: UP

ALTER TABLE products ADD COLUMN barcode TEXT;
