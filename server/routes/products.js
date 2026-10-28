import express from 'express';
import db, { logAudit } from '../db.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to format product
function formatProduct(row) {
  if (!row) return null;
  const images = row.images_json ? JSON.parse(row.images_json) : [];
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    ageGroup: row.age_group,
    brand: row.brand,
    price: row.price,
    originalPrice: row.original_price,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    stock: row.stock,
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_bestseller),
    isNewArrival: Boolean(row.is_new_arrival),
    images: images,
    image: images[0] || '',
    description: row.description,
    features: row.features_json ? JSON.parse(row.features_json) : [],
    specs: row.specs_json ? JSON.parse(row.specs_json) : {},
    variants: row.variants_json ? JSON.parse(row.variants_json) : [],
    createdAt: row.created_at
  };
}

// Levenshtein distance calculation for typo tolerance
function levenshteinDistance(s1, s2) {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// Cached dictionary of catalog keywords for typo tolerance
let vocabularyCache = null;
let lastVocabBuild = 0;

function getSearchVocabulary() {
  const now = Date.now();
  if (vocabularyCache && now - lastVocabBuild < 60000) {
    return vocabularyCache;
  }

  const vocab = new Set();
  try {
    const rows = db.prepare('SELECT name, brand, category, sku, description, features_json, specs_json FROM products').all();
    for (const r of rows) {
      const textToTokenize = [
        r.name,
        r.brand,
        r.category,
        r.sku,
        r.description ? r.description.slice(0, 300) : ''
      ].join(' ');

      const tokens = textToTokenize.toLowerCase().match(/[a-z0-9]{3,25}/g) || [];
      tokens.forEach(t => vocab.add(t));
    }
    vocabularyCache = Array.from(vocab);
    lastVocabBuild = now;
  } catch (err) {
    console.error('Error building search vocabulary:', err);
    vocabularyCache = [];
  }
  return vocabularyCache;
}

// Find closest word in vocabulary for a given query token
function findTypoCorrection(token, vocabulary) {
  const lower = token.toLowerCase();
  if (lower.length < 3) return null;
  
  let bestMatch = null;
  let minDistance = Infinity;
  const maxAllowedDist = lower.length <= 4 ? 1 : 2;

  for (const word of vocabulary) {
    if (word === lower || word.startsWith(lower)) {
      return null;
    }
    if (Math.abs(word.length - lower.length) > maxAllowedDist) continue;

    const dist = levenshteinDistance(lower, word);
    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      bestMatch = word;
    }
  }

  return bestMatch;
}

// Correct full search query using Levenshtein distance
function correctSearchQuery(queryStr) {
  if (!queryStr || !queryStr.trim()) return null;
  const tokens = queryStr.trim().split(/\s+/).filter(Boolean);
  const vocabulary = getSearchVocabulary();
  let changed = false;

  const correctedTokens = tokens.map(t => {
    const correction = findTypoCorrection(t, vocabulary);
    if (correction && correction !== t.toLowerCase()) {
      changed = true;
      return correction;
    }
    return t;
  });

  return changed ? correctedTokens.join(' ') : null;
}

// Build SQL where clause for multi-token keyword searching
function buildSearchCondition(queryStr) {
  const tokens = queryStr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { sql: '', params: [] };

  const tokenClauses = [];
  const params = [];

  for (const token of tokens) {
    tokenClauses.push('(name LIKE ? OR sku LIKE ? OR brand LIKE ? OR category LIKE ? OR description LIKE ? OR features_json LIKE ? OR specs_json LIKE ?)');
    const t = `%${token}%`;
    params.push(t, t, t, t, t, t, t);
  }

  return {
    sql: ' AND (' + tokenClauses.join(' AND ') + ')',
    params
  };
}

// GET autocomplete suggestions
router.get('/autocomplete', (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q || q.length < 2) {
      return res.json({ products: [], categories: [], brands: [], didYouMean: null });
    }

    let searchTarget = q;
    let didYouMean = null;
    let term = `%${searchTarget}%`;

    let productRows = db.prepare(`
      SELECT id, name, category, brand, price, images_json
      FROM products
      WHERE name LIKE ? OR sku LIKE ? OR brand LIKE ? OR category LIKE ?
      LIMIT 6
    `).all(term, term, term, term);

    let categoryRows = db.prepare(`
      SELECT DISTINCT category FROM products WHERE category LIKE ? LIMIT 4
    `).all(term);

    let brandRows = db.prepare(`
      SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand LIKE ? LIMIT 4
    `).all(term);

    // If 0 results found, attempt Levenshtein typo tolerance
    if (productRows.length === 0 && categoryRows.length === 0 && brandRows.length === 0) {
      const corrected = correctSearchQuery(q);
      if (corrected) {
        didYouMean = corrected;
        searchTarget = corrected;
        const correctedTerm = `%${searchTarget}%`;

        productRows = db.prepare(`
          SELECT id, name, category, brand, price, images_json
          FROM products
          WHERE name LIKE ? OR sku LIKE ? OR brand LIKE ? OR category LIKE ?
          LIMIT 6
        `).all(correctedTerm, correctedTerm, correctedTerm, correctedTerm);

        categoryRows = db.prepare(`
          SELECT DISTINCT category FROM products WHERE category LIKE ? LIMIT 4
        `).all(correctedTerm);

        brandRows = db.prepare(`
          SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand LIKE ? LIMIT 4
        `).all(correctedTerm);
      }
    }

    const products = productRows.map(r => {
      let image = '';
      try {
        const imgs = JSON.parse(r.images_json);
        image = imgs[0] || '';
      } catch {}
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        brand: r.brand,
        price: r.price,
        image
      };
    });

    res.json({
      products,
      categories: categoryRows.map(r => r.category),
      brands: brandRows.map(r => r.brand),
      didYouMean
    });
  } catch (err) {
    console.error('Error fetching autocomplete:', err);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// GET distinct brands
router.get('/meta/brands', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC
    `).all();
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    res.json(rows.map(r => r.brand));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET all products with filtering & sorting & pagination
router.get('/', (req, res) => {
  try {
    const { 
      search, category, age, brand, minPrice, maxPrice, 
      inStock, minRating, sort, featured, deals, popularity, 
      withMeta, page, limit 
    } = req.query;

    const executeProductQuery = (searchQueryStr) => {
      let query = 'SELECT * FROM products WHERE 1=1';
      let params = [];

      if (searchQueryStr && searchQueryStr.trim()) {
        const searchCond = buildSearchCondition(searchQueryStr);
        query += searchCond.sql;
        params = params.concat(searchCond.params);
      }

      if (category && category !== 'all') {
        query += ' AND (category = ? OR category = ? OR category LIKE ?)';
        params.push(category, `Toys & Games > ${category}`, `%${category}%`);
      }

      if (age && age !== 'all') {
        query += ' AND (age_group = ? OR age_group LIKE ?)';
        params.push(age, `%${age}%`);
      }

      if (brand && brand !== 'all') {
        query += ' AND brand = ?';
        params.push(brand);
      }

      if (minPrice) {
        query += ' AND price >= ?';
        params.push(Number(minPrice));
      }

      if (maxPrice) {
        query += ' AND price <= ?';
        params.push(Number(maxPrice));
      }

      if (inStock === 'true') {
        query += ' AND stock > 0';
      }

      if (minRating) {
        query += ' AND rating >= ?';
        params.push(Number(minRating));
      }

      if (featured === 'true') {
        query += ' AND is_featured = 1';
      }

      if (deals === 'true') {
        query += ' AND original_price > price';
      }

      if (popularity === 'true') {
        query += ' AND is_bestseller = 1';
      }

      // Sorting
      if (sort === 'price-low') {
        query += ' ORDER BY price ASC';
      } else if (sort === 'price-high') {
        query += ' ORDER BY price DESC';
      } else if (sort === 'rating') {
        query += ' ORDER BY rating DESC';
      } else if (sort === 'newest') {
        query += ' ORDER BY is_new_arrival DESC, created_at DESC';
      } else if (sort === 'popularity' || sort === 'bestseller') {
        query += ' ORDER BY is_bestseller DESC, reviews_count DESC, rating DESC';
      } else {
        query += ' ORDER BY is_featured DESC, is_bestseller DESC, rating DESC';
      }

      return db.prepare(query).all(...params);
    };

    let rows = executeProductQuery(search);
    let didYouMean = null;

    // Typo tolerance: if search term provided but 0 results found, check for typo correction
    if (rows.length === 0 && search && search.trim()) {
      const corrected = correctSearchQuery(search);
      if (corrected) {
        const typoRows = executeProductQuery(corrected);
        if (typoRows.length > 0) {
          rows = typoRows;
          didYouMean = corrected;
          res.setHeader('X-Did-You-Mean', corrected);
        }
      }
    }

    const totalCount = rows.length;
    let paginatedRows = rows;
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : null;
    const limitNum = limit ? Math.max(1, Math.min(200, parseInt(limit, 10))) : null;

    if (pageNum && limitNum) {
      const offset = (pageNum - 1) * limitNum;
      paginatedRows = rows.slice(offset, offset + limitNum);
    } else if (limitNum) {
      paginatedRows = rows.slice(0, limitNum);
    }

    const products = paginatedRows.map(formatProduct);

    // Set Caching headers (Req 114)
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    if (withMeta === 'true' || pageNum || limitNum) {
      return res.json({
        products,
        didYouMean,
        total: totalCount,
        page: pageNum || 1,
        limit: limitNum || totalCount,
        totalPages: limitNum ? Math.ceil(totalCount / limitNum) : 1,
        hasMore: pageNum && limitNum ? (pageNum * limitNum < totalCount) : false
      });
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET single product by ID
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');

    const product = formatProduct(row);

    // Fetch product reviews
    const reviews = db.prepare(`
      SELECT id, user_id as userId, user_name as user, rating, comment, verified, created_at as date
      FROM reviews WHERE product_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    product.reviews = reviews;
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching product details.' });
  }
});

// Helper to collapse multi-row CSV catalog entries (e.g. 3,263 rows -> 1,151 products, 1,155 variants)
function collapseCatalogRows(rawList) {
  const map = new Map();

  for (const item of rawList) {
    const handle = (item.handle || item.Handle || item.id || item.name || item.Title || item.sku || '').trim();
    if (!handle) continue;

    if (!map.has(handle)) {
      // First row: Parent product
      const variants = Array.isArray(item.variants) ? [...item.variants] : [];
      if (item.variant_sku || item['Variant SKU'] || item['Option1 Value'] || item.option1_val) {
        const initialVarStock = (item['Variant Inventory Qty'] !== undefined && item['Variant Inventory Qty'] !== '' && !isNaN(Number(item['Variant Inventory Qty'])))
          ? Number(item['Variant Inventory Qty'])
          : 50; // Initial stock quantity of 50 for every imported variant

        variants.push({
          id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: [item['Option1 Value'] || item.option1_val, item['Option2 Value'] || item.option2_val].filter(Boolean).join(' / ') || 'Standard',
          sku: item['Variant SKU'] || item.variant_sku || item.sku || `TY-${handle}-V1`,
          price: Number(item['Variant Price'] || item.price || 0),
          stock: initialVarStock,
          barcode: item['Variant Barcode'] || item.barcode || ''
        });
      }

      // Collect images
      let images = [];
      if (Array.isArray(item.images)) {
        images = [...item.images];
      } else if (item['Image Src'] || item.image) {
        images = [item['Image Src'] || item.image];
      }

      // Collect specs (all 38 columns)
      const specs = typeof item.specs === 'object' && item.specs ? { ...item.specs } : {};
      if (item['HSN Code']) specs['HSN Code'] = item['HSN Code'];
      if (item['BIS Standard'] || item['BIS Safety']) specs['BIS Safety'] = item['BIS Standard'] || item['BIS Safety'] || 'IS-9873 Certified';
      if (item['Country of Origin']) specs['Country of Origin'] = item['Country of Origin'];
      if (item['Dimensions']) specs['Dimensions'] = item['Dimensions'];
      if (item['Variant Grams']) specs['Weight'] = `${item['Variant Grams']}g`;
      if (item['SEO Title']) specs['SEO Title'] = item['SEO Title'];
      if (item['SEO Description']) specs['SEO Description'] = item['SEO Description'];

      const parentStock = (item['Variant Inventory Qty'] !== undefined && item['Variant Inventory Qty'] !== '' && !isNaN(Number(item['Variant Inventory Qty'])))
        ? Number(item['Variant Inventory Qty'])
        : (item.stock !== undefined && item.stock !== '' && !isNaN(Number(item.stock)) ? Number(item.stock) : 50);

      map.set(handle, {
        ...item,
        handle,
        name: item.name || item.Title || handle,
        sku: item.sku || item['Variant SKU'] || `TY-${handle.replace(/\s+/g, '-').toUpperCase()}`,
        category: item.category || item['Category'] || item['Standard Product Type'] || 'STEM & Learning',
        brand: item.brand || item.Vendor || item.brand || 'ToyVerse India',
        ageGroup: item.ageGroup || item.age_group || item['Age Recommendation'] || '6-8 yrs',
        price: Number(item.price || item['Variant Price'] || 0),
        originalPrice: Number(item.originalPrice || item.original_price || item['Variant Compare At Price'] || item.price || 0),
        stock: parentStock,
        images,
        specs,
        variants
      });
    } else {
      // Subsequent row: attach extra images and variants to existing parent product
      const parent = map.get(handle);

      // Additional images
      const extraImg = item['Image Src'] || item.image;
      if (extraImg && !parent.images.includes(extraImg)) {
        parent.images.push(extraImg);
      }

      // Additional variants
      const varSku = item['Variant SKU'] || item.variant_sku;
      const optVal = item['Option1 Value'] || item.option1_val;
      if (varSku || optVal) {
        const exists = parent.variants.some(v => v.sku === varSku);
        if (!exists) {
          const vStock = (item['Variant Inventory Qty'] !== undefined && item['Variant Inventory Qty'] !== '' && !isNaN(Number(item['Variant Inventory Qty'])))
            ? Number(item['Variant Inventory Qty'])
            : 50; // Initial stock quantity of 50 for every imported variant

          parent.variants.push({
            id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: [optVal, item['Option2 Value'] || item.option2_val].filter(Boolean).join(' / ') || `Variant ${parent.variants.length + 1}`,
            sku: varSku || `${parent.sku}-V${parent.variants.length + 1}`,
            price: Number(item['Variant Price'] || parent.price),
            stock: vStock,
            barcode: item['Variant Barcode'] || ''
          });
          parent.stock += vStock;
        }
      }
    }
  }

  return Array.from(map.values());
}

// POST bulk-import products (Admin Only)
router.post('/bulk-import', authenticateToken, requireAdmin, (req, res) => {
  let inTransaction = false;
  try {
    const { products: rawProducts, updateExisting = true } = req.body;

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return res.status(400).json({ error: 'Please provide a valid array of products to import.' });
    }

    // Collapse multi-row variant rows (prevents duplication of 1,151 products across 3,263 rows)
    const products = collapseCatalogRows(rawProducts);

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];

    // Begin ACID transaction for high-performance batch insertion
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    inTransaction = true;

    const checkSkuStmt = db.prepare('SELECT id FROM products WHERE sku = ?');
    const checkIdStmt = db.prepare('SELECT id FROM products WHERE id = ?');

    const insertStmt = db.prepare(`
      INSERT INTO products (
        id, name, sku, category, age_group, brand, price, original_price,
        stock, is_featured, is_bestseller, is_new_arrival, images_json, description, features_json, specs_json, variants_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE products SET
        name = ?,
        category = ?,
        age_group = ?,
        brand = ?,
        price = ?,
        original_price = ?,
        stock = ?,
        is_featured = ?,
        is_bestseller = ?,
        is_new_arrival = ?,
        images_json = ?,
        description = ?,
        features_json = ?,
        specs_json = ?,
        variants_json = ?
      WHERE id = ?
    `);

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      if (!item.name || item.price === undefined || item.price === null || isNaN(Number(item.price))) {
        errors.push({ index: i, name: item.name || 'Unknown', reason: 'Missing name or valid price' });
        continue;
      }

      const sku = item.sku ? String(item.sku).trim() : `TY-IN-${Math.floor(100000 + Math.random() * 900000)}`;
      const price = Number(item.price);
      const originalPrice = item.originalPrice !== undefined && item.originalPrice !== null && !isNaN(Number(item.originalPrice))
        ? Number(item.originalPrice)
        : price;
      const stock = item.stock !== undefined && !isNaN(Number(item.stock)) ? Number(item.stock) : 10;
      const category = item.category || 'STEM & Learning';
      const ageGroup = item.ageGroup || item.age_group || '6-8 yrs';
      const brand = item.brand || 'ToyVerse India';
      const description = item.description || '';

      // Images handling: array or comma-separated string
      let imagesArr = [];
      if (Array.isArray(item.images)) {
        imagesArr = item.images.filter(Boolean);
      } else if (typeof item.images === 'string' && item.images.trim()) {
        imagesArr = item.images.split(',').map(s => s.trim()).filter(Boolean);
      } else if (item.image) {
        imagesArr = [item.image];
      }
      if (imagesArr.length === 0) {
        imagesArr = ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'];
      }

      // Features handling: array or delimiter separated string
      let featuresArr = [];
      if (Array.isArray(item.features)) {
        featuresArr = item.features.filter(Boolean);
      } else if (typeof item.features === 'string' && item.features.trim()) {
        featuresArr = item.features.split(/[|\n]/).map(s => s.trim()).filter(Boolean);
      }

      // Specs handling: object or JSON string
      let specsObj = {};
      if (item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs)) {
        specsObj = item.specs;
      } else if (typeof item.specs === 'string') {
        try {
          specsObj = JSON.parse(item.specs);
        } catch {
          specsObj = { details: item.specs };
        }
      }

      // Variants handling: array of variants
      let variantsArr = [];
      if (Array.isArray(item.variants)) {
        variantsArr = item.variants;
      } else if (typeof item.variants === 'string') {
        try {
          variantsArr = JSON.parse(item.variants);
        } catch {
          variantsArr = [];
        }
      }

      const isFeatured = item.isFeatured ? 1 : 0;
      const isBestSeller = item.isBestSeller ? 1 : 0;
      const isNewArrival = item.isNewArrival !== undefined ? (item.isNewArrival ? 1 : 0) : 1;

      // Check if exists
      let existing = null;
      if (item.id) {
        existing = checkIdStmt.get(item.id);
      }
      if (!existing && item.handle) {
        existing = checkIdStmt.get(item.handle);
      }
      if (!existing && sku) {
        existing = checkSkuStmt.get(sku);
      }

      if (existing && updateExisting) {
        updateStmt.run(
          item.name,
          category,
          ageGroup,
          brand,
          price,
          originalPrice,
          stock,
          isFeatured,
          isBestSeller,
          isNewArrival,
          JSON.stringify(imagesArr),
          description,
          JSON.stringify(featuresArr),
          JSON.stringify(specsObj),
          JSON.stringify(variantsArr),
          existing.id
        );
        updatedCount++;
      } else {
        const candidateId = item.id || item.handle || `toy-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newId = checkIdStmt.get(candidateId) ? `toy-${Date.now()}-${Math.floor(Math.random() * 10000)}` : candidateId;
        insertStmt.run(
          newId,
          item.name,
          sku,
          category,
          ageGroup,
          brand,
          price,
          originalPrice,
          stock,
          isFeatured,
          isBestSeller,
          isNewArrival,
          JSON.stringify(imagesArr),
          description,
          JSON.stringify(featuresArr),
          JSON.stringify(specsObj),
          JSON.stringify(variantsArr)
        );
        importedCount++;
      }
    }

    // Commit all changes in a single atomic disk flush
    db.exec('COMMIT;');
    inTransaction = false;

    res.json({
      success: true,
      message: `Bulk import completed! Processed ${products.length} catalog toys (${importedCount} new toys added, ${updatedCount} existing items updated).`,
      importedCount,
      updatedCount,
      totalCatalogProducts: products.length,
      errorsCount: errors.length,
      errors
    });
  } catch (err) {
    if (inTransaction) {
      try { db.exec('ROLLBACK;'); } catch (rbErr) {}
    }
    console.error('Bulk import error:', err);
    res.status(500).json({ error: `Bulk import failed: ${err.message}` });
  }
});

// POST new product (Admin Only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      name, sku, category, ageGroup, brand, price, originalPrice, stock,
      images, description, features, specs, variants, isFeatured, isBestSeller, isNewArrival
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    const id = req.body.id || `toy-${Date.now()}`;
    const generatedSku = sku || `TY-IN-${Math.floor(1000 + Math.random() * 9000)}`;
    const imagesArr = Array.isArray(images) && images.length ? images.filter(Boolean) : [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'
    ];

    const insert = db.prepare(`
      INSERT INTO products (
        id, name, sku, category, age_group, brand, price, original_price,
        stock, is_featured, is_bestseller, is_new_arrival, images_json, description, features_json, specs_json, variants_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      name,
      generatedSku,
      category || 'STEM & Learning',
      ageGroup || '6-8 yrs',
      brand || 'ToyVerse India',
      Number(price),
      originalPrice ? Number(originalPrice) : Number(price),
      Number(stock) || 10,
      isFeatured ? 1 : 0,
      isBestSeller ? 1 : 0,
      isNewArrival ? 1 : 0,
      JSON.stringify(imagesArr),
      description || '',
      JSON.stringify(features || []),
      JSON.stringify(specs || {}),
      JSON.stringify(variants || [])
    );

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    logAudit(req.user?.email || 'admin', 'product_created', id, { name, price, sku });
    res.status(201).json(formatProduct(created));
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT update product (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      name, sku, category, ageGroup, brand, price, originalPrice, stock,
      images, description, features, specs, variants, isFeatured, isBestSeller, isNewArrival
    } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const update = db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        category = COALESCE(?, category),
        age_group = COALESCE(?, age_group),
        brand = COALESCE(?, brand),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        stock = COALESCE(?, stock),
        is_featured = COALESCE(?, is_featured),
        is_bestseller = COALESCE(?, is_bestseller),
        is_new_arrival = COALESCE(?, is_new_arrival),
        images_json = COALESCE(?, images_json),
        description = COALESCE(?, description),
        features_json = COALESCE(?, features_json),
        specs_json = COALESCE(?, specs_json),
        variants_json = COALESCE(?, variants_json)
      WHERE id = ?
    `);

    update.run(
      name,
      sku,
      category,
      ageGroup,
      brand,
      price ? Number(price) : null,
      originalPrice ? Number(originalPrice) : null,
      stock !== undefined ? Number(stock) : null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      isBestSeller !== undefined ? (isBestSeller ? 1 : 0) : null,
      isNewArrival !== undefined ? (isNewArrival ? 1 : 0) : null,
      images ? JSON.stringify(images.filter(Boolean)) : null,
      description,
      features ? JSON.stringify(features) : null,
      specs ? JSON.stringify(specs) : null,
      variants ? JSON.stringify(variants) : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    logAudit(req.user?.email || 'admin', 'product_updated', req.params.id, { name, price, stock });
    res.json(formatProduct(updated));
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE product (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    logAudit(req.user?.email || 'admin', 'product_deleted', req.params.id);
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// PATCH adjust stock (Admin Only)
router.patch('/:id/stock', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { delta, stock } = req.body;
    if (stock !== undefined) {
      db.prepare('UPDATE products SET stock = MAX(0, ?) WHERE id = ?').run(Number(stock), req.params.id);
    } else if (delta !== undefined) {
      db.prepare('UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?').run(Number(delta), req.params.id);
    }

    const updated = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id);
    const newStock = updated ? updated.stock : 0;
    logAudit(req.user?.email || 'admin', 'inventory_adjusted', req.params.id, { delta, stock: newStock });
    res.json({ stock: newStock });
  } catch (err) {
    res.status(500).json({ error: 'Failed to adjust stock.' });
  }
});

// POST Add Review to product
router.post('/:id/reviews', optionalAuth, (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    if (!comment || !rating) {
      return res.status(400).json({ error: 'Rating and comment are required.' });
    }

    const revId = `rev-${Date.now()}`;
    const authorName = req.user ? req.user.name : (user || 'Verified Parent');
    const userId = req.user ? req.user.id : null;

    db.prepare(`
      INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(revId, req.params.id, userId, authorName, Number(rating), comment);

    // Update product rating and reviews_count
    const stats = db.prepare(`
      SELECT AVG(rating) as avgRating, COUNT(*) as revCount
      FROM reviews WHERE product_id = ?
    `).get(req.params.id);

    db.prepare(`
      UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?
    `).run(Number((stats.avgRating || 5).toFixed(1)), stats.revCount, req.params.id);

    res.status(201).json({
      message: 'Review posted successfully!',
      review: {
        id: revId,
        user: authorName,
        rating: Number(rating),
        comment,
        verified: true,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

export default router;
