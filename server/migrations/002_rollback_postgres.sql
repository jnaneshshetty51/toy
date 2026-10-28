-- ToyVerse PostgreSQL Migration 002: Rollback
-- Direction: DOWN

ALTER TABLE products DROP COLUMN IF EXISTS barcode;
ALTER TABLE products DROP COLUMN IF EXISTS variants_json;
