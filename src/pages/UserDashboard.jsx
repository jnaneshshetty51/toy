import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Heart, 
  MapPin, 
  User, 
  Settings, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Sparkles, 
  Plus, 
  Trash2, 
  ShoppingBag,
  ExternalLink,
  Gift,
  LogOut,
  Download,
  RotateCcw,
  XCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api, formatINR } from '../services/api';
import ProductCard from '../components/ProductCard';
import './UserDashboard.css';

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi NCR', 'Tamil Nadu', 'Telangana',
  'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Rajasthan',
  'Haryana', 'Punjab', 'Madhya Pradesh', 'Andhra Pradesh', 'Bihar',
  'Odisha', 'Assam', 'Goa', 'Uttarakhand', 'Jharkhand'
];

export default function UserDashboard() {
  const { user, updateProfile, addresses, saveAddress, deleteAddress, logout } = useAuth();
  const { wishlist, addToCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Address modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    fullName: user?.name || '',
    street: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '',
    phone: user?.phone || '+91 ',
    isDefault: false
  });

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Verification, Data Export & Deletion
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(user?.isVerified || false);
  const [verificationMsg, setVerificationMsg] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
      setVerificationStatus(Boolean(user.isVerified));
    }
  }, [user]);

  const handleSendVerification = async () => {
    try {
      const res = await api.auth.sendVerification();
      setShowOtpInput(true);
      setVerificationMsg('Verification OTP has been dispatched to your mobile number via SMS.');
    } catch (err) {
      alert(err.message || 'Failed to send verification OTP.');
    }
  };

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    try {
      const res = await api.auth.verifyAccount(verificationCode);
      setVerificationStatus(true);
      setShowOtpInput(false);
      setVerificationMsg(res.message || 'Account verified successfully!');
      setTimeout(() => setVerificationMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to verify account.');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.auth.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toyverse-data-export-${user?.id || 'customer'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export personal data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently delete your account and personal data? This action cannot be undone.')) {
      return;
    }
    setIsDeletingAccount(true);
    try {
      await api.auth.deleteAccount();
      logout();
      navigate('/login?deleted=true');
    } catch (err) {
      alert(err.message || 'Failed to delete account.');
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (location.pathname.includes('wishlist')) {
      setActiveTab('wishlist');
    } else if (location.pathname.includes('orders')) {
      setActiveTab('orders');
    } else if (location.pathname.includes('addresses')) {
      setActiveTab('addresses');
    }

    setLoadingOrders(true);
    api.orders.getAll()
      .then(data => setOrders(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingOrders(false));
  }, [location.pathname]);

  // Load wishlist products from backend
  useEffect(() => {
    if (wishlist.length > 0) {
      api.products.getAll()
        .then(all => {
          setWishlistProducts((all || []).filter(t => wishlist.includes(t.id)));
        })
        .catch(() => {});
    } else {
      setWishlistProducts([]);
    }
  }, [wishlist]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm);
      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to update profile.');
    }
  };

  const handleAddAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveAddress(newAddr);
      setShowAddressModal(false);
      setNewAddr({
        label: 'Home',
        fullName: user?.name || '',
        street: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '',
        phone: user?.phone || '+91 ',
        isDefault: false
      });
    } catch (err) {
      alert('Failed to save address.');
    }
  };

  const getStatusStepIndex = (status) => {
    const stages = ['Placed', 'Processing', 'Shipped', 'Delivered'];
    const idx = stages.findIndex(s => s.toLowerCase() === (status || '').toLowerCase());
    return idx >= 0 ? idx : 0;
  };

  const handleCancelOrder = async (orderId) => {
    const reason = window.prompt('Please enter the reason for cancellation (e.g. Changed mind, accidental order):', 'Customer requested cancellation');
    if (!reason) return;
    try {
      const res = await api.orders.cancel(orderId, reason);
      alert(res.message || 'Order has been cancelled and stock restored to inventory.');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled', paymentStatus: o.paymentStatus === 'Paid' ? 'Refunded' : 'Cancelled' } : o));
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
    }
  };

  const handleRequestReturn = async (orderId, type = 'return') => {
    const actionLabel = type === 'replacement' ? 'replacement' : 'return';
    const reason = window.prompt(`Please enter the reason for ${actionLabel} (e.g. Defective piece, damaged packaging, wrong size):`, 'Transit damage / defective item');
    if (!reason) return;
    try {
      const res = await api.orders.requestReturn(orderId, { type, reason });
      alert(res.message || `${type === 'replacement' ? 'Replacement' : 'Return'} request submitted according to our 7-day policy.`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: type === 'replacement' ? 'Replacement Dispatched' : 'Return Requested' } : o));
    } catch (err) {
      alert(err.message || 'Failed to initiate return request.');
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const invoiceData = await api.orders.getInvoice(orderId);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Tax Invoice - ${invoiceData.invoiceNumber}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 2.5rem; color: #111; max-width: 800px; margin: 0 auto; }
                .header { border-bottom: 2px solid #111; padding-bottom: 1rem; margin-bottom: 1.5rem; }
                .badge { display: inline-block; padding: 3px 8px; font-size: 11px; background: #eee; font-weight: bold; border-radius: 3px; }
                table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 14px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f8f8f8; }
                .text-right { text-align: right; }
                .total-row { font-weight: bold; font-size: 1rem; background: #fafafa; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>TOYVERSE RETAIL INDIA PRIVATE LIMITED</h2>
                <p>Tax Invoice (Rule 46 CGST Act) // GSTIN: <strong>${invoiceData.seller.gstin}</strong> | PAN: <strong>${invoiceData.seller.pan}</strong></p>
                <p>Registered Hub: ${invoiceData.seller.address}</p>
                <p>Invoice No: <strong>${invoiceData.invoiceNumber}</strong> | Date: <strong>${invoiceData.invoiceDate}</strong> | Order ID: <strong>${invoiceData.orderId}</strong></p>
              </div>
              <p><strong>Billed & Dispatched To:</strong> ${invoiceData.buyer.name} (${invoiceData.buyer.phone})</p>
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map(it => `
                    <tr>
                      <td>${it.name}</td>
                      <td>9503</td>
                      <td>${it.quantity}</td>
                      <td class="text-right">₹${it.price}</td>
                      <td class="text-right">₹${it.price * it.quantity}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td colspan="4" class="text-right">Taxable Subtotal:</td>
                    <td class="text-right">₹${invoiceData.taxableSubtotal}</td>
                  </tr>
                  <tr>
                    <td colspan="4" class="text-right">CGST (9%):</td>
                    <td class="text-right">₹${invoiceData.cgst}</td>
                  </tr>
                  <tr>
                    <td colspan="4" class="text-right">SGST (9%):</td>
                    <td class="text-right">₹${invoiceData.sgst}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="4" class="text-right">Final Total (INR):</td>
                    <td class="text-right">₹${invoiceData.total}</td>
                  </tr>
                </tbody>
              </table>
              <p style="margin-top: 2rem; font-size: 0.75rem; color: #666;">
                Compliant with Indian BIS IS-9873 Safety Standard protocol. Express Pan-India Courier Dispatched.
              </p>
              <script>window.print();</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch (err) {
      alert('Failed to load tax invoice: ' + err.message);
    }
  };

  if (!user) {
    return (
      <div className="user-dashboard-root animate-fade-in" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '480px' }}>
          <div className="card" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '3.5rem' }}>🔐</span>
            <h2>Sign In to View Your Account</h2>
            <p className="text-muted" style={{ fontSize: '0.95rem' }}>
              Track dispatches across India, view past GST tax invoices, manage delivery addresses, and view your saved toy wishlist.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Sign In</Link>
              <Link to="/register" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard-root animate-fade-in">
      <div className="container">
        {/* User Welcome Header Banner */}
        <div className="dashboard-banner card">
          <div className="dashboard-banner-user">
            <img 
              src={user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"} 
              alt={user?.name} 
              className="user-big-avatar" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80";
              }}
            />
            <div className="user-greeting-meta">
              <div className="user-greeting-tags">
                <span className="badge badge-primary">ToyVerse India Member</span>
                <span className="badge badge-amber">
                  <Sparkles size={12} /> {user?.rewardsPoints || 100} ToyPoints
                </span>
              </div>
              <h1 className="dashboard-user-name">Namaste, {user?.name || 'Shopper'}!</h1>
              <p className="dashboard-user-email">{user?.email} • {user?.phone || '+91 Registered Mobile'}</p>
            </div>
          </div>

          <div className="dashboard-quick-stats">
            <div className="dashboard-stat-box">
              <span className="dash-stat-number">{orders.length}</span>
              <span className="dash-stat-label">Total Orders</span>
            </div>
            <div className="dashboard-stat-box">
              <span className="dash-stat-number">{wishlist.length}</span>
              <span className="dash-stat-label">Saved Toys</span>
            </div>
            <div className="dashboard-stat-box">
              <span className="dash-stat-number">{addresses.length}</span>
              <span className="dash-stat-label">Addresses</span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-nav-tabs">
          <button 
            className={`dash-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Package size={18} />
            <span>My Orders ({orders.length})</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
          >
            <Heart size={18} />
            <span>Saved Wishlist ({wishlist.length})</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            <MapPin size={18} />
            <span>Delivery Addresses ({addresses.length})</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Account Profile</span>
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div className="orders-tab-content animate-fade-in">
            {orders.length === 0 ? (
              <div className="empty-tab-view card">
                <Package size={48} className="empty-tab-icon" />
                <h3>No Orders Placed Yet</h3>
                <p>When you purchase toys, you can track their Indian courier dispatch live right here!</p>
                <Link to="/shop" className="btn btn-primary">Discover Toys</Link>
              </div>
            ) : (
              <div className="orders-cards-list">
                {orders.map(order => {
                  const stepIndex = getStatusStepIndex(order.status);
                  const stages = [
                    { label: 'Order Placed', icon: Clock },
                    { label: 'Packed & Verified', icon: Package },
                    { label: 'Shipped (Courier)', icon: Truck },
                    { label: 'Delivered', icon: CheckCircle2 }
                  ];

                  return (
                    <div key={order.id} className="customer-order-card card">
                      {/* Top Bar */}
                      <div className="order-card-header">
                        <div className="order-card-id-block">
                          <span className="order-ref-id">{order.id}</span>
                          <span className="order-date">Placed on {order.date}</span>
                        </div>
                        <div className="order-card-meta-right">
                          <span className="order-total-price">{formatINR(order.total)}</span>
                          <span className={`status-badge-pill status-${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Visualizer */}
                      <div className="order-status-timeline">
                        <div className="timeline-track">
                          <div 
                            className="timeline-progress-fill"
                            style={{ width: `${(stepIndex / (stages.length - 1)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="timeline-steps-row">
                          {stages.map((st, i) => {
                            const isDone = i <= stepIndex;
                            const isCurrent = i === stepIndex;
                            const IconComponent = st.icon;
                            return (
                              <div key={st.label} className={`timeline-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                <div className="node-circle">
                                  <IconComponent size={14} />
                                </div>
                                <span className="node-label">{st.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="order-items-preview-list">
                        {order.items?.map(item => (
                          <div key={item.id} className="preview-item-row">
                            <img src={item.image} alt={item.name} className="preview-thumb" />
                            <div className="preview-meta">
                              <h4 className="preview-name">{item.name}</h4>
                              <span className="preview-price">
                                {item.quantity} x {formatINR(item.price)}
                              </span>
                            </div>
                            <button 
                              className="btn btn-outline btn-sm"
                              onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, images: [item.image] }, 1)}
                            >
                              Buy Again
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Info Footer */}
                      <div className="order-card-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                        <div className="order-footer-text" style={{ fontSize: '0.8rem' }}>
                          <span>Courier AWB: <strong>{order.trackingNumber || 'DEL-IN-EXP'}</strong></span>
                          <span> • Destination: <strong>{order.shippingAddress?.city || order.shippingAddress?.addressLine1 || 'Bengaluru'}, {order.shippingAddress?.state || 'India'}</strong></span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDownloadInvoice(order.id)}
                            style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem' }}
                          >
                            <Download size={13} />
                            <span>Tax Invoice</span>
                          </button>

                          {order.status !== 'Cancelled' && order.status !== 'Delivered' && !order.status.includes('Return') && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleCancelOrder(order.id)}
                              style={{ fontSize: '0.72rem', borderColor: '#FCA5A5', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem' }}
                            >
                              <XCircle size={13} />
                              <span>Cancel Order</span>
                            </button>
                          )}

                          {order.status === 'Delivered' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleRequestReturn(order.id, 'replacement')}
                                style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem' }}
                              >
                                <RotateCcw size={13} />
                                <span>Replace Toy</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleRequestReturn(order.id, 'return')}
                                style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                              >
                                <span>Return</span>
                              </button>
                            </>
                          )}

                          <Link to={`/order-success/${order.id}`} className="view-receipt-link" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            Summary <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Wishlist */}
        {activeTab === 'wishlist' && (
          <div className="wishlist-tab-content animate-fade-in">
            {wishlistProducts.length === 0 ? (
              <div className="empty-tab-view card">
                <Heart size={48} className="empty-tab-icon text-primary" />
                <h3>Your Wishlist is Empty</h3>
                <p>Click the heart icon on any toy you love to save it here for later.</p>
                <Link to="/shop" className="btn btn-primary">Browse All Toys</Link>
              </div>
            ) : (
              <div className="products-grid">
                {wishlistProducts.map(toy => (
                  <ProductCard key={toy.id} toy={toy} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Delivery Addresses (India) */}
        {activeTab === 'addresses' && (
          <div className="addresses-tab-content animate-fade-in">
            <div className="addresses-header-action">
              <div>
                <h3 className="tab-section-title">Delivery Addresses in India</h3>
                <p className="tab-section-sub">Manage home, office, and relatives' gift delivery addresses</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddressModal(true)}>
                <Plus size={16} /> Add Address
              </button>
            </div>

            <div className="addresses-cards-grid">
              {addresses.map(addr => (
                <div key={addr.id} className="address-card card">
                  <div className="address-card-header">
                    <span className="address-label-badge">{addr.label || 'Home'}</span>
                    {addr.isDefault && (
                      <span className="badge badge-teal">Default Address</span>
                    )}
                  </div>
                  <h4 className="addr-name">{addr.fullName}</h4>
                  <p className="addr-line">{addr.street}</p>
                  <p className="addr-line">{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                  <p className="addr-phone">Phone: {addr.phone}</p>

                  <div className="address-card-actions">
                    <button 
                      className="addr-delete-btn"
                      onClick={() => deleteAddress(addr.id)}
                      title="Delete Address"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Address Modal */}
            {showAddressModal && (
              <div className="modal-backdrop" onClick={() => setShowAddressModal(false)}>
                <div className="modal-card card animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <h3 className="modal-title">Add Indian Delivery Address</h3>
                  <form onSubmit={handleAddAddressSubmit}>
                    <div className="form-group">
                      <label className="form-label">Address Tag / Label</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Home, Office, Grandparents' Home"
                        value={newAddr.label}
                        onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Recipient's Full Name</label>
                      <input
                        type="text"
                        required
                        value={newAddr.fullName}
                        onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Flat / House / Street / Colony</label>
                      <input
                        type="text"
                        required
                        value={newAddr.street}
                        onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                        className="form-input"
                        placeholder="e.g. Flat 302, Palm Grove, Whitefield"
                      />
                    </div>
                    <div className="form-grid-3">
                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input
                          type="text"
                          required
                          value={newAddr.city}
                          onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                          className="form-input"
                          placeholder="Bengaluru"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">State</label>
                        <select
                          value={newAddr.state}
                          onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                          className="form-select"
                        >
                          {INDIAN_STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">6-Digit PIN Code</label>
                        <input
                          type="text"
                          required
                          maxLength="6"
                          value={newAddr.pincode}
                          onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                          className="form-input"
                          placeholder="560066"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={newAddr.phone}
                        onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                        className="form-input"
                        placeholder="+91 98450 12345"
                      />
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAddressModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Save Address
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Account Settings */}
        {activeTab === 'profile' && (
          <div className="profile-tab-content animate-fade-in">
            <div className="profile-card card">
              <h3 className="tab-section-title">Personal Information</h3>
              <p className="tab-section-sub">Update your contact profile and phone number</p>

              {saveSuccessMsg && (
                <div className="profile-success-alert">
                  <CheckCircle2 size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Registered)</label>
                  <input
                    type="email"
                    disabled
                    value={profileForm.email}
                    className="form-input"
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number (India +91)</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="profile-actions-row">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline text-danger"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </form>
            </div>

            {/* Email & Phone Verification Card */}
            <div className="profile-card card" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 className="tab-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Account Security & Verification</span>
                    {verificationStatus ? (
                      <span className="badge badge-teal">✅ 100% Verified Buyer</span>
                    ) : (
                      <span className="badge badge-amber">⚠️ Verification Pending</span>
                    )}
                  </h3>
                  <p className="tab-section-sub">Verify your phone and email to unlock express UPI 1-click checkout and priority BIS IS-9873 child-safety support.</p>
                </div>

                {!verificationStatus && !showOtpInput && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSendVerification}>
                    Verify Account Now (Send OTP)
                  </button>
                )}
              </div>

              {verificationMsg && (
                <div style={{ padding: '0.6rem 0.85rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginTop: '0.75rem', color: '#166534' }}>
                  {verificationMsg}
                </div>
              )}

              {showOtpInput && (
                <form onSubmit={handleVerifyAccount} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="Enter 6-Digit OTP"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: '180px', letterSpacing: '0.15em', fontWeight: 700 }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Confirm & Verify
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOtpInput(false)}>
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Privacy, Data Portability & Account Erasure Card */}
            <div className="profile-card card" style={{ marginTop: '1.5rem', border: '1px solid #FECDD3' }}>
              <h3 className="tab-section-title" style={{ color: '#BE123C' }}>Privacy & Data Rights (DPDP Act 2023 / GDPR)</h3>
              <p className="tab-section-sub">Download an archive of your personal data or request permanent erasure of your account.</p>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  <Download size={14} />
                  <span>{isExporting ? 'Generating Archive...' : 'Download My Data (JSON)'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm text-danger"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  style={{ borderColor: '#FDA4AF' }}
                >
                  <Trash2 size={14} />
                  <span>{isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete My Account'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
