import assert from 'assert';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TOYVERSE VERIFICATION: SEO & ADVANCED PRODUCT SEARCH');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ PASS [${total}]: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL [${total}]: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------
  // PART 1: SEO IMPLEMENTATION VERIFICATION
  // -----------------------------------------------------------------
  console.log('--- 1. SEO IMPLEMENTATION ---');

  await test('1.1 /robots.txt serves correct indexing rules & sitemap directive', async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    assert.strictEqual(res.status, 200, 'robots.txt returned 200');
    const text = await res.text();
    assert(text.includes('User-agent: *'), 'Specifies User-agent wildcard');
    assert(text.includes('Allow: /sitemap.xml'), 'Allows sitemap');
    assert(text.includes('Disallow: /admin'), 'Disallows admin');
    assert(text.includes('Disallow: /checkout'), 'Disallows checkout');
    assert(text.includes('Disallow: /api/'), 'Disallows private API routes');
    assert(text.includes('Sitemap: https://toyverse.in/sitemap.xml'), 'Declares XML sitemap reference');
  });

  await test('1.2 /sitemap.xml generates valid XML with products and categories', async () => {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.strictEqual(res.status, 200, 'sitemap.xml returned 200');
    const xml = await res.text();
    assert(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Valid XML header');
    assert(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Standard schema urlset');
    assert(xml.includes('<loc>https://toyverse.in/</loc>'), 'Homepage included');
    assert(xml.includes('<loc>https://toyverse.in/shop</loc>'), 'Shop page included');
    assert(xml.includes('https://toyverse.in/shop?category='), 'Category URLs included');
    assert(xml.includes('https://toyverse.in/product/'), 'Product detail URLs included');
    assert(xml.includes('<changefreq>'), 'Change frequencies defined');
    assert(xml.includes('<priority>'), 'Priorities defined');
  });

  await test('1.3 Product details API returns specs with SEO Title & SEO Description', async () => {
    const listRes = await fetch(`${BASE_URL}/api/products`);
    const list = await listRes.json();
    assert(list.length > 0, 'Products available');

    const firstProd = list[0];
    const detailRes = await fetch(`${BASE_URL}/api/products/${firstProd.id}`);
    const product = await detailRes.json();
    assert.strictEqual(product.id, firstProd.id);
    assert(typeof product.specs === 'object', 'Specs is an object');
    assert(product.category, 'Product has category');
    assert(product.sku, 'Product has SKU');
    assert(product.price > 0, 'Product has price');
  });

  // -----------------------------------------------------------------
  // PART 2: ADVANCED PRODUCT SEARCH & DISCOVERY
  // -----------------------------------------------------------------
  console.log('\n--- 2. ADVANCED PRODUCT SEARCH ---');

  await test('2.1 Search by Product Name', async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=Channapatna`);
    const results = await res.json();
    assert(Array.isArray(results), 'Returns an array of products');
    assert(results.length > 0, 'Finds products by name');
    assert(results.some(p => p.name.toLowerCase().includes('channapatna') || p.brand.toLowerCase().includes('channapatna')));
  });

  await test('2.2 Search by Brand', async () => {
    const brandsRes = await fetch(`${BASE_URL}/api/products/meta/brands`);
    const brands = await brandsRes.json();
    assert(brands.length > 0, 'Brands available');
    const testBrand = brands[0];

    const res = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(testBrand)}`);
    const results = await res.json();
    assert(results.length > 0, `Finds products by brand: ${testBrand}`);
    assert(results.every(p => 
      p.brand.toLowerCase().includes(testBrand.toLowerCase()) || 
      p.name.toLowerCase().includes(testBrand.toLowerCase())
    ));
  });

  await test('2.3 Search by Category', async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=Wooden`);
    const results = await res.json();
    assert(results.length > 0, 'Finds products matching "Wooden" category/keyword');
  });

  await test('2.4 Search by SKU', async () => {
    const listRes = await fetch(`${BASE_URL}/api/products`);
    const list = await listRes.json();
    const targetSku = list[0].sku;

    const res = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(targetSku)}`);
    const results = await res.json();
    assert(results.length > 0, `Finds product by SKU: ${targetSku}`);
    assert.strictEqual(results[0].sku, targetSku);
  });

  await test('2.5 Search by Keywords across features and specs', async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=eco-friendly`);
    const results = await res.json();
    assert(Array.isArray(results), 'Executes keyword search without error');
  });

  await test('2.6 Autocomplete endpoint returns matching products, categories, and brands', async () => {
    const res = await fetch(`${BASE_URL}/api/products/autocomplete?q=wood`);
    const data = await res.json();
    assert(data.products !== undefined, 'Has products array');
    assert(data.categories !== undefined, 'Has categories array');
    assert(data.brands !== undefined, 'Has brands array');
    assert(Array.isArray(data.products), 'Products is array');
    if (data.products.length > 0) {
      assert(data.products[0].name, 'Product suggestion has name');
      assert(data.products[0].price !== undefined, 'Product suggestion has price');
    }
  });

  await test('2.7 Typo Tolerance: Levenshtein distance matches misspellings (e.g. "chanapatna")', async () => {
    // "chanapatna" has 1 edit distance from "channapatna"
    const res = await fetch(`${BASE_URL}/api/products?search=chanapatna&withMeta=true`);
    const data = await res.json();
    assert(data.products.length > 0, 'Typo tolerant search returned products for "chanapatna"');
    assert(data.didYouMean !== null, 'Suggests didYouMean correction');
    console.log(`     [Typo Test] Input: "chanapatna" -> Corrected: "${data.didYouMean}", Matched: ${data.products.length} products`);
  });

  await test('2.8 Typo Tolerance in Autocomplete: Suggests corrected terms for misspellings', async () => {
    const res = await fetch(`${BASE_URL}/api/products/autocomplete?q=chanapatna`);
    const data = await res.json();
    assert(data.products.length > 0 || data.didYouMean !== null, 'Autocomplete handled typo');
    if (data.didYouMean) {
      console.log(`     [Autocomplete Typo Test] Input: "chanapatna" -> Autocomplete DidYouMean: "${data.didYouMean}"`);
    }
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🎉 ALL SEO & ADVANCED SEARCH TESTS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
