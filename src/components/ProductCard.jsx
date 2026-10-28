import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatINR } from '../services/api';
import './ProductCard.css';

export default function ProductCard({ toy }) {
  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const [addedAnimation, setAddedAnimation] = useState(false);
  const isWished = isInWishlist(toy.id);

  const discountPercent = toy.originalPrice && toy.originalPrice > toy.price
    ? Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100)
    : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (toy.stock <= 0) return;
    
    addToCart(toy, 1);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(toy.id);
  };

  const mainImage = (toy.images && toy.images.length > 0) ? toy.images[0] : (toy.image || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80');

  return (
    <div className="product-card card">
      <Link to={`/product/${toy.id}`} className="product-card-link">
        {/* Card Header Badges */}
        <div className="product-badges">
          {discountPercent > 0 && (
            <span className="badge-discount">-{discountPercent}%</span>
          )}
          {toy.isNewArrival && (
            <span className="badge-new">NEW</span>
          )}
          {toy.stock <= 0 ? (
            <span className="badge-out-of-stock">Sold Out</span>
          ) : toy.stock <= 5 ? (
            <span className="badge-low-stock">Only {toy.stock} left!</span>
          ) : null}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`wishlist-btn ${isWished ? 'active' : ''}`}
          onClick={handleWishlistClick}
          title={isWished ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWished ? `Remove ${toy.name} from wishlist` : `Add ${toy.name} to wishlist`}
        >
          <Heart size={18} fill={isWished ? "#FF5E7E" : "none"} color={isWished ? "#FF5E7E" : "#64748B"} />
        </button>

        {/* Product Image */}
        <div className="product-image-container">
          <img
            src={mainImage}
            alt={`${toy.name} - ${toy.brand || 'ToyVerse India'} ${toy.category || 'Toys & Games'}`}
            className="product-image"
            loading="lazy"
            decoding="async"
            width="320"
            height="320"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80';
            }}
          />
        </div>

        {/* Product Body */}
        <div className="product-content">
          <div className="product-meta-row">
            <span className="product-category">{toy.category}</span>
            <span className="product-age-pill">{toy.ageGroup}</span>
          </div>

          <h3 className="product-title" title={toy.name}>
            {toy.name}
          </h3>

          {/* Rating */}
          <div className="product-rating-row">
            <div className="stars-wrap">
              <Star size={14} className="star-filled" fill="#FFB703" color="#FFB703" />
              <span className="rating-score">{toy.rating}</span>
            </div>
            <span className="rating-count">({toy.reviewsCount || 0})</span>
          </div>

          {/* Price & Action */}
          <div className="product-footer-row">
            <div className="price-group">
              <span className="current-price">{formatINR(toy.price)}</span>
              {toy.originalPrice && toy.originalPrice > toy.price && (
                <span className="original-price">{formatINR(toy.originalPrice)}</span>
              )}
            </div>

            <button
              type="button"
              className={`add-to-cart-btn ${addedAnimation ? 'btn-added' : ''} ${toy.stock <= 0 ? 'btn-disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={toy.stock <= 0}
              title={toy.stock <= 0 ? "Out of Stock" : "Add to Cart"}
              aria-label={toy.stock <= 0 ? `${toy.name} is out of stock` : `Add ${toy.name} to cart`}
            >
              {addedAnimation ? (
                <>
                  <Check size={16} />
                  <span>Added</span>
                </>
              ) : toy.stock <= 0 ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
