-- ToyVerse SQLite Migration 002: Rollback
-- Direction: DOWN

ALTER TABLE products DROP COLUMN barcode;
