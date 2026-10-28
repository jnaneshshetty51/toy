import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  User, 
  ShieldCheck, 
  Sparkles, 
  Menu, 
  X, 
  ChevronDown,
  Gift,
  LogOut,
  LogIn,
  ExternalLink
} from 'lucide-react';
import { useCart, FREE_SHIPPING_THRESHOLD_INR } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../services/api';
import { AGE_GROUPS, TOY_CATEGORIES } from '../data/mockToys';
import './Navbar.css';

export default function Navbar() {
  const { cartCount, wishlist, setIsCartOpen } = useCart();
  const { role, user, isAuthenticated, logout, quickDemoLogin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ products: [], categories: [], brands: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [activeBanner, setActiveBanner] = useState(null);

  useEffect(() => {
    api.operations.getBanners()
      .then(banners => {
        if (banners && banners.length > 0) {
          setActiveBanner(banners[0]);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      api.products.getAutocomplete(searchQuery.trim())
        .then(res => {
          setSuggestions(res || { products: [], categories: [], brands: [] });
          setShowSuggestions(true);
        })
        .catch(() => {});
    } else {
      setSuggestions({ products: [], categories: [], brands: [] });
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-wrapper">
      {/* Top Banner (Indian Context) */}
      <div className="top-banner">
        <div className="container top-banner-content">
          <div className="banner-left">
            <span className="banner-tag">
              {activeBanner ? (activeBanner.title ? activeBanner.title.split(' ')[0] : 'ANNOUNCEMENT') : 'DIWALI SPECIAL'}
            </span>
            <span className="banner-text">
              {activeBanner ? (
                <>
                  <strong className="highlight">{activeBanner.title}</strong> — {activeBanner.subtitle}{' '}
                  {(activeBanner.cta_link || activeBanner.ctaLink) && (
                    <Link to={activeBanner.cta_link || activeBanner.ctaLink} className="banner-cta-link text-amber hover:underline ml-1">
                      {activeBanner.cta_text || activeBanner.ctaText || 'Shop Now'} →
                    </Link>
                  )}
                </>
              ) : (
                <>
                  Use coupon <strong className="highlight">DIWALI20</strong> for 20% OFF! Free Delivery across India on orders above {formatINR(FREE_SHIPPING_THRESHOLD_INR)} 🚚 🇮🇳
                </>
              )}
            </span>
          </div>
          <div className="banner-right">
            <span>Delivering to 19,000+ PIN Codes</span>
            <span className="banner-divider">|</span>
            <span className="banner-delivery-badge">100% Genuine BIS Certified 🇮🇳</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="main-navbar">
        <div className="container main-navbar-container">
          {/* Logo */}
          <Link to={isAdminRoute ? "/admin" : "/"} className="brand-logo">
            <div className="logo-icon-bg">
              <span style={{ fontSize: '1.4rem' }}>🧸</span>
            </div>
            <div className="logo-text-group">
              <span className="brand-title">
                ToyVerse {isAdminRoute ? <span className="badge badge-amber text-xs ml-1 font-bold">ADMIN</span> : <span className="brand-country-tag">India</span>}
              </span>
              <span className="brand-tagline">
                {isAdminRoute ? 'Store Operations Console' : 'Wonder • Play • Learn'}
              </span>
            </div>
          </Link>

          {isAdminRoute ? (
            /* Admin Quick Links in Nav */
            <div className="admin-header-nav-links">
              <Link to="/admin" className={`admin-header-link ${location.pathname === '/admin' ? 'active' : ''}`}>Overview</Link>
              <Link to="/admin/products" className={`admin-header-link ${location.pathname === '/admin/products' ? 'active' : ''}`}>Products</Link>
              <Link to="/admin/orders" className={`admin-header-link ${location.pathname === '/admin/orders' ? 'active' : ''}`}>Orders</Link>
              <Link to="/admin/coupons" className={`admin-header-link ${location.pathname === '/admin/coupons' ? 'active' : ''}`}>Coupons</Link>
              <Link to="/admin/operations?tab=banners" className={`admin-header-link ${location.search.includes('tab=banners') ? 'active' : ''}`}>Banners CMS</Link>
              <Link to="/admin/operations" className={`admin-header-link ${location.pathname === '/admin/operations' && !location.search.includes('tab=banners') ? 'active' : ''}`}>Operations</Link>
            </div>
          ) : (
            /* Search Bar with Autocomplete Dropdown */
            <div className="nav-search-container" style={{ position: 'relative', flex: 1, maxWidth: '520px' }}>
              <form className="nav-search-form" onSubmit={handleSearchSubmit}>
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search toys, LEGO, robots, dolls, puzzles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setShowSuggestions(true);
                    }}
                    className="nav-search-input"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      className="search-clear-btn"
                      onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>

              {/* Live Autocomplete Dropdown */}
              {showSuggestions && (suggestions.products?.length > 0 || suggestions.categories?.length > 0 || suggestions.brands?.length > 0) && (
                <div className="autocomplete-dropdown card" style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {suggestions.didYouMean && (
                    <div style={{
                      padding: '0.4rem 0.6rem',
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>Did you mean: <strong 
                        style={{ color: '#B45309', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => {
                          setSearchQuery(suggestions.didYouMean);
                          navigate(`/shop?search=${encodeURIComponent(suggestions.didYouMean)}`);
                          setShowSuggestions(false);
                        }}
                      >{suggestions.didYouMean}</strong>?</span>
                      <span style={{ fontSize: '0.65rem', color: '#92400E', fontFamily: 'var(--font-family-mono)' }}>Typo Corrected</span>
                    </div>
                  )}

                  {(suggestions.categories?.length > 0 || suggestions.brands?.length > 0) && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                      {suggestions.categories.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setShowSuggestions(false);
                            navigate(`/shop?category=${encodeURIComponent(c)}`);
                          }}
                          style={{
                            padding: '0.2rem 0.5rem',
                            background: '#F4F4F5',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-family-mono)',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: 'var(--color-text-muted)' }}>CAT:</span> {c}
                        </button>
                      ))}
                      {suggestions.brands.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setShowSuggestions(false);
                            navigate(`/shop?brand=${encodeURIComponent(b)}`);
                          }}
                          style={{
                            padding: '0.2rem 0.5rem',
                            background: '#F4F4F5',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-family-mono)',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: 'var(--color-text-muted)' }}>BRAND:</span> {b}
                        </button>
                      ))}
                    </div>
                  )}

                  {suggestions.products?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
                        MATCHING REGISTER ITEMS:
                      </span>
                      {suggestions.products.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setShowSuggestions(false);
                            navigate(`/product/${p.id}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.4rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F4F4F5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.825rem', color: 'var(--color-text-main)', lineHeight: 1.25 }}>{p.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>{p.category} • {p.brand}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem', fontWeight: 700 }}>{formatINR(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Icons */}
          <div className="nav-actions-group">
            {isAdminRoute ? (
              <Link to="/" target="_blank" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }} title="Open customer storefront in a new tab">
                <ExternalLink size={14} />
                <span>View Storefront</span>
              </Link>
            ) : (
              <>
                {/* Wishlist */}
                <Link to="/account/wishlist" className="nav-action-link" title="Saved Wishlist">
                  <Heart size={18} className="nav-heart-icon" />
                  <span>Wishlist</span>
                  {wishlist.length > 0 && <span className="nav-count-badge pill-pink">{wishlist.length}</span>}
                </Link>

                {/* Cart Trigger */}
                <button 
                  onClick={() => setIsCartOpen(true)} 
                  className="nav-action-link nav-cart-trigger"
                  title="Shopping Cart"
                >
                  <ShoppingBag size={18} />
                  <span>Cart</span>
                  {cartCount > 0 && <span className="nav-count-badge pill-coral">{cartCount}</span>}
                </button>
              </>
            )}

            {/* User Dropdown */}
            {isAuthenticated ? (
              <div className="user-menu-wrapper">
                <button 
                  className="user-trigger-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  onBlur={() => setTimeout(() => setUserDropdownOpen(false), 250)}
                >
                  {role === 'admin' ? <ShieldCheck size={14} /> : <User size={14} />}
                  <span>{user?.name ? user.name.split(' ')[0] : 'User'}</span>
                  <span className="badge" style={{ fontSize: '0.65rem' }}>{role.toUpperCase()}</span>
                  <ChevronDown size={12} />
                </button>

                {userDropdownOpen && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-header">
                      <p className="dropdown-user-name">{user?.name}</p>
                      <p className="dropdown-user-role">
                        {user?.email} • <span className={role === 'admin' ? 'badge-role-admin' : 'badge-role-customer'}>{role.toUpperCase()}</span>
                      </p>
                    </div>

                    <div className="dropdown-divider"></div>

                    {role === 'admin' ? (
                      <>
                        <Link to="/admin" className="dropdown-item">
                          <ShieldCheck size={16} /> Admin Dashboard
                        </Link>
                        <Link to="/admin/products" className="dropdown-item">
                          📦 Product Inventory
                        </Link>
                        <Link to="/admin/orders" className="dropdown-item">
                          📑 Order Dispatches
                        </Link>
                        <Link to="/admin/coupons" className="dropdown-item">
                          🎟️ Coupons & Offers
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to="/account" className="dropdown-item">
                          👤 My Account Overview
                        </Link>
                        <Link to="/account/orders" className="dropdown-item">
                          📦 My Orders & Tracking
                        </Link>
                        <Link to="/account/wishlist" className="dropdown-item">
                          ❤️ Saved Toys ({wishlist.length})
                        </Link>
                        <Link to="/account/addresses" className="dropdown-item">
                          📍 Delivery Addresses
                        </Link>
                      </>
                    )}

                    <div className="dropdown-divider"></div>

                    {role === 'admin' && (
                      <Link to="/admin" className="dropdown-item">
                        <ShieldCheck size={16} /> Admin Portal Console
                      </Link>
                    )}

                    <button 
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }} 
                      className="dropdown-item text-danger"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm login-nav-btn">
                <LogIn size={14} />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button 
              className="mobile-hamburger" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Secondary Category / Links Bar - Customer Storefront Only */}
        {!isAdminRoute && (
          <div className="sub-navbar">
            <div className="container sub-nav-container">
              <div className="nav-links">
                <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                  Home
                </Link>
                <Link to="/shop" className={`nav-link ${isActive('/shop') && !location.search.includes('featured') && !location.search.includes('category') ? 'active' : ''}`}>
                  All Toys
                </Link>

                {/* All 18 Categories Megamenu Dropdown */}
                <div 
                  className="nav-item-dropdown"
                  onMouseEnter={() => setCategoriesDropdownOpen(true)}
                  onMouseLeave={() => setCategoriesDropdownOpen(false)}
                >
                  <button 
                    className={`nav-link nav-dropdown-btn ${location.search.includes('category') ? 'active' : ''}`}
                    onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                  >
                    <span>18 Categories</span>
                    <ChevronDown size={13} style={{ transform: categoriesDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {categoriesDropdownOpen && (
                    <div className="categories-megamenu animate-fade-in">
                      <div className="megamenu-header">
                        <span className="megamenu-title">BROWSE ALL 18 CLASSIFICATIONS</span>
                        <Link to="/shop" className="megamenu-view-all" onClick={() => setCategoriesDropdownOpen(false)}>
                          View All
                        </Link>
                      </div>
                      <div className="megamenu-grid">
                        {TOY_CATEGORIES.slice(1).map(cat => (
                          <Link
                            key={cat.id}
                            to={`/shop?category=${encodeURIComponent(cat.id)}`}
                            className="megamenu-item"
                            onClick={() => setCategoriesDropdownOpen(false)}
                          >
                            <span className="cat-bullet">▸</span>
                            <span className="cat-name">{cat.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link to="/shop?featured=true" className="nav-link nav-link-special">
                  <Sparkles size={14} className="icon-sparkle" /> Featured Indian Toys
                </Link>
                <Link to="/shop?deals=true" className="nav-link nav-link-sale">
                  <Gift size={14} /> Festive Deals
                </Link>
                {role === 'admin' && (
                  <Link to="/admin" className="nav-link nav-link-admin">
                    <ShieldCheck size={14} /> Admin Console
                  </Link>
                )}
              </div>

              {/* Age Quick Selector */}
              <div className="age-quick-bar">
                <span className="age-label">Shop by Age:</span>
                <div className="age-pills">
                  {AGE_GROUPS.slice(1).map(group => (
                    <Link 
                      key={group.id} 
                      to={`/shop?age=${encodeURIComponent(group.id)}`}
                      className="age-pill"
                    >
                      {group.badge || group.id}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-panel">
            <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search toys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
              />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>

            <div className="mobile-links">
              {isAdminRoute ? (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ADMIN NAVIGATION
                  </span>
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>📊 Overview & KPIs</Link>
                  <Link to="/admin/products" onClick={() => setMobileMenuOpen(false)}>📦 Products & Catalog</Link>
                  <Link to="/admin/orders" onClick={() => setMobileMenuOpen(false)}>🛍️ Orders & Dispatch</Link>
                  <Link to="/admin/coupons" onClick={() => setMobileMenuOpen(false)}>🏷️ Coupons & Promos</Link>
                  <Link to="/admin/operations?tab=banners" onClick={() => setMobileMenuOpen(false)}>📢 Store Banners CMS</Link>
                  <Link to="/admin/operations" onClick={() => setMobileMenuOpen(false)}>⚙️ Operations & UPI Engine</Link>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--color-secondary)' }}>
                    ↗ View Customer Storefront
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>🏠 Home</Link>
                  <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>🧸 Browse All Toys</Link>
                  <Link to="/shop?deals=true" onClick={() => setMobileMenuOpen(false)}>🔥 Festive Deals</Link>
                  <Link to="/account/orders" onClick={() => setMobileMenuOpen(false)}>📦 My Orders & Tracking</Link>
                  <Link to="/account/wishlist" onClick={() => setMobileMenuOpen(false)}>❤️ Saved Wishlist</Link>
                  {role === 'admin' && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>🛡️ Admin Portal</Link>
                  )}
                </>
              )}
              {isAuthenticated ? (
                <button 
                  onClick={() => { logout(); setMobileMenuOpen(false); navigate('/login'); }} 
                  className="mobile-logout-btn"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <LogIn size={16} /> Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
