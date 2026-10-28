import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ArrowLeft, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Truck,
  Heart
} from 'lucide-react';
import { useCart, FREE_SHIPPING_THRESHOLD_INR } from '../context/CartContext';
import { formatINR } from '../services/api';
import './CartPage.css';

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartSubtotal,
    shippingFee,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    cartTotal,
    toggleWishlist,
    isInWishlist
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [promoFeedback, setPromoFeedback] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const navigate = useNavigate();

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setIsApplying(true);
    const res = await applyCoupon(promoCode.trim());
    setIsApplying(false);
    if (res.success) {
      setPromoFeedback({ type: 'success', text: res.message });
      setPromoCode('');
    } else {
      setPromoFeedback({ type: 'error', text: res.message });
    }
  };

  const handleMoveToWishlist = (item) => {
    if (!isInWishlist(item.id)) {
      toggleWishlist(item.id);
    }
    removeFromCart(item.id);
  };

  if (cart.length === 0) {
    return (
      <div className="container cart-empty-page animate-fade-in">
        <div className="cart-empty-card card">
          <span className="empty-toy-emoji">🧸</span>
          <h2 className="empty-cart-title">Your Toy Basket is Empty</h2>
          <p className="empty-cart-sub">
            Looks like you haven't added any magical toys to your basket yet. Explore our curated catalog of STEM robotics, plushies, and space building sets!
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg">
            Start Shopping Toys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-root animate-fade-in">
      <div className="container">
        <div className="cart-header-row">
          <div>
            <h1 className="cart-page-title">Your Toy Basket</h1>
            <p className="cart-page-sub">Review your items ({cartCount}) before proceeding to checkout</p>
          </div>
          <button className="clear-cart-link" onClick={clearCart}>
            <Trash2 size={16} /> Empty Basket
          </button>
        </div>

        {/* Abandoned Cart Recovery & Urgency Incentive Banner */}
        <div className="card p-3 mb-4 bg-muted border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="badge badge-teal">Basket Reserved</span>
            <span>Items held in warehouse queue for 30 minutes. Apply code <strong>DIWALI20</strong> or <strong>FIRST10</strong> at checkout.</span>
          </div>
          <span className="text-muted">BIS Safe Certified Dispatches 🇮🇳</span>
        </div>

        <div className="cart-layout-grid">
          {/* Items List */}
          <div className="cart-items-column">
            {cart.map(item => {
              const itemKey = item.key || item.sku || item.id;
              return (
                <div key={itemKey} className="cart-item-card card">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="cart-page-thumb" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="cart-page-info">
                    <span className="cart-page-cat">{item.category}</span>
                    <Link to={`/product/${item.id}`} className="cart-page-name">
                      {item.name}
                    </Link>
                    {item.variantName && (
                      <span className="font-mono text-xs" style={{ background: '#F4F4F5', padding: '0.15rem 0.45rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', width: 'fit-content', margin: '0.2rem 0' }}>
                        Variant: <strong>{item.variantName}</strong>
                      </span>
                    )}
                    <span className="cart-page-unit-price">{formatINR(item.price)} each</span>

                    <div className="cart-page-actions-row">
                      {/* Stepper */}
                      <div className="cart-page-stepper">
                        <button 
                          className="stepper-action-btn"
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          title="Reduce"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="stepper-val">{item.quantity}</span>
                        <button 
                          className="stepper-action-btn"
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          title="Increase"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="cart-page-total-group">
                        <span className="cart-page-total-price">
                          {formatINR(item.price * item.quantity)}
                        </span>
                        <button 
                          className="cart-page-wishlist-btn"
                          onClick={() => handleMoveToWishlist(item)}
                          title="Save to Wishlist & remove from cart"
                        >
                          <Heart size={14} className={isInWishlist(item.id) ? "heart-active" : ""} />
                          <span>Move to Wishlist</span>
                        </button>
                        <button 
                          className="cart-page-delete-btn"
                          onClick={() => removeFromCart(itemKey)}
                          title="Remove product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="cart-continue-row">
              <Link to="/shop" className="btn btn-outline">
                <ArrowLeft size={16} /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="cart-summary-column">
            <div className="cart-summary-card card">
              <h3 className="summary-heading">Order Summary</h3>

              {/* Promo Code Box */}
              <div className="summary-promo-section">
                {appliedCoupon ? (
                  <div className="applied-coupon-row">
                    <div className="applied-info">
                      <Tag size={16} className="text-primary" />
                      <span>Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
                    </div>
                    <button className="btn-remove-coupon" onClick={removeCoupon}>Remove</button>
                  </div>
                ) : (
                  <form className="summary-promo-form" onSubmit={handleApplyPromo}>
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. DIWALI20)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="form-input summary-promo-input"
                    />
                    <button type="submit" className="btn btn-secondary btn-sm" disabled={isApplying}>
                      {isApplying ? '...' : 'Apply'}
                    </button>
                  </form>
                )}

                {promoFeedback && (
                  <div className={`promo-feedback-msg ${promoFeedback.type}`}>
                    {promoFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{promoFeedback.text}</span>
                  </div>
                )}

                <div className="coupon-suggestions">
                  <span className="coupon-suggestion-label">Available festive coupons:</span>
                  <div className="coupon-tags-wrap">
                    <button type="button" className="code-pill" onClick={() => applyCoupon('DIWALI20')}>DIWALI20 (20% off)</button>
                    <button type="button" className="code-pill" onClick={() => applyCoupon('FIRST10')}>FIRST10 (10% off)</button>
                    <button type="button" className="code-pill" onClick={() => applyCoupon('FREESHIP')}>FREESHIP (Free Delivery)</button>
                  </div>
                </div>
              </div>

              {/* Totals Breakdown (INR) */}
              <div className="summary-rows-wrap">
                <div className="summary-calc-row">
                  <span>Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="summary-calc-row row-discount">
                    <span>Discount Savings</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="summary-calc-row">
                  <div className="shipping-label-flex">
                    <span>Express Delivery</span>
                    {cartSubtotal >= FREE_SHIPPING_THRESHOLD_INR && (
                      <span className="badge badge-teal">Free Over {formatINR(FREE_SHIPPING_THRESHOLD_INR)}</span>
                    )}
                  </div>
                  <span>
                    {shippingFee === 0 ? <strong className="text-teal">FREE</strong> : formatINR(shippingFee)}
                  </span>
                </div>

                <div className="summary-calc-row summary-grand-total">
                  <span>Total Payable</span>
                  <span className="total-digits">{formatINR(cartTotal)}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-lg btn-block checkout-now-btn"
                onClick={() => navigate('/checkout')}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>

              <div className="summary-guarantees">
                <div className="guarantee-row">
                  <Truck size={16} className="text-primary" />
                  <span>Free doorstep delivery on orders above {formatINR(FREE_SHIPPING_THRESHOLD_INR)}</span>
                </div>
                <div className="guarantee-row">
                  <ShieldCheck size={16} className="text-secondary" />
                  <span>BIS Certified child-safe & 100% genuine toys</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
