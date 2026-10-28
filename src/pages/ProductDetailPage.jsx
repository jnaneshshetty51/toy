import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  ShoppingBag, 
  Zap, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  Plus, 
  Minus, 
  ArrowLeft,
  Share2,
  Sparkles,
  MessageSquarePlus,
  ZoomIn,
  X as CloseIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api, formatINR } from '../services/api';
import { useCart, FREE_SHIPPING_THRESHOLD_INR } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInWishlist, toggleWishlist, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const [toy, setToy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [relatedToys, setRelatedToys] = useState([]);
  const [brandToys, setBrandToys] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  // Review form
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // High-Resolution Image Zoom & Lightbox
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
  };

  useEffect(() => {
    setLoading(true);
    api.products.getById(id)
      .then(item => {
        setToy(item);
        setActiveImageIndex(0);
        setQuantity(1);

        // 1. Fetch related products in the same category (Similar Toys)
        api.products.getAll({ category: item.category })
          .then(related => {
            setRelatedToys((related || []).filter(t => t.id !== id).slice(0, 4));
          })
          .catch(() => {});

        // 2. Fetch products from the same brand
        if (item.brand) {
          api.products.getAll({ brand: item.brand })
            .then(brandItems => {
              setBrandToys((brandItems || []).filter(t => t.id !== id).slice(0, 4));
            })
            .catch(() => {});
        }

        // 3. Recently viewed products from localStorage
        try {
          const rawStored = localStorage.getItem('toyverse_recently_viewed');
          const storedList = rawStored ? JSON.parse(rawStored) : [];
          setRecentlyViewed(storedList.filter(t => t.id !== id).slice(0, 4));

          const currentSummary = {
            id: item.id,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice,
            rating: item.rating,
            image: (item.images && item.images[0]) || item.image,
            category: item.category,
            brand: item.brand,
            stock: item.stock
          };
          const updatedRecent = [currentSummary, ...storedList.filter(t => t.id !== id)].slice(0, 8);
          localStorage.setItem('toyverse_recently_viewed', JSON.stringify(updatedRecent));
        } catch (err) {
          console.error('Error with recently viewed:', err);
        }
      })
      .catch(err => {
        console.error('Error fetching product:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Synchronize SEO Title, Description, Canonical Link & Robots Indexing Rules
  useEffect(() => {
    if (!toy) return;

    // 1. Dynamic SEO Title: Prefer imported SEO Title from specs, fallback to optimized format
    const seoTitle = toy.specs?.['SEO Title'] || `${toy.name} | Buy Online in India at ToyVerse`;
    document.title = seoTitle;

    // 2. Dynamic SEO Meta Description: Prefer imported SEO Description from specs
    const seoDesc = toy.specs?.['SEO Description'] || toy.description || `Buy ${toy.name} online at ToyVerse India. BIS IS-9873 child-safe certified, express pan-India delivery, COD available.`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = seoDesc;

    // 3. Dynamic Canonical URL
    const canonicalHref = `https://toyverse.in/product/${toy.id}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalHref;

    // 4. Search Engine Indexing Rules
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1';

    // 5. Social OpenGraph Tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = seoTitle;
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = seoDesc;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = canonicalHref;

    // 6. Schema.org Product Structured Data (JSON-LD for Google Rich Results)
    let jsonLdScript = document.querySelector('script#product-jsonld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'product-jsonld';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    const productImgs = toy.images && toy.images.length > 0 ? toy.images : [toy.image].filter(Boolean);
    const hasVar = Array.isArray(toy.variants) && toy.variants.length > 0;
    const v = hasVar ? toy.variants[selectedVariantIndex] : null;
    const prodPrice = v?.price ? Number(v.price) : toy.price;
    const prodSku = v?.sku || toy.sku;
    const prodStock = v?.stock !== undefined ? Number(v.stock) : toy.stock;

    const schemaObj = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: toy.name,
      image: productImgs,
      description: seoDesc,
      sku: prodSku,
      mpn: prodSku,
      brand: {
        '@type': 'Brand',
        name: toy.brand || 'ToyVerse India'
      },
      category: toy.category,
      offers: {
        '@type': 'Offer',
        url: canonicalHref,
        priceCurrency: 'INR',
        price: prodPrice,
        priceValidUntil: '2027-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: prodStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'ToyVerse India'
        }
      }
    };

    if (toy.rating && toy.reviewsCount > 0) {
      schemaObj.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: toy.rating,
        reviewCount: toy.reviewsCount,
        bestRating: '5',
        worstRating: '1'
      };
    }

    jsonLdScript.textContent = JSON.stringify(schemaObj, null, 2);

    // 7. Schema.org BreadcrumbList Structured Data (Req 98)
    let breadcrumbJsonLd = document.querySelector('script#breadcrumb-jsonld');
    if (!breadcrumbJsonLd) {
      breadcrumbJsonLd = document.createElement('script');
      breadcrumbJsonLd.id = 'breadcrumb-jsonld';
      breadcrumbJsonLd.type = 'application/ld+json';
      document.head.appendChild(breadcrumbJsonLd);
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://toyverse.in/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shop',
          item: 'https://toyverse.in/shop'
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: toy.category || 'Toys',
          item: `https://toyverse.in/shop?category=${encodeURIComponent(toy.category || 'Toys')}`
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: toy.name,
          item: canonicalHref
        }
      ]
    };
    breadcrumbJsonLd.textContent = JSON.stringify(breadcrumbSchema, null, 2);

    return () => {
      const el = document.querySelector('script#product-jsonld');
      if (el) el.remove();
      const bEl = document.querySelector('script#breadcrumb-jsonld');
      if (bEl) bEl.remove();
    };
  }, [toy, selectedVariantIndex]);

  if (!toy && !loading) {
    return (
      <div className="container p-detail-notfound">
        <h2>Toy not found</h2>
        <p>The toy you are searching for might have found another home.</p>
        <Link to="/shop" className="btn btn-primary">Back to Shop</Link>
      </div>
    );
  }

  if (loading || !toy) {
    return (
      <div className="container p-detail-loading" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>Loading toy details...</h2>
      </div>
    );
  }

  const hasVariants = Array.isArray(toy.variants) && toy.variants.length > 0;
  const activeVariant = hasVariants ? toy.variants[selectedVariantIndex] : null;
  const currentPrice = activeVariant?.price ? Number(activeVariant.price) : toy.price;
  const currentSku = activeVariant?.sku || toy.sku;
  const currentStock = activeVariant?.stock !== undefined ? Number(activeVariant.stock) : toy.stock;

  const isWished = isInWishlist(toy.id);
  const images = toy.images && toy.images.length > 0 
    ? toy.images 
    : [toy.image || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'];

  const discountPercent = toy.originalPrice && toy.originalPrice > currentPrice
    ? Math.round(((toy.originalPrice - currentPrice) / toy.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (currentStock <= 0) return;
    const itemToAdd = {
      ...toy,
      price: currentPrice,
      sku: currentSku,
      variantName: activeVariant?.name
    };
    addToCart(itemToAdd, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    if (currentStock <= 0) return;
    const itemToAdd = {
      ...toy,
      price: currentPrice,
      sku: currentSku,
      variantName: activeVariant?.name
    };
    addToCart(itemToAdd, quantity);
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleAddReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setIsSubmittingReview(true);

    try {
      await api.products.addReview(toy.id, {
        user: reviewName.trim() || user?.name || 'Verified Parent',
        rating: reviewRating,
        comment: reviewComment.trim()
      });

      // Reload fresh product with updated reviews
      const updated = await api.products.getById(toy.id);
      setToy(updated);
      setShowReviewModal(false);
      setReviewComment('');
    } catch (err) {
      alert('Failed to post review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="product-detail-root animate-fade-in">
      {/* Breadcrumbs Navigation */}
      <nav className="detail-breadcrumb-bar" aria-label="Breadcrumb">
        <div className="container breadcrumb-container">
          <Link to="/shop" className="breadcrumb-back">
            <ArrowLeft size={16} /> Back
          </Link>
          <span className="breadcrumb-divider">/</span>
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-divider">/</span>
          <Link to="/shop" className="breadcrumb-link">Shop</Link>
          <span className="breadcrumb-divider">/</span>
          <Link to={`/shop?category=${encodeURIComponent(toy.category)}`} className="breadcrumb-link">
            {toy.category.replace(/^Toys & Games > /, '')}
          </Link>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current" aria-current="page">{toy.name}</span>
        </div>
      </nav>

      <div className="container detail-main-container">
        {/* Left Column: Image Gallery with Interactive Zoom & Lightbox */}
        <div className="detail-gallery-col">
          <div 
            className="main-image-display"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsLightboxOpen(true)}
            title="Hover to zoom, click to open full-screen lightbox"
          >
            <img 
              src={images[activeImageIndex]} 
              alt={`${toy.name} - ${toy.brand || 'ToyVerse India'} - View ${activeImageIndex + 1}`} 
              className={`gallery-active-img ${isZoomed ? 'zoomed' : ''}`}
              style={isZoomed ? {
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transform: 'scale(2.2)'
              } : {}}
              decoding="async"
              fetchpriority="high"
              width="600"
              height="600"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80';
              }}
            />
            {discountPercent > 0 && (
              <span className="pdp-badge-discount">-{discountPercent}% OFF</span>
            )}
            
            <div className="pdp-zoom-indicator">
              <ZoomIn size={14} />
              <span>Hover to Zoom • Click to Expand</span>
            </div>

            <button 
              type="button"
              className={`pdp-wishlist-toggle ${isWished ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(toy.id);
              }}
              title={isWished ? "Remove from wishlist" : "Add to wishlist"}
              aria-label={isWished ? `Remove ${toy.name} from wishlist` : `Add ${toy.name} to wishlist`}
            >
              <Heart size={20} fill={isWished ? "#FF5E7E" : "none"} color={isWished ? "#FF5E7E" : "#64748B"} />
            </button>
          </div>

          {images.length > 1 && (
            <div className="thumbnail-row">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`thumbnail-btn ${activeImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                  title={`View image ${idx + 1}`}
                  aria-label={`View image ${idx + 1} of ${toy.name}`}
                >
                  <img 
                    src={img} 
                    alt={`${toy.name} view ${idx + 1}`} 
                    loading="lazy" 
                    decoding="async"
                    width="80"
                    height="80"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Toy Info & Actions */}
        <div className="detail-info-col">
          <div className="pdp-header-tags">
            <span className="badge badge-secondary">{toy.category}</span>
            <span className="badge badge-amber">Ages: {toy.ageGroup}</span>
            {toy.brand && <span className="pdp-brand-text">Brand: <strong>{toy.brand}</strong></span>}
            <span className="badge badge-teal">BIS Certified 🇮🇳</span>
          </div>

          <h1 className="pdp-title">{toy.name}</h1>
          <p className="pdp-sku">SKU: <code>{currentSku}</code></p>

          {/* Rating & Reviews Bar */}
          <div className="pdp-rating-group">
            <div className="stars-flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  fill={i < Math.floor(toy.rating) ? "#FFB703" : "none"}
                  color="#FFB703"
                />
              ))}
            </div>
            <span className="rating-score-num">{toy.rating} / 5.0</span>
            <span className="rating-reviews-link">({toy.reviewsCount || 0} reviews from Indian parents)</span>
          </div>

          {/* Pricing Box (INR ₹) */}
          <div className="pdp-pricing-box">
            <span className="pdp-current-price">{formatINR(currentPrice)}</span>
            {toy.originalPrice && toy.originalPrice > currentPrice && (
              <span className="pdp-original-price">{formatINR(toy.originalPrice)}</span>
            )}
            {discountPercent > 0 && (
              <span className="pdp-savings-tag">You save {formatINR(toy.originalPrice - currentPrice)}!</span>
            )}
          </div>

          {/* Variants Selector */}
          {hasVariants && (
            <div className="pdp-variants-wrap" style={{ margin: '1rem 0' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                Select Edition / Variant: <strong>{activeVariant?.name}</strong>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {toy.variants.map((v, i) => (
                  <button
                    key={v.id || i}
                    type="button"
                    onClick={() => { setSelectedVariantIndex(i); setQuantity(1); }}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: selectedVariantIndex === i ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      background: selectedVariantIndex === i ? 'var(--color-primary-bg)' : '#FFFFFF',
                      color: selectedVariantIndex === i ? 'var(--color-primary)' : 'var(--color-text-main)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start'
                    }}
                  >
                    <span>{v.name}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatINR(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Urgency */}
          <div className="pdp-stock-status">
            {currentStock <= 0 ? (
              <span className="stock-pill stock-out">Sold Out across India</span>
            ) : currentStock <= 5 ? (
              <span className="stock-pill stock-low">⚠️ Only {currentStock} left in stock - order soon!</span>
            ) : (
              <span className="stock-pill stock-available">
                <Check size={14} /> In Stock ({currentStock} units available in Indian warehouses)
              </span>
            )}
          </div>

          {/* Product Description (Retaining Safe HTML Formatting) */}
          {toy.description && /<[a-z][\s\S]*>/i.test(toy.description) ? (
            <div 
              className="pdp-description pdp-html-description"
              dangerouslySetInnerHTML={{ __html: toy.description }}
            />
          ) : (
            <p className="pdp-description">{toy.description}</p>
          )}

          {/* Quantity Selector & Action Buttons */}
          <div className="pdp-actions-container">
            <div className="quantity-control-group">
              <span className="qty-label">Quantity:</span>
              <div className="qty-stepper">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || currentStock <= 0}
                  className="qty-btn"
                >
                  <Minus size={14} />
                </button>
                <span className="qty-number">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  disabled={quantity >= currentStock || currentStock <= 0}
                  className="qty-btn"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="pdp-buttons-row">
              <button 
                className={`btn btn-primary btn-lg pdp-cart-btn ${addedToast ? 'added-success' : ''}`}
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
              >
                {addedToast ? (
                  <>
                    <Check size={20} />
                    <span>Added to Basket!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={20} />
                    <span>Add to Basket</span>
                  </>
                )}
              </button>

              <button 
                className="btn btn-accent btn-lg pdp-buy-btn"
                onClick={handleBuyNow}
                disabled={currentStock <= 0}
              >
                <Zap size={18} />
                <span>Buy with 1-Click</span>
              </button>
            </div>

            {/* Social Sharing & Engagement Bar */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs font-mono text-muted">
              <Share2 size={14} className="text-primary" />
              <span>Share this Toy:</span>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out "${toy.name}" on ToyVerse India: ${window.location.href}`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-xs px-2 py-0.5"
                title="Share via WhatsApp"
              >
                WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Found this amazing toy on ToyVerse India: ${toy.name}`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-xs px-2 py-0.5"
                title="Share on Twitter / X"
              >
                Twitter / X
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Product link copied to clipboard!');
                }}
                className="btn btn-outline btn-xs px-2 py-0.5"
                title="Copy Product Link"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Structured Data: Product JSON-LD for Search Engines */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": toy.name,
              "image": toy.images || [toy.image],
              "description": toy.description,
              "sku": toy.sku || toy.id,
              "brand": {
                "@type": "Brand",
                "name": toy.brand || "ToyVerse India"
              },
              "offers": {
                "@type": "Offer",
                "url": window.location.href,
                "priceCurrency": "INR",
                "price": toy.price,
                "itemCondition": "https://schema.org/NewCondition",
                "availability": toy.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                  "@type": "Organization",
                  "name": "ToyVerse Retail India Private Limited"
                }
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": toy.rating || 4.8,
                "reviewCount": toy.reviewsCount || 12
              }
            })
          }} />

          {/* Value Props & Trust Badges */}
          <div className="pdp-trust-badges">
            <div className="trust-item">
              <Truck size={20} className="trust-icon text-secondary" />
              <div>
                <strong>Free Delivery Across India</strong>
                <p>On orders above {formatINR(FREE_SHIPPING_THRESHOLD_INR)}</p>
              </div>
            </div>
            <div className="trust-item">
              <ShieldCheck size={20} className="trust-icon text-teal" />
              <div>
                <strong>BIS Certified Child-Safe</strong>
                <p>Meets IS 9873 Indian Toy Standards</p>
              </div>
            </div>
            <div className="trust-item">
              <RotateCcw size={20} className="trust-icon text-amber" />
              <div>
                <strong>30-Day Hassle-Free Returns</strong>
                <p>Free doorstep pickup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights & Specs Details */}
      <div className="container pdp-details-section">
        <div className="pdp-specs-grid">
          {/* Key Features */}
          <div className="specs-card card">
            <h3 className="specs-card-title">✨ Key Highlights & Features</h3>
            <ul className="specs-feature-list">
              {(toy.features || [
                "Engaging hands-on play that stimulates cognitive learning",
                "Built with durable, kid-safe, shockproof ABS polymer",
                "Encourages collaborative and creative storytelling"
              ]).map((feat, i) => (
                <li key={i}>
                  <Check size={16} className="text-teal" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Specs */}
          <div className="specs-card card">
            <h3 className="specs-card-title">🔍 Specifications & Compliance</h3>
            <div className="specs-table">
              <div className="spec-row">
                <span className="spec-name">Recommended Age</span>
                <span className="spec-val">{toy.ageGroup}</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Category</span>
                <span className="spec-val">{toy.category}</span>
              </div>
              {toy.brand && (
                <div className="spec-row">
                  <span className="spec-name">Brand</span>
                  <span className="spec-val">{toy.brand}</span>
                </div>
              )}
              {toy.specs && Object.keys(toy.specs).length > 0 ? (
                Object.entries(toy.specs).map(([key, val]) => (
                  <div className="spec-row" key={key}>
                    <span className="spec-name">{key}</span>
                    <span className="spec-val">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="spec-row">
                    <span className="spec-name">Dimensions</span>
                    <span className="spec-val">25 x 20 x 10 cm</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Safety Standards</span>
                    <span className="spec-val">BIS IS-9873 (Indian Standards Institute)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Form */}
      <div className="container pdp-reviews-section">
        <div className="reviews-header-row">
          <div>
            <h2 className="section-heading">Verified Customer Reviews</h2>
            <p className="reviews-sub">
              Based on {toy.reviews?.length || 0} verified customer experiences
            </p>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowReviewModal(true)}
          >
            <MessageSquarePlus size={16} />
            <span>Write a Review</span>
          </button>
        </div>

        {/* Reviews List */}
        <div className="reviews-list-grid">
          {(!toy.reviews || toy.reviews.length === 0) ? (
            <p className="no-reviews-text">Be the first parent to share an experience with this toy!</p>
          ) : (
            toy.reviews.map(r => (
              <div key={r.id} className="review-item-card card">
                <div className="review-item-header">
                  <div>
                    <h4 className="reviewer-name">{r.user}</h4>
                    <span className="review-date">{r.date ? r.date.split('T')[0] : 'Recent'}</span>
                  </div>
                  <div className="reviewer-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < r.rating ? "#FFB703" : "none"}
                        color="#FFB703"
                      />
                    ))}
                  </div>
                </div>
                <p className="review-comment-text">"{r.comment}"</p>
                {r.verified && (
                  <span className="verified-badge">
                    <Check size={12} /> Verified Buyer in India
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <div className="modal-card card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Write a Review for {toy.name}</h3>
            <form onSubmit={handleAddReviewSubmit}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyadarshini K. (Mumbai)"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Star Rating</label>
                <div className="modal-rating-picker">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className="star-picker-btn"
                      onClick={() => setReviewRating(star)}
                    >
                      <Star
                        size={24}
                        fill={star <= reviewRating ? "#FFB703" : "none"}
                        color="#FFB703"
                      />
                    </button>
                  ))}
                  <span className="star-picker-score">{reviewRating} Stars</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Your Review</label>
                <textarea
                  rows="4"
                  required
                  placeholder="What did your child love most about this toy?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Resolution Zoom Lightbox Modal */}
      {isLightboxOpen && (
        <div className="lightbox-overlay animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setIsLightboxOpen(false)} aria-label="Close Lightbox">
              <CloseIcon size={24} />
            </button>

            {images.length > 1 && (
              <button 
                className="lightbox-nav-btn prev"
                onClick={() => setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                aria-label="Previous Image"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div className="lightbox-img-wrapper">
              <img 
                src={images[activeImageIndex]} 
                alt={`${toy.name} - High Resolution View ${activeImageIndex + 1}`} 
                className="lightbox-img"
              />
              <div className="lightbox-counter">
                {activeImageIndex + 1} of {images.length}
              </div>
            </div>

            {images.length > 1 && (
              <button 
                className="lightbox-nav-btn next"
                onClick={() => setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                aria-label="Next Image"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Related Products & Similar Toys */}
      {relatedToys.length > 0 && (
        <div className="container pdp-related-section" style={{ marginTop: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>Similar Toys in {toy.category}</h2>
            <Link to={`/shop?category=${encodeURIComponent(toy.category)}`} className="text-muted text-xs font-mono" style={{ textDecoration: 'underline' }}>
              Explore {toy.category} &rarr;
            </Link>
          </div>
          <div className="products-grid">
            {relatedToys.map(item => (
              <ProductCard key={item.id} toy={item} />
            ))}
          </div>
        </div>
      )}

      {/* 2. Products from the Same Brand */}
      {brandToys.length > 0 && (
        <div className="container pdp-related-section" style={{ marginTop: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>More from {toy.brand}</h2>
            <Link to={`/shop?brand=${encodeURIComponent(toy.brand)}`} className="text-muted text-xs font-mono" style={{ textDecoration: 'underline' }}>
              View All {toy.brand} Instruments &rarr;
            </Link>
          </div>
          <div className="products-grid">
            {brandToys.map(item => (
              <ProductCard key={item.id} toy={item} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <div className="container pdp-related-section" style={{ marginTop: '3.5rem', paddingBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>Recently Viewed Instruments</h2>
            <span className="text-muted text-xs font-mono">YOUR RECENT EXPLORATIONS</span>
          </div>
          <div className="products-grid">
            {recentlyViewed.map(item => (
              <ProductCard key={item.id} toy={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
