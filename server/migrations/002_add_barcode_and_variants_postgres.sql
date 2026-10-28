-- ToyVerse PostgreSQL Migration 002: Add barcode and variants
-- Direction: UP

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants_json JSONB DEFAULT '[]';
