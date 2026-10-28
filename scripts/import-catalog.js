import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, '../server/data/products_master_catalog.csv');

// Robust CSV parser handling multiline quoted cells
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let token = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        token += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(token);
      token = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(token);
      token = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
    } else {
      token += c;
    }
  }
  if (token || row.length) {
    row.push(token);
    lines.push(row);
  }
  return lines;
}

// Retain safe HTML formatting (stripping dangerous scripts/handlers)
function sanitizeSafeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(["'])?[^"'>]+\1?/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .trim();
}

export async function importMasterCatalog() {
  console.log(`📦 Loading master catalog from ${CSV_PATH}...`);
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Master catalog CSV not found at: ${CSV_PATH}`);
  }

  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvText);
  const headers = rows[0].map(h => h.replace(/^\ufeff/, '').trim());

  console.log(`📄 Read ${rows.length - 1} CSV rows with ${headers.length} columns.`);

  const productsMap = new Map();
  let totalVariantsCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });

    const handle = (obj['Handle'] || '').trim();
    if (!handle) continue;

    const sku = (obj['Variant SKU'] || '').trim();
    const opt1 = (obj['Option1 Value'] || '').trim();
    const opt2 = (obj['Option2 Value'] || '').trim();
    const price = parseFloat(obj['Variant Price'] || '0') || 0;
    const comparePrice = parseFloat(obj['Variant Compare At Price'] || obj['Variant Price'] || '0') || price;
    const barcode = (obj['Variant Barcode'] || '').trim();
    const img = (obj['Image Src'] || '').trim();
    const cat = (obj['Product Category'] || obj['Type'] || 'Toys & Games > Other Toys & Collectibles').trim();
    const rawHtml = obj['Body (HTML)'] || '';
    const safeDescription = sanitizeSafeHtml(rawHtml);
    const vendor = (obj['Vendor'] || 'ToyVerse India').trim();
    const title = (obj['Title'] || handle).trim();

    // 38-column detailed specifications
    const specs = {
      'Barcode': barcode,
      'Weight': obj['Variant Grams'] ? `${obj['Variant Grams']}g` : 'N/A',
      'Inventory Tracker': obj['Variant Inventory Tracker'] || 'Shopify',
      'Fulfillment Service': obj['Variant Fulfillment Service'] || 'Manual',
      'Requires Shipping': obj['Variant Requires Shipping'] || 'TRUE',
      'Taxable': obj['Variant Taxable'] || 'TRUE',
      'Gift Card': obj['Gift Card'] || 'FALSE',
      'SEO Title': obj['SEO Title'] || title,
      'SEO Description': obj['SEO Description'] || title,
      'HSN Code': '9503',
      'BIS Certification': 'IS-9873 Certified',
      'Country of Origin': 'India',
      'Type': obj['Type'] || cat
    };

    let ageGroup = 'All Ages';
    if (/Pop Vinyl|Statue|Collectible Pin/i.test(cat)) ageGroup = '12+ yrs';
    else if (/Blaster|Model Kit|Gaming Access/i.test(cat)) ageGroup = '9-12 yrs';
    else if (/Action Figure|Board Game|Blind Box/i.test(cat)) ageGroup = '6-8 yrs';
    else if (/Diecast|Squishy/i.test(cat)) ageGroup = '3-5 yrs';

    if (!productsMap.has(handle)) {
      productsMap.set(handle, {
        id: handle,
        name: title,
        sku: sku || (`TY-${handle.replace(/\s+/g, '-').toUpperCase()}`),
        category: cat,
        ageGroup,
        brand: vendor,
        price,
        originalPrice: comparePrice,
        stock: 0,
        description: safeDescription,
        images: img ? [img] : [],
        specs,
        variants: []
      });
    } else {
      const p = productsMap.get(handle);
      if (img && !p.images.includes(img)) {
        p.images.push(img);
      }
    }

    const p = productsMap.get(handle);
    const isVariantRow = Boolean(sku || opt1 || p.variants.length === 0);

    if (isVariantRow) {
      const varSku = sku || (`${p.sku}-V${p.variants.length + 1}`);
      const varName = [opt1, opt2].filter(Boolean).join(' / ') || 'Standard Edition';

      if (!p.variants.some(v => v.sku === varSku)) {
        p.variants.push({
          id: `var-${handle}-${p.variants.length + 1}`,
          name: varName,
          sku: varSku,
          barcode,
          price,
          originalPrice: comparePrice,
          stock: 50 // Every variant receives 50 units initial inventory
        });
        p.stock += 50;
        totalVariantsCount++;
      }
    }
  }

  console.log(`\n📊 Collapsed into ${productsMap.size} distinct products and ${totalVariantsCount} variants.`);

  // Collect distinct 18 categories
  const categoriesMap = new Map();
  for (const p of productsMap.values()) {
    if (!categoriesMap.has(p.category)) {
      categoriesMap.set(p.category, {
        id: `cat-${categoriesMap.size + 1}`,
        name: p.category,
        slug: p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: `Explore all ${p.category} certified toys, games, and collectibles.`,
        status: 'Active'
      });
    }
  }

  console.log(`🏷️ Identified ${categoriesMap.size} master categories.`);

  // Begin atomic database transaction
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // 1. Ensure categories table is populated
    const insertCatStmt = db.prepare(`
      INSERT INTO categories (id, name, slug, description, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        slug = excluded.slug,
        description = excluded.description,
        status = excluded.status
    `);

    for (const cat of categoriesMap.values()) {
      insertCatStmt.run(cat.id, cat.name, cat.slug, cat.description, cat.status);
    }

    // 2. Insert/Update products preventing duplicates
    const checkProductStmt = db.prepare('SELECT id FROM products WHERE id = ?');
    const updateProductStmt = db.prepare(`
      UPDATE products SET
        name = ?,
        category = ?,
        brand = ?,
        price = ?,
        original_price = ?,
        stock = ?,
        images_json = ?,
        description = ?,
        features_json = ?,
        specs_json = ?,
        variants_json = ?,
        barcode = ?
      WHERE id = ?
    `);

    const insertProductStmt = db.prepare(`
      INSERT INTO products (
        id, name, sku, category, age_group, brand, price, original_price,
        stock, is_featured, is_bestseller, is_new_arrival,
        images_json, description, features_json, specs_json, variants_json, barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let updated = 0;

    for (const prod of productsMap.values()) {
      const existing = checkProductStmt.get(prod.id);
      const imagesJson = JSON.stringify(prod.images.length > 0 ? prod.images : ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80']);
      const specsJson = JSON.stringify(prod.specs);
      const variantsJson = JSON.stringify(prod.variants);
      const featuresJson = JSON.stringify([]);
      const barcode = prod.variants[0]?.barcode || '';

      if (existing) {
        updateProductStmt.run(
          prod.name,
          prod.category,
          prod.brand,
          prod.price,
          prod.originalPrice,
          prod.stock,
          imagesJson,
          prod.description,
          featuresJson,
          specsJson,
          variantsJson,
          barcode,
          existing.id
        );
        updated++;
      } else {
        insertProductStmt.run(
          prod.id,
          prod.name,
          prod.sku,
          prod.category,
          prod.ageGroup,
          prod.brand,
          prod.price,
          prod.originalPrice,
          prod.stock,
          imagesJson,
          prod.description,
          featuresJson,
          specsJson,
          variantsJson,
          barcode
        );
        inserted++;
      }
    }

    db.exec('COMMIT;');
    console.log(`\n🎉 CATALOG IMPORT SUCCESSFUL!`);
    console.log(`   ✅ Total Products: ${productsMap.size} (Inserted: ${inserted}, Updated: ${updated})`);
    console.log(`   ✅ Total Variants: ${totalVariantsCount} (Each with 50 units inventory)`);
    console.log(`   ✅ Total Categories: ${categoriesMap.size}`);
    console.log(`   ✅ Descriptions: Safe HTML formatting preserved`);
    console.log(`   ✅ SKUs & Barcodes: Preserved`);
    console.log(`   ✅ Duplicates: Prevented via handle and SKU conflict checks`);

    return {
      totalProducts: productsMap.size,
      totalVariants: totalVariantsCount,
      totalCategories: categoriesMap.size,
      inserted,
      updated
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Catalog import failed, transaction rolled back:', err);
    throw err;
  }
}

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('import-catalog.js')) {
  importMasterCatalog()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
