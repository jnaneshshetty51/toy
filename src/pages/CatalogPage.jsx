import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Filter, 
  X, 
  SlidersHorizontal, 
  Search, 
  Check, 
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api, formatINR } from '../services/api';
import { TOY_CATEGORIES, AGE_GROUPS } from '../data/mockToys';
import ProductCard from '../components/ProductCard';
import './CatalogPage.css';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [toys, setToys] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter States from URL or defaults
  const queryParam = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const ageParam = searchParams.get('age') || 'all';
  const brandParam = searchParams.get('brand') || 'all';
  const dealsParam = searchParams.get('deals') === 'true';
  const featuredParam = searchParams.get('featured') === 'true';
  const sortParam = searchParams.get('sort') || 'featured';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const maxPriceParam = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice'), 10) : 30000;

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedAge, setSelectedAge] = useState(ageParam);
  const [selectedBrand, setSelectedBrand] = useState(brandParam);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [priceMax, setPriceMax] = useState(maxPriceParam); // INR max
  const [minRating, setMinRating] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState(sortParam);
  const [didYouMean, setDidYouMean] = useState(null);

  // Pagination states (Req 113)
  const [currentPage, setCurrentPage] = useState(pageParam || 1);
  const [pageSize, setPageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Load distinct brands from backend
  useEffect(() => {
    api.products.getBrands()
      .then(b => setBrandsList(b || []))
      .catch(() => {});
  }, []);

  // Load from backend API with pagination
  const loadProducts = (targetPage = currentPage, currentLimit = pageSize) => {
    setLoading(true);
    api.products.getAll({
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      age: selectedAge !== 'all' ? selectedAge : undefined,
      brand: selectedBrand !== 'all' ? selectedBrand : undefined,
      maxPrice: priceMax < 30000 ? priceMax : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      inStock: onlyInStock ? 'true' : undefined,
      featured: featuredParam ? 'true' : undefined,
      deals: dealsParam ? 'true' : undefined,
      popularity: sortBy === 'popularity' ? 'true' : undefined,
      sort: sortBy,
      page: targetPage,
      limit: currentLimit,
      withMeta: 'true'
    })
      .then(res => {
        if (res && res.products) {
          setToys(res.products || []);
          setDidYouMean(res.didYouMean || null);
          setTotalProducts(res.total || 0);
          setTotalPages(res.totalPages || 1);
          setCurrentPage(res.page || targetPage);
        } else {
          const list = Array.isArray(res) ? res : [];
          setToys(list);
          setTotalProducts(list.length);
          setTotalPages(1);
          setDidYouMean(null);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setSearchParams(prev => {
      if (newPage === 1) prev.delete('page');
      else prev.set('page', newPage);
      return prev;
    });
    loadProducts(newPage, pageSize);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
    loadProducts(1, pageSize);
  }, [selectedCategory, selectedAge, selectedBrand, priceMax, minRating, onlyInStock, sortBy, dealsParam, featuredParam]);

  // Sync state if URL changes
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || 'all');
    setSelectedAge(searchParams.get('age') || 'all');
    setSelectedBrand(searchParams.get('brand') || 'all');
    setSearchQuery(searchParams.get('search') || '');
    if (searchParams.get('sort')) setSortBy(searchParams.get('sort'));
    if (searchParams.get('page')) setCurrentPage(parseInt(searchParams.get('page'), 10));
    if (searchParams.has('maxPrice')) {
      setPriceMax(parseInt(searchParams.get('maxPrice'), 10));
    } else {
      setPriceMax(30000);
    }
  }, [searchParams]);

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedAge('all');
    setSelectedBrand('all');
    setSearchQuery('');
    setPriceMax(30000);
    setMinRating(0);
    setOnlyInStock(false);
    setSortBy('featured');
    setSearchParams({});
  };

  const hasActiveFilters = 
    selectedCategory !== 'all' || 
    selectedAge !== 'all' || 
    selectedBrand !== 'all' ||
    searchQuery.trim() !== '' || 
    priceMax < 30000 || 
    minRating > 0 ||
    onlyInStock ||
    dealsParam ||
    featuredParam ||
    sortBy !== 'featured';

  return (
    <div className="catalog-page-root animate-fade-in">
      {/* Breadcrumb Navigation Bar */}
      <nav className="detail-breadcrumb-bar" aria-label="Breadcrumb">
        <div className="container breadcrumb-container">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-divider">/</span>
          <Link to="/shop" className="breadcrumb-link">Shop</Link>
          {selectedCategory !== 'all' && (
            <>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current" aria-current="page">{selectedCategory}</span>
            </>
          )}
          {searchQuery && (
            <>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current" aria-current="page">Search: &ldquo;{searchQuery}&rdquo;</span>
            </>
          )}
          {selectedCategory === 'all' && !searchQuery && (
            <>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current" aria-current="page">All Toys</span>
            </>
          )}
        </div>
      </nav>

      {/* Header Banner */}
      <div className="catalog-header-banner">
        <div className="container catalog-header-content">
          <div>
            <span className="catalog-tag">🧸 Explore Our Toy Wonderland ({toys.length} Toys)</span>
            <h1 className="catalog-title">
              {dealsParam ? '🎉 Festive Special Offers & Discounts' : 
               featuredParam ? '⭐ Handpicked Best Sellers for Kids' :
               selectedCategory !== 'all' ? selectedCategory : 
               'All Toys, Games & STEM Kits'}
            </h1>
            <p className="catalog-subtitle">
              100% BIS IS-9873 Child-Safe Certified • Safe, non-toxic & crafted for joyful play • Express delivery across India.
            </p>
          </div>
          <div className="catalog-header-meta">
            <span>🇮🇳 All India Delivery • Instant Zero-Fee UPI & Fast Dispatch</span>
          </div>
        </div>
      </div>

      <div className="container catalog-layout-container">
        {/* Mobile Filter Bar */}
        <div className="mobile-filter-bar">
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setMobileFilterOpen(true)}
          >
            <SlidersHorizontal size={14} />
            <span>Filter Toys ({hasActiveFilters ? 'Active' : 'All'})</span>
          </button>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-dropdown"
          >
            <option value="featured">Featured First ⭐</option>
            <option value="popularity">Best Sellers 🔥</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated ★</option>
            <option value="newest">New Arrivals 🚀</option>
          </select>
        </div>

        {/* Filter Sidebar */}
        <aside className={`catalog-sidebar ${mobileFilterOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">🎯 Filter Toys</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearAllFilters}>
                  Clear All
                </button>
              )}
              <button 
                type="button" 
                className="sidebar-close-btn" 
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Keyword Search */}
          <div className="filter-group">
            <label className="filter-group-label">Search In Results</label>
            <form onSubmit={(e) => { e.preventDefault(); loadProducts(); }} className="sidebar-search-input-wrap">
              <Search size={14} className="text-muted" />
              <input
                type="text"
                placeholder="Title, SKU, or Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); loadProducts(); }} className="btn-ghost" style={{ padding: '0 0.2rem' }}>
                  <X size={12} />
                </button>
              )}
            </form>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <label className="filter-group-label">Category</label>
            <div className="filter-radio-list">
              {TOY_CATEGORIES.map(cat => (
                <label key={cat.id} className="filter-radio-label">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat.id}
                    onChange={() => {
                      setSelectedCategory(cat.id);
                      setSearchParams(prev => {
                        if (cat.id === 'all') prev.delete('category');
                        else prev.set('category', cat.id);
                        return prev;
                      });
                    }}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Age Demographic Filter */}
          <div className="filter-group">
            <label className="filter-group-label">Age Demographic</label>
            <div className="filter-radio-list">
              {AGE_GROUPS.map(ag => (
                <label key={ag.id} className="filter-radio-label">
                  <input
                    type="radio"
                    name="age"
                    checked={selectedAge === ag.id}
                    onChange={() => {
                      setSelectedAge(ag.id);
                      setSearchParams(prev => {
                        if (ag.id === 'all') prev.delete('age');
                        else prev.set('age', ag.id);
                        return prev;
                      });
                    }}
                  />
                  <span>{ag.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          {brandsList.length > 0 && (
            <div className="filter-group">
              <label className="filter-group-label">Brand & Provenance</label>
              <div className="filter-radio-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                <label className="filter-radio-label">
                  <input
                    type="radio"
                    name="brand"
                    checked={selectedBrand === 'all'}
                    onChange={() => setSelectedBrand('all')}
                  />
                  <span>All Brands & Hubs</span>
                </label>
                {brandsList.map(b => (
                  <label key={b} className="filter-radio-label">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === b}
                      onChange={() => setSelectedBrand(b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Slider (INR ₹) */}
          <div className="filter-group">
            <div className="price-slider-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="filter-group-label" style={{ marginBottom: 0 }}>Max Budget</label>
                <span className="price-tag-badge" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatINR(priceMax)}</span>
              </div>
              <input
                type="range"
                min="100"
                max="30000"
                step="500"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="price-range-slider"
              />
              <div className="price-slider-values">
                <span>{formatINR(100)}</span>
                <span>{formatINR(30000)}+</span>
              </div>
            </div>
          </div>

          {/* Minimum Rating Filter */}
          <div className="filter-group">
            <label className="filter-group-label">Parent & Kid Rating</label>
            <div className="filter-radio-list">
              {[
                { label: 'All Ratings', val: 0 },
                { label: '4.5 ★ & Higher (Loved)', val: 4.5 },
                { label: '4.0 ★ & Higher (Popular)', val: 4.0 },
                { label: '3.5 ★ & Higher', val: 3.5 }
              ].map(r => (
                <label key={r.val} className="filter-radio-label">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === r.val}
                    onChange={() => setMinRating(r.val)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability / Stock Toggle */}
          <div className="filter-group">
            <label className="filter-radio-label">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
              />
              <span style={{ fontWeight: 700 }}>In-Stock Toys Only 🚀</span>
            </label>
          </div>

          {/* Mobile Apply Bar */}
          <div className="mobile-apply-bar">
            <button 
              type="button" 
              className="btn btn-primary btn-block" 
              onClick={() => setMobileFilterOpen(false)}
            >
              Show {toys.length} Toys 🎉
            </button>
          </div>
        </aside>

        {/* Main Content Stream */}
        <main className="catalog-main-stream">
          {/* Active Filter Chips & Sort Toolbar */}
          <div className="active-filters-bar">
            <div className="active-filter-chips">
              <span className="toys-count-label" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Showing <strong>{toys.length}</strong> toys
              </span>
              {selectedCategory !== 'all' && (
                <span className="filter-chip">
                  Category: {selectedCategory}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('all')} />
                </span>
              )}
              {selectedBrand !== 'all' && (
                <span className="filter-chip">
                  Brand: {selectedBrand}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedBrand('all')} />
                </span>
              )}
              {selectedAge !== 'all' && (
                <span className="filter-chip">
                  Age: {selectedAge}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedAge('all')} />
                </span>
              )}
              {minRating > 0 && (
                <span className="filter-chip">
                  Rating: &ge; {minRating}★
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setMinRating(0)} />
                </span>
              )}
              {onlyInStock && (
                <span className="filter-chip">
                  In-Stock Only
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setOnlyInStock(false)} />
                </span>
              )}
            </div>

            <div className="sort-select-wrap">
              <label>Sort By:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-dropdown"
              >
                <option value="featured">Featured First ⭐</option>
                <option value="popularity">Best Sellers 🔥</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated ★</option>
                <option value="newest">New Arrivals 🚀</option>
              </select>
            </div>
          </div>

          {/* Typo Tolerance Suggestion Banner */}
          {didYouMean && (
            <div className="typo-banner">
              <div>
                <span>Did you mean </span>
                <strong style={{ color: 'var(--color-primary)' }}>"{didYouMean}"</strong>?
                <span className="text-muted"> (Showing suggestions for "{didYouMean}")</span>
              </div>
              <button 
                type="button"
                className="btn-ghost" 
                style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', background: 'transparent', border: 'none' }}
                onClick={() => {
                  setSearchQuery(didYouMean);
                }}
              >
                Search "{didYouMean}"
              </button>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="catalog-loading-box">
              <span className="loading-spinner-emoji">🧸</span>
              <p style={{ fontWeight: 700, marginTop: '1rem' }}>Finding amazing toys for you...</p>
            </div>
          ) : toys.length === 0 ? (
            <div className="catalog-empty-box">
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎈</span>
              <h3 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>No toys match your filters</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                Try adjusting the age demographic, expanding the budget range, or clearing active filters to see more fun toys!
              </p>
              <button className="btn btn-primary" onClick={clearAllFilters}>
                Clear All Filters 🔄
              </button>
            </div>
          ) : (
            <>
              <div className="catalog-products-grid">
                {toys.map(toy => (
                  <ProductCard key={toy.id} toy={toy} />
                ))}
              </div>

              {/* Pagination Controls (Req 113 & 115) */}
              {totalPages > 1 && (
                <nav className="catalog-pagination" aria-label="Catalog Navigation">
                  <div className="pagination-info">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} toys
                  </div>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>

                    {getPageNumbers().map((p, i) => (
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                          onClick={() => handlePageChange(p)}
                          aria-label={`Page ${p}`}
                          aria-current={p === currentPage ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      )
                    ))}

                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="pagination-page-size">
                    <label htmlFor="pageSizeSelect">Show per page:</label>
                    <select
                      id="pageSizeSelect"
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setPageSize(newSize);
                        setCurrentPage(1);
                        loadProducts(1, newSize);
                      }}
                    >
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48">48</option>
                      <option value="96">96</option>
                    </select>
                  </div>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
