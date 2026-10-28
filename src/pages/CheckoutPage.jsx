import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  Lock, 
  Gift, 
  QrCode, 
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../services/api';
import './CheckoutPage.css';

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi NCR', 'Tamil Nadu', 'Telangana',
  'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Rajasthan',
  'Haryana', 'Punjab', 'Madhya Pradesh', 'Andhra Pradesh', 'Bihar',
  'Odisha', 'Assam', 'Goa', 'Uttarakhand', 'Jharkhand'
];

export default function CheckoutPage() {
  const { cart, cartSubtotal, discountAmount, appliedCoupon, shippingFee, cartTotal, clearCart } = useCart();
  const { user, addresses } = useAuth();
  const navigate = useNavigate();

  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0] || {};

  // Form states initialized clean without mock data
  const [formData, setFormData] = useState({
    fullName: defaultAddr.fullName || user?.name || '',
    email: defaultAddr.email || user?.email || '',
    phone: defaultAddr.phone || user?.phone || '',
    street: defaultAddr.street || '',
    city: defaultAddr.city || '',
    state: defaultAddr.state || 'Karnataka',
    pincode: defaultAddr.pincode || '',
    country: 'India'
  });

  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const paymentMethod = 'upi'; // Exclusively UPI payment

  // Idempotency token to prevent duplicate charges or orders
  const [idempotencyKey] = useState(() => `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Autonomous UPI Gateway State (₹0 Stack)
  const [upiSession, setUpiSession] = useState(null);
  const [isGeneratingUpi, setIsGeneratingUpi] = useState(false);
  const [upiPaymentStatus, setUpiPaymentStatus] = useState('idle'); // idle | pending | paid | expired
  const [upiTimeRemaining, setUpiTimeRemaining] = useState(1800);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Extra delivery & totals
  const extraDeliveryCost = deliveryMethod === 'express' ? 149 : 0;
  const finalTotal = cartTotal + extraDeliveryCost;
  const gstInclusiveAmount = Math.round((cartSubtotal * 0.18) / 1.18);

  // Auto-generate or refresh UPI session
  const generateUpiSession = async () => {
    if (cart.length === 0) return;
    setIsGeneratingUpi(true);
    setPaymentError('');
    try {
      const session = await api.upi.createOrder({
        items: cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price, name: i.name })),
        name: formData.fullName || user?.name || 'Customer',
        phone: formData.phone || user?.phone || '',
        amountINR: finalTotal
      });
      setUpiSession(session);
      setUpiPaymentStatus('pending');
      setUpiTimeRemaining(1800);
    } catch (err) {
      setPaymentError(`Could not generate UPI QR session: ${err.message}`);
    } finally {
      setIsGeneratingUpi(false);
    }
  };

  useEffect(() => {
    if (!upiSession && cart.length > 0) {
      generateUpiSession();
    }
  }, [cart.length]);

  // Countdown timer for UPI session
  useEffect(() => {
    if (!upiSession || upiPaymentStatus !== 'pending') return;
    const timer = setInterval(() => {
      setUpiTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setUpiPaymentStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [upiSession, upiPaymentStatus]);

  // Real-time polling for payment confirmation (every 2.5s)
  useEffect(() => {
    if (!upiSession || upiPaymentStatus !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.upi.getOrderStatus(upiSession.ref);
        if (statusRes && statusRes.status === 'paid') {
          clearInterval(interval);
          setUpiPaymentStatus('paid');

          try {
            confetti({
              particleCount: 160,
              spread: 85,
              origin: { y: 0.55 }
            });
          } catch (e) {}

          const orderPayload = {
            customer: {
              userId: user?.id,
              name: formData.fullName,
              email: formData.email,
              phone: formData.phone
            },
            shippingAddress: {
              address: formData.street,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              country: 'India'
            },
            items: cart.map(i => ({
              id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              image: i.image
            })),
            subtotal: cartSubtotal,
            discount: discountAmount,
            shippingFee: shippingFee + extraDeliveryCost,
            total: finalTotal,
            paymentMethod: `UPI Auto-Reconciled (${upiSession.ref})`,
            idempotencyKey,
            paymentGatewayRef: statusRes.payment_event?.bank_txn_id || upiSession.ref,
            isGift,
            giftNote
          };

          const newOrder = await api.orders.create(orderPayload);
          clearCart();
          setTimeout(() => {
            navigate(`/order-success/${newOrder.id || upiSession.ref}`);
          }, 1800);
        } else if (statusRes && statusRes.status === 'expired') {
          setUpiPaymentStatus('expired');
          clearInterval(interval);
        }
      } catch (err) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [upiSession, upiPaymentStatus, cart, formData, finalTotal, idempotencyKey, isGift, giftNote, user]);

  const copyRefToClipboard = () => {
    if (!upiSession?.ref) return;
    navigator.clipboard.writeText(upiSession.ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const copyVpaToClipboard = () => {
    const vpa = upiSession?.vpa || '9741676651-3@ybl';
    navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2500);
  };

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    setIsValidatingCart(true);
    api.orders.validate(cart)
      .then(res => {
        if (!res.valid) {
          setValidationIssues(res.issues || []);
        } else {
          setValidationIssues([]);
        }
      })
      .catch(() => {})
      .finally(() => setIsValidatingCart(false));
  }, [cart, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    setPaymentError('');

    // Form validation: ensure required delivery address fields are filled
    const name = (formData.fullName || '').trim();
    const email = (formData.email || '').trim();
    const phone = (formData.phone || '').trim();
    const street = (formData.street || '').trim();
    const city = (formData.city || '').trim();
    const state = (formData.state || '').trim();
    const pincode = (formData.pincode || '').trim();

    if (!name || !email || !phone || !street || !city || !state || !pincode) {
      setPaymentError('Please fill in all required delivery address fields before placing your order.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 0: Validate stock availability and pricing before submission
      const valRes = await api.orders.validate(cart);
      if (!valRes.valid) {
        setValidationIssues(valRes.issues || []);
        setIsSubmitting(false);
        setPaymentError('Some items in your basket have stock changes. Please review your cart.');
        return;
      }
    } catch (err) {
      console.warn('Pre-check validation warning:', err);
    }

    const currentIdempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const paymentMethodLabel = `UPI (${upiSession?.ref ? `Ref: ${upiSession.ref}` : 'Instant QR'})`;

    const orderPayload = {
      customer: {
        userId: user?.id,
        name,
        email,
        phone
      },
      shippingAddress: {
        address: street,
        city,
        state,
        pincode,
        country: 'India'
      },
      items: cart.map(i => ({
        id: i.id,
        productId: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image
      })),
      subtotal: cartSubtotal,
      discount: discountAmount,
      shippingFee: shippingFee + extraDeliveryCost,
      total: finalTotal,
      paymentMethod: paymentMethodLabel,
      idempotencyKey: currentIdempotencyKey,
      paymentGatewayRef: upiSession?.ref || `TXN-UPI-${Date.now().toString(36).toUpperCase()}`,
      isGift,
      giftNote
    };

    try {
      const newOrder = await api.orders.create(orderPayload);

      // Trigger festive celebration confetti
      try {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.55 }
        });
      } catch (err) {}

      clearCart();
      const targetId = newOrder?.id || (newOrder?.order && newOrder.order.id) || (upiSession?.ref);
      navigate(`/order-success/${targetId}`);
    } catch (err) {
      setPaymentError(`Order processing error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page-root animate-fade-in">
      <div className="container">
        <div className="checkout-nav-bar">
          <Link to="/cart" className="checkout-back-link">
            <ArrowLeft size={16} /> Return to Basket
          </Link>
          <div className="checkout-secure-badge">
            <Lock size={14} className="text-teal" />
            <span>256-bit Encrypted UPI Payment Gateway</span>
          </div>
        </div>

        <h1 className="checkout-title">Complete Your Order 🇮🇳</h1>

        {/* Real-time Inventory & Pricing Alerts */}
        {validationIssues.length > 0 && (
          <div className="checkout-validation-alert card mb-4">
            <div className="flex items-center gap-2 text-danger font-semibold mb-2">
              <AlertCircle size={18} />
              <span>Catalog Stock & Pricing Update Alert:</span>
            </div>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {validationIssues.map((issue, idx) => (
                <li key={idx} className="text-danger">
                  {issue.message}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link to="/cart" className="btn btn-outline btn-sm">
                Return to Basket to Update Items
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="checkout-layout">
          {/* Left Form: Steps */}
          <div className="checkout-form-steps">
            {/* Step 1: Shipping Address (India) */}
            <div className="checkout-step-card card">
              <div className="step-header">
                <div className="step-number-badge">1</div>
                <div>
                  <h3 className="step-title">Delivery Address in India</h3>
                  <p className="step-sub">We deliver across 19,000+ PIN codes with live updates</p>
                </div>
                {defaultAddr && defaultAddr.street && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm quick-fill-address-btn"
                    onClick={() => setFormData({
                      fullName: defaultAddr.fullName || user?.name || '',
                      email: defaultAddr.email || user?.email || '',
                      phone: defaultAddr.phone || user?.phone || '',
                      street: defaultAddr.street || '',
                      city: defaultAddr.city || '',
                      state: defaultAddr.state || 'Karnataka',
                      pincode: defaultAddr.pincode || '',
                      country: 'India'
                    })}
                    title="Fill from saved address"
                  >
                    📍 Use Saved Address
                  </button>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Recipient's Full Name *</label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter recipient's full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address (for Invoice & Updates) *</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">House / Flat / Street / Area *</label>
                  <input
                    type="text"
                    required
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Flat, House no., Building, Street, Area"
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">6-Digit PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="6-digit PIN code"
                  />
                </div>
              </div>

              {/* Gift Option */}
              <div className="gift-toggle-row">
                <label className="checkbox-custom-label">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                  />
                  <span className="checkbox-text">
                    🎁 This is a gift! Include free festive packaging & custom greeting message
                  </span>
                </label>

                {isGift && (
                  <div className="gift-message-box animate-fade-in">
                    <label className="form-label">Greeting Message (Printed on festive card):</label>
                    <textarea
                      rows="2"
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="Add a personalized greeting for the recipient..."
                      className="form-textarea"
                    ></textarea>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Delivery Method */}
            <div className="checkout-step-card card">
              <div className="step-header">
                <div className="step-number-badge">2</div>
                <div>
                  <h3 className="step-title">Delivery Speed & Courier</h3>
                  <p className="step-sub">Dispatched via Blue Dart, Delhivery, or DTDC</p>
                </div>
              </div>

              <div className="delivery-options-list">
                <label className={`delivery-option-item ${deliveryMethod === 'standard' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="standard"
                    checked={deliveryMethod === 'standard'}
                    onChange={() => setDeliveryMethod('standard')}
                  />
                  <div className="delivery-option-info">
                    <div className="delivery-top-row">
                      <strong>Standard Safe Delivery (3-5 Business Days across India)</strong>
                      <span className="delivery-price-tag">
                        {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                      </span>
                    </div>
                    <p className="delivery-desc">Tracked dispatch with doorstep PIN delivery</p>
                  </div>
                </label>

                <label className={`delivery-option-item ${deliveryMethod === 'express' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="express"
                    checked={deliveryMethod === 'express'}
                    onChange={() => setDeliveryMethod('express')}
                  />
                  <div className="delivery-option-info">
                    <div className="delivery-top-row">
                      <strong>Priority Express (1-2 Days in Metro Cities) ⚡</strong>
                      <span className="delivery-price-tag">+{formatINR(149)}</span>
                    </div>
                    <p className="delivery-desc">Guaranteed priority air cargo dispatch</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Payment Options (UPI Only) */}
            <div className="checkout-step-card card">
              <div className="step-header">
                <div className="step-number-badge">3</div>
                <div>
                  <h3 className="step-title">Payment via UPI</h3>
                  <p className="step-sub">Instant zero-fee payment with automatic QR verification</p>
                </div>
              </div>

              {/* UPI View: Real Autonomous ₹0 Stack */}
              <div className="upi-payment-form animate-fade-in">
                <div className="upi-app-badges">
                  <span className="upi-pill">Google Pay</span>
                  <span className="upi-pill">PhonePe</span>
                  <span className="upi-pill">Paytm</span>
                  <span className="upi-pill">BHIM UPI</span>
                  <span className="upi-pill">CRED</span>
                  <span className="upi-zero-tag">₹0 Gateway Fee</span>
                </div>

                {isGeneratingUpi && (
                  <div className="upi-loading-box">
                    <RefreshCw size={24} className="animate-spin text-primary" />
                    <span>Generating secure server-side UPI QR & Base32 Reference...</span>
                  </div>
                )}

                {!isGeneratingUpi && upiSession && (
                  <div className="upi-live-gateway-container">
                    {/* Status Banner */}
                    {upiPaymentStatus === 'paid' ? (
                      <div className="upi-status-badge upi-paid animate-fade-in">
                        <CheckCircle2 size={18} />
                        <strong>Payment Verified! Finalizing your order...</strong>
                      </div>
                    ) : upiPaymentStatus === 'expired' ? (
                      <div className="upi-status-badge upi-expired animate-fade-in">
                        <Clock size={18} />
                        <span>QR Code expired. Click below to generate a fresh QR session.</span>
                        <button type="button" className="btn btn-sm btn-outline ml-auto" onClick={generateUpiSession}>
                          Refresh QR
                        </button>
                      </div>
                    ) : (
                      <div className="upi-status-badge upi-pending animate-pulse">
                        <div className="pulse-dot"></div>
                        <span>Listening for bank confirmation via Android forwarder...</span>
                        <span className="upi-timer-pill">
                          <Clock size={12} />
                          {Math.floor(upiTimeRemaining / 60)}:{(upiTimeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}

                    {/* QR & Reference Card */}
                    <div className="upi-qr-card">
                      <div className="upi-qr-frame">
                        {upiSession.qr_data_url ? (
                          <img 
                            src={upiSession.qr_data_url} 
                            alt={`UPI QR for ${upiSession.ref}`} 
                            className="upi-qr-image" 
                          />
                        ) : (
                          <img 
                            src={`/api/upi/orders/${upiSession.ref}/qr.png`} 
                            alt={`UPI QR for ${upiSession.ref}`} 
                            className="upi-qr-image" 
                          />
                        )}
                        <div className="upi-qr-badge">Scan with Any UPI App</div>
                      </div>

                      <div className="upi-details-pane">
                        <div className="upi-amount-hero">
                          <span className="amount-label">Pay Exact Amount:</span>
                          <span className="amount-val">{formatINR(upiSession.amountPaise / 100)}</span>
                        </div>

                        <div className="upi-vpa-box">
                          <div className="upi-ref-label">
                            <span>Merchant UPI ID (VPA):</span>
                            <span className="text-xs text-teal font-semibold">Verified Merchant</span>
                          </div>
                          <div className="upi-ref-value-row">
                            <code className="upi-vpa-code">{upiSession.vpa || '9741676651-3@ybl'}</code>
                            <button 
                              type="button" 
                              className="btn-copy-ref" 
                              onClick={copyVpaToClipboard}
                              title="Copy Merchant UPI ID"
                            >
                              {copiedVpa ? <CheckCircle2 size={14} className="text-teal" /> : <Copy size={14} />}
                              {copiedVpa ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <div className="upi-ref-box">
                          <div className="upi-ref-label">
                            <span>Reconciliation Reference (UPI Note):</span>
                            <span className="text-xs text-muted font-normal">(Base32 Unguessable)</span>
                          </div>
                          <div className="upi-ref-value-row">
                            <code className="upi-ref-code">{upiSession.ref}</code>
                            <button 
                              type="button" 
                              className="btn-copy-ref" 
                              onClick={copyRefToClipboard}
                              title="Copy Reference"
                            >
                              {copiedRef ? <CheckCircle2 size={14} className="text-teal" /> : <Copy size={14} />}
                              {copiedRef ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p className="upi-ref-hint">
                            ⚠️ Ensure <strong>{upiSession.ref}</strong> is entered in the transaction remarks/notes for instant auto-matching.
                          </p>
                        </div>

                        {/* Mobile Deep Link & Direct Confirmation Buttons */}
                        <div className="upi-actions-row">
                          <a 
                            href={upiSession.upi_uri} 
                            className="btn btn-secondary upi-mobile-btn"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Smartphone size={16} />
                            <span>Pay on Mobile App</span>
                            <ExternalLink size={14} />
                          </a>
                          <button
                            type="button"
                            className="btn btn-primary upi-direct-confirm-btn"
                            onClick={handlePlaceOrder}
                            disabled={isSubmitting}
                          >
                            <CheckCircle2 size={16} />
                            <span>I've Paid • Place Order</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Error Alert */}
              {paymentError && (
                <div className="checkout-validation-alert card mt-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-danger font-semibold mb-1">
                    <AlertCircle size={16} />
                    <span>Transaction Notice</span>
                  </div>
                  <p className="text-xs text-danger">{paymentError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="checkout-summary-column">
            <div className="checkout-summary-card card">
              <h3 className="summary-heading">Order Summary</h3>

              {/* Items List */}
              <div className="checkout-items-list">
                {cart.map(item => (
                  <div key={item.id} className="checkout-item-row">
                    <div className="checkout-thumb-wrap">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="checkout-thumb" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <span className="checkout-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="checkout-item-meta">
                      <h4 className="checkout-item-title">{item.name}</h4>
                      <span className="checkout-item-cat">{item.category}</span>
                    </div>
                    <span className="checkout-item-price">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Totals (INR) */}
              <div className="checkout-totals-wrap">
                <div className="checkout-total-row">
                  <span>Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="checkout-total-row text-success">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="checkout-total-row">
                  <span>Delivery across India</span>
                  <span>
                    {(shippingFee + extraDeliveryCost) === 0 ? 'FREE' : formatINR(shippingFee + extraDeliveryCost)}
                  </span>
                </div>
                <div className="checkout-total-row text-xs text-muted">
                  <span>GST Included (18%)</span>
                  <span className="font-mono">{formatINR(gstInclusiveAmount)}</span>
                </div>
                <div className="checkout-total-row grand-total-row">
                  <span>Total Payable</span>
                  <span className="grand-total-val">{formatINR(finalTotal)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || upiPaymentStatus === 'paid'}
                className={`btn btn-primary btn-lg btn-block place-order-btn ${upiPaymentStatus === 'paid' ? 'btn-success' : ''}`}
              >
                {upiPaymentStatus === 'paid' ? (
                  '✅ Payment Confirmed • Creating Order...'
                ) : upiPaymentStatus === 'pending' ? (
                  `Place Order via UPI • ${formatINR(finalTotal)}`
                ) : (
                  `Generate UPI QR • ${formatINR(finalTotal)}`
                )}
              </button>

              <div className="checkout-trust-points">
                <div className="trust-point">
                  <ShieldCheck size={16} className="text-secondary" />
                  <span>BIS Tested & Certified Indian Toy Safety</span>
                </div>
                <div className="trust-point">
                  <Gift size={16} className="text-primary" />
                  <span>Tamper-proof protective packaging</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
