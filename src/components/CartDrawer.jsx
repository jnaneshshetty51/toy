import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Truck, 
  Tag, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useCart, FREE_SHIPPING_THRESHOLD_INR } from '../context/CartContext';
import { formatINR } from '../services/api';
import './CartDrawer.css';

export default function CartDrawer() {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateQuantity, 
    cartCount, 
    cartSubtotal, 
    shippingFee, 
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    cartTotal
  } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const progressPercent = Math.min(100, Math.round((cartSubtotal / FREE_SHIPPING_THRESHOLD_INR) * 100));
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_INR - cartSubtotal);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setIsApplying(true);
    const res = await applyCoupon(promoInput.trim());
    setIsApplying(false);
    if (res.success) {
      setCouponFeedback({ type: 'success', text: res.message });
      setPromoInput('');
    } else {
      setCouponFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="cart-drawer-overlay animate-fade-in" onClick={() => setIsCartOpen(false)}>
      <div className="cart-drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <ShoppingBag size={22} className="text-primary" />
            <h2 className="drawer-title">Shopping Basket ({cartCount})</h2>
          </div>
          <button 
            className="drawer-close-btn" 
            onClick={() => setIsCartOpen(false)}
            aria-label="Close Cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Bar (INR) */}
        <div className="shipping-progress-box">
          <div className="progress-text-row">
            <Truck size={16} className="truck-icon" />
            {cartSubtotal >= FREE_SHIPPING_THRESHOLD_INR || appliedCoupon?.freeShipping ? (
              <span className="free-shipping-success">
                🎉 Congratulations! You unlocked <strong>FREE Delivery across India!</strong>
              </span>
            ) : (
              <span className="free-shipping-hint">
                Add <strong>{formatINR(amountNeededForFreeShipping)}</strong> more for <strong>FREE Express Delivery</strong>
              </span>
            )}
          </div>
          <div className="progress-bar-track">
            <div 
              className="progress-bar-fill" 
              style={{ width: appliedCoupon?.freeShipping ? '100%' : `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="drawer-items-list">
          {cart.length === 0 ? (
            <div className="empty-cart-view">
              <div className="empty-cart-icon">🧸</div>
              <h3 className="empty-title">Your toy basket is empty!</h3>
              <p className="empty-desc">Discover STEM robotics, puzzles, and board games to fill your basket.</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
              >
                Start Exploring Toys
              </button>
            </div>
          ) : (
            cart.map(item => {
              const itemKey = item.key || item.sku || item.id;
              return (
                <div key={itemKey} className="cart-item-row">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="cart-item-thumb" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="cart-item-details">
                    <span className="cart-item-cat">{item.category}</span>
                    <Link 
                      to={`/product/${item.id}`} 
                      className="cart-item-name" 
                      onClick={() => setIsCartOpen(false)}
                    >
                      {item.name}
                    </Link>
                    {item.variantName && (
                      <span className="font-mono text-xs" style={{ background: '#F4F4F5', padding: '0.1rem 0.35rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', width: 'fit-content', fontSize: '0.68rem' }}>
                        Variant: {item.variantName}
                      </span>
                    )}

                    <div className="cart-item-bottom">
                      {/* Stepper */}
                      <div className="stepper-wrap">
                        <button 
                          className="stepper-btn" 
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          title="Decrease"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="stepper-qty">{item.quantity}</span>
                        <button 
                          className="stepper-btn" 
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          title="Increase"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Price & Delete */}
                      <div className="cart-item-price-group">
                        <span className="cart-item-price">{formatINR(item.price * item.quantity)}</span>
                        <button 
                          className="cart-item-delete" 
                          onClick={() => removeFromCart(itemKey)}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Summary */}
        {cart.length > 0 && (
          <div className="drawer-footer">
            {/* Promo Code Input */}
            <div className="promo-box">
              {appliedCoupon ? (
                <div className="coupon-active-badge">
                  <div className="coupon-left">
                    <Tag size={14} className="text-primary" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
                  </div>
                  <button className="remove-coupon-btn" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <form className="promo-form" onSubmit={handleApplyPromo}>
                  <input
                    type="text"
                    placeholder="Enter voucher (e.g. DIWALI20)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="promo-input"
                  />
                  <button type="submit" className="promo-apply-btn" disabled={isApplying}>
                    {isApplying ? '...' : 'Apply'}
                  </button>
                </form>
              )}
              {couponFeedback && (
                <div className={`coupon-msg ${couponFeedback.type}`}>
                  {couponFeedback.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  <span>{couponFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Calculations Breakdown (INR) */}
            <div className="drawer-summary-breakdown">
              <div className="summary-row">
                <span className="summary-label">Subtotal</span>
                <span className="summary-val">{formatINR(cartSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="summary-row summary-discount">
                  <span className="summary-label">Coupon Savings</span>
                  <span className="summary-val">-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span className="summary-label">Doorstep Delivery</span>
                <span className="summary-val">
                  {shippingFee === 0 ? <span className="free-badge">FREE</span> : formatINR(shippingFee)}
                </span>
              </div>
              <div className="summary-row summary-total-row">
                <span className="total-label">Estimated Total</span>
                <span className="total-amount">{formatINR(cartTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="drawer-action-buttons">
              <button className="btn btn-primary btn-block checkout-btn" onClick={handleCheckoutClick}>
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>
              <Link 
                to="/cart" 
                className="view-cart-link"
                onClick={() => setIsCartOpen(false)}
              >
                View Full Basket
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
