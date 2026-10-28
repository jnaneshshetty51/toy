import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Printer, 
  ShoppingBag,
  Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, formatINR } from '../services/api';
import './OrderSuccessPage.css';

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (e) {}

    api.orders.getById(orderId)
      .then(data => setOrder(data))
      .catch(err => {
        console.error('Error fetching order:', err);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="container order-success-loading" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>Fetching your order receipt...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container order-success-loading" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>Order not found</h2>
        <Link to="/" className="btn btn-primary mt-3">Return Home</Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="order-success-root animate-fade-in">
      <div className="container success-container">
        {/* Celebration Header */}
        <div className="success-header-card card">
          <div className="success-icon-badge animate-float">
            🎉
          </div>
          <span className="badge badge-teal">Payment Confirmed • GST Invoice Generated</span>
          <h1 className="success-heading">Dhanyavaad! Your Order is Placed! 🇮🇳</h1>
          <p className="success-message">
            We’ve received your order and our Indian warehouse team is packing it with certified safety padding and festive ribbon.
          </p>

          <div className="order-quick-meta">
            <div className="meta-block">
              <span className="meta-label">Order Reference</span>
              <span className="meta-value text-primary">{order.id}</span>
            </div>
            <div className="meta-divider"></div>
            <div className="meta-block">
              <span className="meta-label">Courier Tracking</span>
              <span className="meta-value">{order.trackingNumber}</span>
            </div>
            <div className="meta-divider"></div>
            <div className="meta-block">
              <span className="meta-label">Estimated Delivery</span>
              <span className="meta-value">2 - 4 Business Days</span>
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="success-details-grid">
          {/* Items Breakdown */}
          <div className="success-items-col card">
            <h3 className="details-col-title">
              <Package size={20} className="text-secondary" />
              <span>Purchased Toys ({order.items?.length || 0})</span>
            </h3>

            <div className="receipt-items-list">
              {order.items?.map(item => (
                <div key={item.id} className="receipt-item-row">
                  <img src={item.image} alt={item.name} className="receipt-item-img" />
                  <div className="receipt-item-info">
                    <h4 className="receipt-item-name">{item.name}</h4>
                    <span className="receipt-item-qty">Qty: {item.quantity}</span>
                  </div>
                  <span className="receipt-item-price">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-totals-table">
              <div className="receipt-total-row">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="receipt-total-row text-success">
                  <span>Festive Discount</span>
                  <span>-{formatINR(order.discount)}</span>
                </div>
              )}
              <div className="receipt-total-row">
                <span>Doorstep Delivery</span>
                <span>{order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)}</span>
              </div>
              <div className="receipt-total-row receipt-grand-total">
                <span>Total Amount Paid</span>
                <span className="receipt-grand-amount">{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Payment Destination Info */}
          <div className="success-info-col">
            <div className="shipping-info-card card">
              <h3 className="details-col-title">
                <MapPin size={20} className="text-primary" />
                <span>Delivery Destination</span>
              </h3>
              <p className="recipient-name"><strong>{order.customer?.name || order.customer_name || 'Customer'}</strong></p>
              {order.shippingAddress?.address && (
                <p className="destination-text">{order.shippingAddress.address}</p>
              )}
              {(order.shippingAddress?.city || order.shippingAddress?.state || order.shippingAddress?.pincode) && (
                <p className="destination-text">
                  {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}
                  {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ''}
                </p>
              )}
              <p className="destination-text">{order.shippingAddress?.country || 'India'}</p>
              {(order.customer?.phone || order.customer_phone) && (
                <p className="destination-phone">Phone: {order.customer?.phone || order.customer_phone}</p>
              )}
              {(order.customer?.email) && (
                <p className="destination-email">Tracking Updates: {order.customer.email}</p>
              )}

              {order.isGift && (
                <div className="receipt-gift-box">
                  <span className="badge badge-amber">Gift Packaging Included</span>
                  {order.giftNote && <p className="gift-message-text">"{order.giftNote}"</p>}
                </div>
              )}
            </div>

            <div className="payment-info-card card">
              <h3 className="details-col-title">
                <Truck size={20} className="text-teal" />
                <span>Payment & Courier Status</span>
              </h3>
              <div className="payment-meta-row">
                <span>Payment Method:</span>
                <strong>{order.paymentMethod || 'UPI Instant QR'}</strong>
              </div>
              <div className="payment-meta-row">
                <span>Current Status:</span>
                <span className="badge badge-primary">{order.status || 'Confirmed'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="success-actions-wrap">
              <Link to="/account/orders" className="btn btn-primary btn-block">
                <span>Track Live in Customer Account</span>
                <ArrowRight size={18} />
              </Link>
              <div className="secondary-action-btns">
                <button onClick={handlePrint} className="btn btn-outline btn-block">
                  <Printer size={16} /> Print GST Invoice
                </button>
                <Link to="/shop" className="btn btn-ghost btn-block">
                  <ShoppingBag size={16} /> Continue Browsing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
