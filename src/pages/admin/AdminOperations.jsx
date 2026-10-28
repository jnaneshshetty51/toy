import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Megaphone, 
  Layers, 
  Send, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Mail, 
  ExternalLink,
  Plus,
  RefreshCw,
  ShoppingBag,
  Star,
  Award,
  Truck,
  Database,
  MapPin,
  Check,
  AlertTriangle,
  Download,
  Settings,
  HardDrive,
  Sparkles,
  Eye,
  EyeOff,
  Power,
  ArrowUpRight,
  Tag,
  QrCode,
  Terminal,
  Copy,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Activity,
  Cpu,
  FileText
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api, formatINR } from '../../services/api';
import './AdminOperations.css';

export default function AdminOperations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'customers';
  const [activeTab, setActiveTab] = useState(currentTab);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shippingRules, setShippingRules] = useState({
    freeShippingThreshold: 499,
    standardShippingFee: 49,
    codFee: 40,
    primaryCourier: 'Delhivery Air Express',
    delhiveryHub: 'Bengaluru Kempegowda Cargo Terminal',
    serviceablePincodes: '19,240 PIN Codes across India'
  });
  const [systemStatus, setSystemStatus] = useState(null);
  const [backupsList, setBackupsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Marketing tools states
  const [recoveryLog, setRecoveryLog] = useState(null);
  const [smsPhone, setSmsPhone] = useState('+91 98450 12345');
  const [smsStatus, setSmsStatus] = useState(null);

  // PIN code serviceability tester state
  const [testPincode, setTestPincode] = useState('560025');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [testingPin, setTestingPin] = useState(false);

  // UPI Engine & 3-Layer Reconciliation States (₹0 Stack)
  const [upiStatus, setUpiStatus] = useState(null);
  const [upiOrders, setUpiOrders] = useState([]);
  const [upiEvents, setUpiEvents] = useState([]);
  const [upiViewMode, setUpiViewMode] = useState('overview'); // overview | mismatches | orders | events | simulator | audit
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [heartbeatPinging, setHeartbeatPinging] = useState(false);
  const [previewQrOrder, setPreviewQrOrder] = useState(null);

  // Webhook Simulator State
  const [simPreset, setSimPreset] = useState('sbi');
  const [simAmount, setSimAmount] = useState('999.00');
  const [simRef, setSimRef] = useState('');
  const [simTxnId, setSimTxnId] = useState('328912481920');
  const [simVpa, setSimVpa] = useState('shopper@okaxis');
  const [simCustomText, setSimCustomText] = useState('');
  const [simStaleTs, setSimStaleTs] = useState(false);
  const [simTamperedSig, setSimTamperedSig] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // New Category modal state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Banner state
  const [newBanner, setNewBanner] = useState({
    title: 'Festive Weekend Offer',
    subtitle: 'Extra 10% OFF with code WEEKEND10 on STEM toys',
    ctaText: 'Shop STEM Toys',
    ctaLink: '/shop?category=STEM & Robotics'
  });
  const [bannerFilter, setBannerFilter] = useState('all');

  const BANNER_PRESETS = [
    {
      label: '🪔 Diwali Toy Dhamaka',
      title: '🎉 Diwali Mega Dhamaka — Flat 20% OFF!',
      subtitle: 'Use coupon DIWALI20 at checkout • Free Express Delivery across India on orders above ₹499 🚚 🇮🇳',
      ctaText: 'Shop Festive Deals',
      ctaLink: '/shop?badge=Festive%20Deal'
    },
    {
      label: '🇮🇳 GI Craft Fair',
      title: '🇮🇳 Heritage Artisans Fair — 15% OFF GI Crafts',
      subtitle: 'Channapatna & Kondapalli wooden treasures • 100% Non-toxic natural vegetable lac-turnery',
      ctaText: 'Explore GI Crafts',
      ctaLink: '/shop?category=Wooden%20Craft%20Toys'
    },
    {
      label: '⚡ STEM & Robotics',
      title: '⚡ Future Innovators Carnival — Extra ₹150 OFF',
      subtitle: 'Use code STEM150 on DIY Science & Robotics kits • BIS certified child-safe components',
      ctaText: 'Discover STEM',
      ctaLink: '/shop?category=STEM%20%26%20Robotics'
    },
    {
      label: '🎁 Birthday Club',
      title: '🎂 Birthday Month Special: Free Festive Gift Packaging',
      subtitle: 'Eco-friendly gift wrapping + handwritten personalized message card with every gift toy order',
      ctaText: 'Find Birthday Gifts',
      ctaLink: '/shop'
    }
  ];

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'customers';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.operations.getCustomers().catch(() => []),
      api.operations.getReviews().catch(() => []),
      api.operations.getAllBanners().catch(() => api.operations.getBanners().catch(() => [])),
      api.operations.getCategories().catch(() => []),
      api.operations.getBrands().catch(() => []),
      api.operations.getShippingRules().catch(() => null),
      api.operations.getSystemStatus().catch(() => null),
      api.operations.getBackups().catch(() => [])
    ]).then(([custs, revs, bans, cats, brs, shipRules, sysStat, bkups]) => {
      setCustomers(custs || []);
      setReviews(revs || []);
      setBanners(bans || []);
      setCategories(cats || []);
      setBrands(brs || []);
      if (shipRules) setShippingRules(shipRules);
      if (sysStat) setSystemStatus(sysStat);
      setBackupsList(bkups || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.operations.updateCustomerRole(userId, newRole);
      setCustomers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showFeedback(`User permission updated to ${newRole}!`);
    } catch (err) {
      alert('Failed to update role.');
    }
  };

  const handleVerifyReview = async (reviewId) => {
    try {
      await api.operations.verifyReview(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, verified: true } : r));
      showFeedback('Review verified and published with verified buyer badge!');
    } catch (err) {
      alert('Failed to verify review.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to remove this review?')) return;
    try {
      await api.operations.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      showFeedback('Review moderated and removed.');
    } catch (err) {
      alert('Failed to delete review.');
    }
  };

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.title.trim()) return;
    try {
      const created = await api.operations.createBanner(newBanner);
      setBanners(prev => [created, ...prev]);
      setNewBanner({
        title: '',
        subtitle: '',
        ctaText: 'Shop Now',
        ctaLink: '/shop'
      });
      showFeedback('🎉 New festive banner published and synced across storefront!');
    } catch (err) {
      alert('Failed to create banner.');
    }
  };

  const handleToggleBanner = async (bannerId) => {
    try {
      const updated = await api.operations.toggleBanner(bannerId);
      setBanners(prev => prev.map(b => b.id === bannerId ? { ...b, active: updated.active } : b));
      showFeedback(`Banner ${updated.active ? 'activated on storefront' : 'moved to drafts'}!`);
    } catch (err) {
      alert('Failed to toggle banner status.');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await api.operations.deleteBanner(bannerId);
      setBanners(prev => prev.filter(b => b.id !== bannerId));
      showFeedback('Banner deleted from store CMS.');
    } catch (err) {
      alert('Failed to delete banner.');
    }
  };

  const applyBannerPreset = (preset) => {
    setNewBanner({
      title: preset.title,
      subtitle: preset.subtitle,
      ctaText: preset.ctaText,
      ctaLink: preset.ctaLink
    });
    showFeedback(`Loaded "${preset.label}" template into editor!`);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.operations.createCategory({ name: newCategoryName.trim() });
      if (res && res.category) {
        setCategories(prev => [...prev, res.category]);
      }
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      showFeedback(res.message || 'Category added to ToyVerse taxonomy!');
    } catch (err) {
      alert('Failed to add category: ' + err.message);
    }
  };

  const handleTriggerRecovery = async () => {
    try {
      const res = await api.operations.triggerCartRecovery();
      setRecoveryLog(res.result);
      showFeedback('Abandoned cart recovery notifications dispatched across India!');
    } catch (err) {
      alert('Failed to trigger campaign.');
    }
  };

  const handleSendTestSms = async () => {
    try {
      const res = await api.operations.sendTransactional({
        recipientPhone: smsPhone,
        orderId: 'ORD-IN-7821',
        trackingNumber: 'DELHIVERY-9948210',
        type: 'DISPATCH_ALERT'
      });
      setSmsStatus(res.log);
      showFeedback(`Test SMS notification successfully dispatched to ${smsPhone}!`);
    } catch (err) {
      alert('Failed to send SMS.');
    }
  };

  const handleTestPincode = async (e) => {
    e.preventDefault();
    if (!testPincode) return;
    setTestingPin(true);
    try {
      const res = await api.shipping.checkServiceability(testPincode);
      setPincodeResult(res);
    } catch (err) {
      alert('Error checking PIN serviceability');
    } finally {
      setTestingPin(false);
    }
  };

  const handleSaveShippingRules = async (e) => {
    e.preventDefault();
    try {
      await api.operations.updateShippingRules(shippingRules);
      showFeedback('Shipping charges and free-delivery rules updated successfully!');
    } catch (err) {
      alert('Failed to update shipping rules.');
    }
  };

  const handleTriggerBackup = async () => {
    try {
      showFeedback('Generating hot atomic database snapshot...');
      const res = await api.operations.createBackup();
      if (res && res.backup) {
        setBackupsList(prev => [res.backup, ...prev]);
        showFeedback(`Snapshot "${res.backup.filename}" created successfully (${res.backup.sizeKB} KB)!`);
      }
    } catch (err) {
      alert('Database snapshot failed: ' + err.message);
    }
  };

  // UPI Engine & 3-Layer Reconciliation Handlers
  const loadUpiData = async () => {
    try {
      const [statusRes, ordersRes, eventsRes] = await Promise.all([
        api.upi.getAdminStatus().catch(() => null),
        api.upi.getAdminOrders({ limit: 100 }).catch(() => []),
        api.upi.getAdminEvents().catch(() => [])
      ]);
      if (statusRes) setUpiStatus(statusRes);
      if (ordersRes) setUpiOrders(ordersRes);
      if (eventsRes) setUpiEvents(eventsRes);
    } catch (err) {
      console.error('Failed to load UPI data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'upi') {
      loadUpiData();
    }
  }, [activeTab]);

  const handleConfirmUpi = async (ref) => {
    try {
      await api.upi.confirmOrder(ref);
      showFeedback(`Order ${ref} manually confirmed as paid!`);
      loadUpiData();
    } catch (err) {
      alert(`Confirmation failed: ${err.message}`);
    }
  };

  const handleRefundUpi = async (ref) => {
    const reason = prompt(`Enter reason for refunding order ${ref}:`, 'Customer requested cancellation / Duplicate payment');
    if (!reason) return;
    try {
      await api.upi.refundOrder(ref, reason);
      showFeedback(`Order ${ref} marked as refunded.`);
      loadUpiData();
    } catch (err) {
      alert(`Refund failed: ${err.message}`);
    }
  };

  const handleTriggerReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await api.upi.triggerReconcile();
      setReconcileResult(res);
      showFeedback('Reconciliation cron executed successfully!');
      loadUpiData();
    } catch (err) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleSendHeartbeatPing = async () => {
    setHeartbeatPinging(true);
    try {
      await api.upi.sendHeartbeat({
        device_name: 'Android Pixel 4a (Bank SIM 1)',
        battery_level: 96,
        is_charging: 1,
        network_type: 'WiFi (Airtel_Fiber_5G)'
      });
      showFeedback('Heartbeat ping successfully recorded from Android Forwarder!');
      loadUpiData();
    } catch (err) {
      alert(`Heartbeat ping failed: ${err.message}`);
    } finally {
      setHeartbeatPinging(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimRunning(true);
    setSimResult(null);

    let text = simCustomText;
    const cleanRef = (simRef || (upiOrders[0]?.public_ref || 'ORD-7K3M9Q')).trim().toUpperCase();
    const cleanAmount = parseFloat(simAmount) || 999;
    const cleanTxn = simTxnId || `328912${Math.floor(100000 + Math.random() * 900000)}`;

    if (!text) {
      if (simPreset === 'sbi') {
        text = `Dear SBI User, your A/c ending 1234 credited by Rs ${cleanAmount.toFixed(2)} on 18-Oct-26 by UPI/${cleanTxn}/${cleanRef}/Transfer Ref ${cleanTxn}. Bal: Rs 15,400.00`;
      } else if (simPreset === 'hdfc') {
        text = `HDFC Bank Alert: Rs. ${cleanAmount.toFixed(2)} deposited into A/c **9876 via UPI txn ${cleanTxn} ref ${cleanRef}. Bal Rs 89,200.00`;
      } else if (simPreset === 'icici') {
        text = `Dear Customer, your ICICI Bank Acct XX981 is credited with INR ${cleanAmount.toFixed(2)} on 18-Oct-26 via UPI txn ${cleanTxn}. Info: ${cleanRef}. Net Bal: INR 34,500.00`;
      } else if (simPreset === 'axis') {
        text = `Dear Customer, Rs ${cleanAmount.toFixed(2)} credited to Axis Bank A/c no. XX3910 on 18-10-2026 through UPI Ref ${cleanTxn} (${cleanRef}).`;
      } else if (simPreset === 'kotak') {
        text = `Kotak Bank: INR ${cleanAmount.toFixed(2)} credited to A/c ...4819 on 18-Oct-26. UPI Ref: ${cleanTxn}. Remarks: ${cleanRef}. Avail Bal: INR 22,010.00`;
      } else if (simPreset === 'phonepe') {
        text = `PhonePe: Received Rs ${cleanAmount.toFixed(2)} from ${simVpa} for ${cleanRef}. Txn ID ${cleanTxn}`;
      } else if (simPreset === 'truncated') {
        text = `HDFC Bank Alert: Rs. ${cleanAmount.toFixed(2)} deposited into A/c **9876 via UPI txn ${cleanTxn}. Bal Rs 89,200.00`;
      } else if (simPreset === 'mismatch') {
        text = `Dear SBI User, your A/c ending 1234 credited by Rs ${(cleanAmount / 2).toFixed(2)} on 18-Oct-26 by UPI/${cleanTxn}/${cleanRef}.`;
      }
    }

    try {
      const res = await api.upi.simulateWebhook({
        bankText: text,
        amountRupees: cleanAmount,
        ref: cleanRef,
        bankTxnId: cleanTxn,
        vpa: simVpa,
        simulateStaleTimestamp: simStaleTs,
        simulateTamperedSig: simTamperedSig,
        source: 'android_forwarder'
      });
      setSimResult(res);
      if (res.success) {
        showFeedback(`Simulation completed: ${res.matchResult?.status || 'processed'}`);
      } else {
        showFeedback(`Simulation rejected: ${res.rejectionReason}`);
      }
      loadUpiData();
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimRunning(false);
    }
  };

  const tabsList = [
    { id: 'customers', label: `Customers & Staff (${customers.length})`, icon: Users },
    { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
    { id: 'brands', label: `Brands & GI Hubs (${brands.length})`, icon: Award },
    { id: 'reviews', label: `Review Moderation (${reviews.length})`, icon: MessageSquare },
    { id: 'banners', label: `Banners CMS (${banners.length})`, icon: Megaphone },
    { id: 'marketing', label: 'Cart Recovery & SMS', icon: Send },
    { id: 'shipping', label: 'Shipping Rules & PINs', icon: Truck },
    { id: 'system', label: 'System & Backups', icon: Database },
    { 
      id: 'upi', 
      label: `UPI Engine & Reconciler (${upiStatus?.stats?.mismatchQueueCount ? `${upiStatus.stats.mismatchQueueCount} alerts` : '₹0 Gateway'})`, 
      icon: Smartphone 
    }
  ];

  return (
    <AdminLayout>
      <div className="admin-operations-root animate-fade-in">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Business Operations & Marketing Suite 🇮🇳</h1>
            <p className="admin-page-sub">
              Manage Indian toy taxonomy, craft hubs, customer permissions, review moderation, promotional banners, shipping thresholds, and database backups.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadAll}>
            <RefreshCw size={14} /> Refresh Operations
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div className="auth-success-banner animate-fade-in">
            <CheckCircle2 size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Sub-navigation Tabs */}
        <div className="operations-nav-tabs card">
          {tabsList.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`op-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => handleTabChange(t.id)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CUSTOMERS & STAFF PERMISSIONS */}
        {activeTab === 'customers' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="table-card card">
              <div className="table-card-header">
                <div>
                  <h3 className="chart-title">Customer & Staff Directory</h3>
                  <span className="chart-sub">Manage customer profiles, order history, and assign admin/manager permissions</span>
                </div>
                <span className="badge badge-teal">{customers.length} Registered Users</span>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer Profile</th>
                      <th>Mobile (+91)</th>
                      <th>Orders Placed</th>
                      <th>Total Spend (INR)</th>
                      <th>Rewards Points</th>
                      <th>Access Privilege / Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(cust => (
                      <tr key={cust.id}>
                        <td>
                          <div className="customer-cell-flex">
                            <img 
                              src={cust.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"} 
                              alt={cust.name} 
                              className="customer-avatar-thumb" 
                            />
                            <div>
                              <strong className="customer-cell-name">{cust.name}</strong>
                              <span className="table-sub-date">{cust.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{cust.phone || '+91 Not Provided'}</td>
                        <td><strong>{cust.orderCount || 0} orders</strong></td>
                        <td><strong>{formatINR(cust.totalSpent || 0)}</strong></td>
                        <td>
                          <span className="badge badge-amber">
                            <Award size={12} className="inline mr-1" /> {cust.rewards_points || 100} pts
                          </span>
                        </td>
                        <td>
                          <select
                            value={cust.role}
                            onChange={(e) => handleRoleChange(cust.id, e.target.value)}
                            className={`status-select ${cust.role === 'admin' ? 'status-delivered' : cust.role === 'manager' ? 'status-processing' : 'status-placed'}`}
                          >
                            <option value="customer">Shopper (Customer)</option>
                            <option value="manager">Store Manager</option>
                            <option value="admin">Administrator (Full Access)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORIES TAXONOMY */}
        {activeTab === 'categories' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="card-header-flex">
              <div>
                <h3 className="chart-title">18 Master Toy Categories Taxonomy</h3>
                <span className="chart-sub">Standardized Indian BIS toy categorization with live product counts and valuation metrics</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCategoryModal(true)}>
                <Plus size={14} /> Add Category Taxonomy
              </button>
            </div>

            <div className="categories-grid-cards">
              {categories.map((cat, idx) => (
                <div key={idx} className="category-meta-card card">
                  <div className="category-card-top">
                    <span className={`badge ${cat.count > 0 ? 'badge-teal' : 'badge-amber'}`}>
                      {cat.count} Toys
                    </span>
                    <span className="category-status-pill">{cat.status}</span>
                  </div>
                  <h4 className="category-meta-title">{cat.name}</h4>
                  <div className="category-price-stats">
                    <p>Avg Valuation: <strong>{formatINR(cat.avgPrice)}</strong></p>
                    <p>Price Range: {formatINR(cat.minPrice)} - {formatINR(cat.maxPrice)}</p>
                  </div>
                  <Link 
                    to={`/shop?category=${encodeURIComponent(cat.name)}`} 
                    className="category-browse-link"
                  >
                    View in Storefront →
                  </Link>
                </div>
              ))}
            </div>

            {/* Modal: Add Category */}
            {showAddCategoryModal && (
              <div className="modal-backdrop" onClick={() => setShowAddCategoryModal(false)}>
                <div className="modal-card card animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-row">
                    <h3 className="modal-title">Register New Category Taxonomy</h3>
                    <button className="modal-close" onClick={() => setShowAddCategoryModal(false)}>✕</button>
                  </div>
                  <form onSubmit={handleAddCategory}>
                    <div className="form-group">
                      <label className="form-label">Category Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Solar STEM Robotic Kits"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAddCategoryModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Category
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BRANDS & GI ARTISAN HUBS */}
        {activeTab === 'brands' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="card-header-flex">
              <div>
                <h3 className="chart-title">Brands & Indian Artisan Craft Hubs 🇮🇳</h3>
                <span className="chart-sub">GI-tagged wooden heritage workshops, official space brands, and certified STEM manufacturers</span>
              </div>
              <span className="badge badge-teal">{brands.length} Verified Brands</span>
            </div>

            <div className="brands-grid-cards">
              {brands.map((b, idx) => (
                <div key={idx} className="brand-meta-card card">
                  <div className="brand-card-header">
                    <span className="brand-provenance-tag">📍 {b.state}</span>
                    {b.isGiCraft && (
                      <span className="badge badge-amber">🌟 GI Craft Heritage</span>
                    )}
                  </div>
                  <h4 className="brand-name-title">{b.name}</h4>
                  <div className="brand-stats-row">
                    <div className="brand-stat-box">
                      <span className="stat-label">Catalog Products</span>
                      <strong className="stat-val">{b.count} toys</strong>
                    </div>
                    <div className="brand-stat-box">
                      <span className="stat-label">Average Price</span>
                      <strong className="stat-val">{formatINR(b.avgPrice)}</strong>
                    </div>
                  </div>
                  <div className="brand-footer-row">
                    <span className="bis-badge-pill">🛡️ BIS IS-9873 Compliant</span>
                    <Link 
                      to={`/shop?brand=${encodeURIComponent(b.name)}`}
                      className="category-browse-link"
                    >
                      Filter Shop →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="table-card card">
              <div className="table-card-header">
                <div>
                  <h3 className="chart-title">Parent & Shopper Feedback Moderation</h3>
                  <span className="chart-sub">Approve reviews to display verified buyer badge or moderate feedback</span>
                </div>
                <span className="badge badge-amber">{reviews.length} Total Reviews</span>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Toy Details</th>
                      <th>Parent / Reviewer</th>
                      <th>Rating</th>
                      <th>Review Feedback</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                          No reviews submitted yet!
                        </td>
                      </tr>
                    ) : (
                      reviews.map(rev => (
                        <tr key={rev.id}>
                          <td>
                            <div className="review-toy-cell">
                              <img src={rev.productImage} alt={rev.productName} className="review-toy-thumb" />
                              <strong className="review-toy-name">{rev.productName}</strong>
                            </div>
                          </td>
                          <td>
                            <strong>{rev.user_name || 'Verified Parent'}</strong>
                            <span className="table-sub-date">{new Date(rev.created_at).toLocaleDateString('en-IN')}</span>
                          </td>
                          <td>
                            <div className="stars-flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  fill={i < rev.rating ? "#FFB800" : "none"}
                                  color="#FFB800"
                                />
                              ))}
                            </div>
                          </td>
                          <td>
                            <p className="review-comment-cell">"{rev.comment}"</p>
                          </td>
                          <td>
                            {rev.verified ? (
                              <span className="badge badge-teal">Verified Buyer</span>
                            ) : (
                              <span className="badge badge-amber">Pending Approval</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-flex">
                              {!rev.verified && (
                                <button
                                  className="btn btn-outline btn-sm text-teal"
                                  onClick={() => handleVerifyReview(rev.id)}
                                  title="Approve review"
                                >
                                  <Check size={14} /> Approve
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-sm text-danger"
                                onClick={() => handleDeleteReview(rev.id)}
                                title="Delete review"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BANNERS & CMS */}
        {activeTab === 'banners' && (
          <div className="op-tab-pane animate-fade-in">
            {/* 1. Banners Overview Stats Ribbon */}
            <div className="banners-stats-ribbon">
              <div className="banner-stat-card">
                <div className="banner-stat-icon bg-amber-soft text-amber">
                  <Megaphone size={22} />
                </div>
                <div>
                  <div className="banner-stat-val">{banners.length}</div>
                  <div className="banner-stat-lbl">Total Campaigns</div>
                </div>
              </div>

              <div className="banner-stat-card">
                <div className="banner-stat-icon bg-teal-soft text-teal">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="banner-stat-val">
                    {banners.filter(b => b.active === 1 || b.active === true).length}
                  </div>
                  <div className="banner-stat-lbl">Active on Storefront</div>
                </div>
              </div>

              <div className="banner-stat-card">
                <div className="banner-stat-icon bg-blue-soft text-blue">
                  <Clock size={22} />
                </div>
                <div>
                  <div className="banner-stat-val">
                    {banners.filter(b => !b.active || b.active === 0).length}
                  </div>
                  <div className="banner-stat-lbl">Drafts & Archived</div>
                </div>
              </div>
            </div>

            {/* 2. Real-Time Storefront Announcement Bar Simulation */}
            <div className="banner-simulation-container">
              <div className="simulation-header">
                <span className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber" />
                  <strong>Real-Time Storefront Top Bar Simulation</strong>
                </span>
                <span className="simulation-live-badge">
                  <span className="pulse-dot"></span> Live Customer Preview
                </span>
              </div>
              <div className="simulation-strip">
                <div className="simulation-strip-left">
                  <span className="simulation-pill-tag">
                    {newBanner.title ? (newBanner.title.split(' ')[0] || 'SPECIAL') : 'DIWALI SPECIAL'}
                  </span>
                  <span className="simulation-text">
                    <strong>{newBanner.title || '🎉 Festive Toy Dhamaka — Flat 20% OFF!'}</strong>
                    {' — '}
                    {newBanner.subtitle || 'Use coupon code DIWALI20 at checkout • Free Express Delivery across India above ₹499 🚚 🇮🇳'}
                  </span>
                </div>
                <div>
                  <button type="button" className="simulation-cta-btn">
                    {newBanner.ctaText || 'Shop Now'} →
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Preset Campaign Templates Quick Picker */}
            <div className="banner-presets-bar">
              <span className="presets-label">
                <Sparkles size={14} className="text-amber" /> Preset Campaigns:
              </span>
              {BANNER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyBannerPreset(preset)}
                  className="preset-chip-btn"
                  title="Click to populate banner form with this campaign template"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 4. Form & Manage Banners Split Grid */}
            <div className="banners-management-grid">
              {/* Create Banner Form */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="chart-title">Publish Promotional Banner</h3>
                  <span className="badge badge-amber">Storefront CMS</span>
                </div>
                <p className="chart-sub mb-4">
                  Configure top announcement strips displayed to customers across all desktop and mobile devices.
                </p>

                <form onSubmit={handleCreateBanner} className="banner-form">
                  <div className="form-group">
                    <label className="form-label">Banner Headline *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 🎉 Diwali Toy Dhamaka — Flat 20% OFF!"
                      value={newBanner.title}
                      onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subtitle / Offer Details & Codes</label>
                    <input
                      type="text"
                      placeholder="e.g. Use code DIWALI20 at checkout • Free Delivery on orders above ₹499"
                      value={newBanner.subtitle}
                      onChange={e => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">CTA Button Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop Festive Deals"
                        value={newBanner.ctaText}
                        onChange={e => setNewBanner({ ...newBanner, ctaText: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Target Route / Path</label>
                      <input
                        type="text"
                        placeholder="e.g. /shop?badge=Festive%20Deal"
                        value={newBanner.ctaLink}
                        onChange={e => setNewBanner({ ...newBanner, ctaLink: e.target.value })}
                        className="form-input"
                      />
                      <div className="quick-route-chips">
                        <button type="button" onClick={() => setNewBanner({ ...newBanner, ctaLink: '/shop' })} className="route-chip">Store /shop</button>
                        <button type="button" onClick={() => setNewBanner({ ...newBanner, ctaLink: '/shop?deals=true' })} className="route-chip">Festive Deals</button>
                        <button type="button" onClick={() => setNewBanner({ ...newBanner, ctaLink: '/shop?category=Wooden Craft Toys' })} className="route-chip">GI Crafts</button>
                        <button type="button" onClick={() => setNewBanner({ ...newBanner, ctaLink: '/shop?category=STEM & Robotics' })} className="route-chip">STEM</button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-full mt-2">
                    <Plus size={16} /> Publish Announcement Strip
                  </button>
                </form>
              </div>

              {/* Active & Draft Banners List */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="chart-title">Announcements Repository</h3>
                  <div className="banners-filter-bar mb-0">
                    <button
                      type="button"
                      onClick={() => setBannerFilter('all')}
                      className={`banner-filter-btn ${bannerFilter === 'all' ? 'active' : ''}`}
                    >
                      All ({banners.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerFilter('active')}
                      className={`banner-filter-btn ${bannerFilter === 'active' ? 'active' : ''}`}
                    >
                      Live ({banners.filter(b => b.active === 1 || b.active === true).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerFilter('draft')}
                      className={`banner-filter-btn ${bannerFilter === 'draft' ? 'active' : ''}`}
                    >
                      Drafts ({banners.filter(b => !b.active || b.active === 0).length})
                    </button>
                  </div>
                </div>

                <p className="chart-sub mb-3">
                  Toggle promotional banners live or draft status, test target routing, or remove campaigns.
                </p>

                <div className="active-banners-list">
                  {banners
                    .filter(b => {
                      if (bannerFilter === 'active') return b.active === 1 || b.active === true;
                      if (bannerFilter === 'draft') return !b.active || b.active === 0;
                      return true;
                    })
                    .map((b, idx) => {
                      const isActive = b.active === 1 || b.active === true;
                      const ctaText = b.cta_text || b.ctaText || 'Shop Now';
                      const ctaLink = b.cta_link || b.ctaLink || '/shop';

                      return (
                        <div key={b.id || idx} className={`banner-preview-box ${!isActive ? 'is-draft' : ''}`}>
                          <div className="banner-preview-top">
                            <div className="banner-status-cluster">
                              {isActive ? (
                                <span className="badge badge-teal flex items-center gap-1">
                                  <span className="pulse-dot"></span> Live on Storefront
                                </span>
                              ) : (
                                <span className="badge badge-outline">Draft / Offline</span>
                              )}
                              {b.created_at && (
                                <span className="text-xs text-muted flex items-center gap-1">
                                  <Clock size={12} />
                                  {new Date(b.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              )}
                            </div>
                            <span className="banner-link-pill">
                              <Tag size={12} /> {ctaLink}
                            </span>
                          </div>

                          <h4 className="banner-preview-title">{b.title}</h4>
                          <p className="banner-preview-desc">{b.subtitle || 'No subtitle provided'}</p>

                          <div className="banner-actions-footer">
                            <div className="banner-footer-actions-left">
                              <button
                                type="button"
                                onClick={() => handleToggleBanner(b.id)}
                                className={`btn btn-sm ${isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                title={isActive ? 'Deactivate from live storefront' : 'Make live on storefront'}
                              >
                                <Power size={13} />
                                {isActive ? 'Deactivate' : 'Set Live'}
                              </button>

                              <Link
                                to={ctaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline flex items-center gap-1"
                                title="Test CTA destination link"
                              >
                                <ArrowUpRight size={13} /> {ctaText}
                              </Link>
                            </div>

                            <div className="banner-footer-actions-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteBanner(b.id)}
                                className="banner-delete-btn"
                                title="Delete announcement from CMS"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {banners.length === 0 && (
                    <div className="empty-state-box p-6 text-center">
                      <Megaphone size={36} className="text-muted mx-auto mb-2 opacity-50" />
                      <h4 className="font-bold text-main">No Promotional Banners Found</h4>
                      <p className="text-sm text-muted mb-3">
                        Create your first festive announcement or load one of the Indian festive campaign presets above.
                      </p>
                      <button
                        type="button"
                        onClick={() => applyBannerPreset(BANNER_PRESETS[0])}
                        className="btn btn-sm btn-primary"
                      >
                        <Sparkles size={14} /> Load Diwali Dhamaka Preset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ABANDONED CART RECOVERY & SMS */}
        {activeTab === 'marketing' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="admin-grid-2">
              {/* Abandoned Cart Engine */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <ShoppingBag size={20} className="text-coral" /> Abandoned Cart Recovery Engine
                  </h3>
                  <span className="badge badge-amber">Automated</span>
                </div>
                <p className="chart-sub mb-4">
                  Detects Indian customer baskets left inactive for &gt; 30 minutes and dispatches an incentive discount nudge (<code>RECOVER10</code> for 10% off) via automated SMS and WhatsApp.
                </p>

                <button className="btn btn-primary btn-sm mb-4" onClick={handleTriggerRecovery}>
                  <Send size={14} /> Dispatch Real-Time Recovery Campaign
                </button>

                {recoveryLog && (
                  <div className="recovery-log-box animate-fade-in">
                    <div className="recovery-log-header">
                      <CheckCircle2 size={16} className="text-teal" />
                      <strong>Campaign Dispatched Successfully!</strong>
                    </div>
                    <div className="recovery-log-details">
                      <p>Eligible Customers: <strong>{recoveryLog.eligibleShoppers} shoppers</strong></p>
                      <p>Incentive Code: <strong>{recoveryLog.incentiveCode}</strong></p>
                      <p>Estimated Recoverable Revenue: <strong className="text-primary">{formatINR(recoveryLog.estimatedRecoverableRevenue)}</strong></p>
                      <p className="recovery-log-msg">"{recoveryLog.sampleMessage}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactional SMS Simulator */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <Smartphone size={20} className="text-secondary" /> Transactional SMS Dispatch Tester
                  </h3>
                  <span className="badge badge-teal">SMS Gateway (+91)</span>
                </div>
                <p className="chart-sub mb-4">
                  Test carrier SMS notifications dispatched to Indian parents when an order is packed, shipped, or delivered.
                </p>

                <div className="space-y-3">
                  <div className="form-group">
                    <label className="form-label">Recipient Mobile Number (+91 India)</label>
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={e => setSmsPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button className="btn btn-secondary btn-sm w-full" onClick={handleSendTestSms}>
                    Send Sample Delivery Alert SMS
                  </button>
                </div>

                {smsStatus && (
                  <div className="sms-log-box animate-fade-in">
                    <span className="badge badge-teal mb-2 inline-block">Gateway Handshake Confirmed</span>
                    <p>Channel: <strong>{smsStatus.channel}</strong></p>
                    <p>Recipient: <strong>{smsStatus.recipient}</strong></p>
                    <p className="sms-log-quote">"{smsStatus.message}"</p>
                    <p className="status-confirmed">Status: {smsStatus.status}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SHIPPING RULES & PIN CODE SERVICEABILITY */}
        {activeTab === 'shipping' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="admin-grid-2">
              {/* Shipping Rules Controller */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <Settings size={20} className="text-primary" /> Indian Shipping & Charges Rules
                  </h3>
                  <span className="badge badge-teal">19,000+ PIN Codes</span>
                </div>
                <p className="chart-sub mb-4">
                  Configure free delivery threshold, standard delivery charges, and Cash on Delivery (COD) handling fee without editing source code.
                </p>

                <form onSubmit={handleSaveShippingRules} className="shipping-rules-form">
                  <div className="form-group">
                    <label className="form-label">Free Shipping Minimum Cart Value (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={shippingRules.freeShippingThreshold}
                      onChange={e => setShippingRules({ ...shippingRules, freeShippingThreshold: Number(e.target.value) })}
                      className="form-input"
                    />
                    <small className="form-hint">Carts above this value automatically get ₹0 Free Delivery at checkout.</small>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Standard Shipping Fee (₹ INR) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={shippingRules.standardShippingFee}
                        onChange={e => setShippingRules({ ...shippingRules, standardShippingFee: Number(e.target.value) })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">COD Convenience Fee (₹ INR) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={shippingRules.codFee}
                        onChange={e => setShippingRules({ ...shippingRules, codFee: Number(e.target.value) })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Express Courier Partner</label>
                    <input
                      type="text"
                      value={shippingRules.primaryCourier}
                      onChange={e => setShippingRules({ ...shippingRules, primaryCourier: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Central Air Cargo Dispatch Hub</label>
                    <input
                      type="text"
                      value={shippingRules.delhiveryHub}
                      onChange={e => setShippingRules({ ...shippingRules, delhiveryHub: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full">
                    Save Shipping Rules & Thresholds
                  </button>
                </form>
              </div>

              {/* PIN Code Serviceability Live Tester */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <MapPin size={20} className="text-secondary" /> PIN Code Serviceability Engine
                  </h3>
                  <span className="badge badge-amber">Delhivery API</span>
                </div>
                <p className="chart-sub mb-4">
                  Check if a 6-digit Indian PIN code is serviceable, view estimated delivery TAT, and verify Cash on Delivery availability.
                </p>

                <form onSubmit={handleTestPincode} className="pincode-tester-form">
                  <div className="form-group">
                    <label className="form-label">Enter 6-Digit Indian PIN Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength="6"
                        required
                        placeholder="e.g. 560025, 110001, 400001"
                        value={testPincode}
                        onChange={e => setTestPincode(e.target.value)}
                        className="form-input"
                      />
                      <button type="submit" className="btn btn-secondary btn-sm" disabled={testingPin}>
                        {testingPin ? 'Checking...' : 'Check PIN'}
                      </button>
                    </div>
                  </div>
                </form>

                {pincodeResult && (
                  <div className="pincode-result-box animate-fade-in">
                    <div className="result-header">
                      <CheckCircle2 size={18} className="text-teal" />
                      <strong>PIN Code {pincodeResult.pincode} Serviceable</strong>
                    </div>
                    <div className="result-details-grid">
                      <div className="detail-item">
                        <span>Hub Location:</span>
                        <strong>{pincodeResult.hub || 'Bengaluru Air Cargo Hub'}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Estimated TAT:</span>
                        <strong>{pincodeResult.estimatedTAT || '1 - 2 Business Days'}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Cash on Delivery:</span>
                        <strong className="text-teal">{pincodeResult.codAvailable ? 'Available ✅' : 'Prepaid Only'}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Air Express:</span>
                        <strong className="text-teal">Eligible ✈️</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SYSTEM VITALS & DATABASE BACKUPS */}
        {activeTab === 'system' && (
          <div className="op-tab-pane animate-fade-in">
            <div className="admin-grid-2 mb-4">
              {/* SQLite WAL Health Vitals */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <HardDrive size={20} className="text-teal" /> SQLite 3 Database Vitals
                  </h3>
                  <span className="badge badge-teal">WAL Mode Active</span>
                </div>
                <p className="chart-sub mb-4">
                  High-performance write-ahead logging (WAL) database health, integrity checks, and entity records.
                </p>

                {systemStatus ? (
                  <div className="system-vitals-grid">
                    <div className="vital-card">
                      <span className="vital-label">Database Engine</span>
                      <strong className="vital-val">{systemStatus.database.engine}</strong>
                    </div>
                    <div className="vital-card">
                      <span className="vital-label">Integrity Status</span>
                      <strong className="vital-val text-teal">PRAGMA: {systemStatus.database.integrity} ✅</strong>
                    </div>
                    <div className="vital-card">
                      <span className="vital-label">Node Environment</span>
                      <strong className="vital-val">{systemStatus.system.nodeVersion}</strong>
                    </div>
                    <div className="vital-card">
                      <span className="vital-label">Memory RSS</span>
                      <strong className="vital-val">{systemStatus.system.memoryRssMB} MB</strong>
                    </div>
                    <div className="vital-card">
                      <span className="vital-label">Catalog Products</span>
                      <strong className="vital-val">{systemStatus.database.tables.products} items</strong>
                    </div>
                    <div className="vital-card">
                      <span className="vital-label">Orders Pipeline</span>
                      <strong className="vital-val">{systemStatus.database.tables.orders} orders</strong>
                    </div>
                  </div>
                ) : (
                  <p>Loading database vitals...</p>
                )}
              </div>

              {/* 1-Click Hot WAL Disaster Recovery Backup */}
              <div className="card p-4">
                <div className="card-header-flex mb-3">
                  <h3 className="chart-title flex items-center gap-2">
                    <Database size={20} className="text-primary" /> Hot WAL Snapshot & Backups
                  </h3>
                  <button className="btn btn-primary btn-sm" onClick={handleTriggerBackup}>
                    <Plus size={14} /> 1-Click Hot Snapshot
                  </button>
                </div>
                <p className="chart-sub mb-4">
                  Perform atomic <code>VACUUM INTO</code> live database backups without stopping transactions or locking the store.
                </p>

                <div className="backups-list-box">
                  <h4 className="backups-list-title">Available Disaster Recovery Snapshots ({backupsList.length})</h4>
                  {backupsList.length === 0 ? (
                    <p className="text-muted text-sm py-4 text-center">No snapshots generated yet. Click "1-Click Hot Snapshot" above!</p>
                  ) : (
                    <div className="backup-items-scroll">
                      {backupsList.map((bk, i) => (
                        <div key={i} className="backup-row-item">
                          <div className="backup-row-left">
                            <Database size={16} className="text-teal" />
                            <div>
                              <strong className="backup-name">{bk.filename}</strong>
                              <span className="backup-date">{new Date(bk.createdAt).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <span className="backup-size-badge">{bk.sizeKB} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: AUTONOMOUS UPI PAYMENT GATEWAY & RECONCILIATION ENGINE (₹0 STACK) */}
        {activeTab === 'upi' && (
          <div className="op-tab-pane animate-fade-in upi-dashboard-pane">
            {/* Top Architecture & Forwarder Status Card */}
            <div className="upi-forwarder-banner card">
              <div className="forwarder-banner-left">
                <div className="upi-logo-badge">
                  <Smartphone size={28} className="text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="chart-title">Autonomous UPI Payment Gateway & 3-Layer Reconciler</h3>
                    <span className="badge badge-teal">₹0/mo Cloud Cost</span>
                  </div>
                  <p className="chart-sub">
                    Self-hosted Indian UPI engine running on server-authoritative paise integers, signed HMAC-SHA256 webhook ingestion, Android phone SMS/notification forwarder, and 3-layer reconciliation matching.
                  </p>
                </div>
              </div>

              <div className="forwarder-banner-right">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleTriggerReconcile}
                  disabled={reconciling}
                >
                  <RefreshCw size={14} className={reconciling ? 'animate-spin' : ''} />
                  <span>{reconciling ? 'Reconciling...' : 'Run Reconciler (5m Cron)'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={loadUpiData}
                >
                  <RefreshCw size={14} /> Refresh Ledger
                </button>
              </div>
            </div>

            {/* Android Forwarder Heartbeat & Health Monitor */}
            <div className="forwarder-hardware-card card">
              <div className="card-header-flex mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-secondary" />
                  <strong className="text-base">Android Notification / SMS Forwarder Hardware</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`hardware-status-pill ${upiStatus?.forwarder?.status === 'healthy' ? 'healthy' : upiStatus?.forwarder?.status === 'warning' ? 'warning' : 'offline'}`}>
                    <span className="pulse-dot-sm"></span>
                    {upiStatus?.forwarder?.status === 'healthy' ? '🟢 Forwarder Online & Listening' : upiStatus?.forwarder?.status === 'warning' ? '🟡 Ping Warning (>30m)' : '🔴 Forwarder Offline (>60m Alarm)'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={handleSendHeartbeatPing}
                    disabled={heartbeatPinging}
                  >
                    {heartbeatPinging ? 'Pinging...' : 'Send Test Ping'}
                  </button>
                </div>
              </div>

              <div className="forwarder-vitals-grid">
                <div className="f-vital-item">
                  <span className="f-label">Device Name</span>
                  <strong className="f-val">{upiStatus?.forwarder?.device_name || 'Android Pixel 4a (Bank SIM 1)'}</strong>
                </div>
                <div className="f-vital-item">
                  <span className="f-label">Battery & Power</span>
                  <strong className="f-val">
                    {upiStatus?.forwarder?.battery_level ?? 96}% {upiStatus?.forwarder?.is_charging ? '⚡ (Charging on AC)' : '🔋 (Battery)'}
                  </strong>
                </div>
                <div className="f-vital-item">
                  <span className="f-label">Network & IP</span>
                  <strong className="f-val">{upiStatus?.forwarder?.network_type || 'WiFi (Airtel_5G)'} • {upiStatus?.forwarder?.ip_address || '127.0.0.1'}</strong>
                </div>
                <div className="f-vital-item">
                  <span className="f-label">Last Ping</span>
                  <strong className="f-val">
                    {upiStatus?.forwarder?.last_ping ? new Date(upiStatus.forwarder.last_ping).toLocaleTimeString('en-IN') : 'Just now'} 
                    {upiStatus?.forwarder?.minutes_since_ping !== undefined ? ` (${upiStatus.forwarder.minutes_since_ping}m ago)` : ' (Live)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* KPI Metrics Ribbon */}
            <div className="upi-kpi-ribbon">
              <div className="upi-kpi-card card">
                <div className="kpi-top-row">
                  <span className="kpi-label">Total UPI Volume Collected</span>
                  <span className="kpi-tag-green">₹0 Fees Paid</span>
                </div>
                <div className="kpi-metric-val">
                  {formatINR(upiStatus?.stats?.totalCollectedPaise ? upiStatus.stats.totalCollectedPaise / 100 : 0)}
                </div>
                <span className="kpi-sub-text">
                  {(upiStatus?.stats?.totalCollectedPaise || 0).toLocaleString()} paise across {upiStatus?.stats?.paidOrdersCount || 0} settled orders
                </span>
              </div>

              <div className="upi-kpi-card card">
                <div className="kpi-top-row">
                  <span className="kpi-label">Paid / Confirmed</span>
                  <CheckCircle size={16} className="text-teal" />
                </div>
                <div className="kpi-metric-val">{upiStatus?.stats?.paidOrdersCount || 0}</div>
                <span className="kpi-sub-text">Verified server-side via Layer 1 or Layer 2</span>
              </div>

              <div className="upi-kpi-card card">
                <div className="kpi-top-row">
                  <span className="kpi-label">Pending Orders</span>
                  <Clock size={16} className="text-secondary" />
                </div>
                <div className="kpi-metric-val">{upiStatus?.stats?.pendingOrdersCount || 0}</div>
                <span className="kpi-sub-text">Active 30m window awaiting customer payment</span>
              </div>

              <div className={`upi-kpi-card card ${(upiStatus?.stats?.mismatchQueueCount || 0) > 0 ? 'kpi-alert-highlight' : ''}`}>
                <div className="kpi-top-row">
                  <span className="kpi-label">Mismatch & Review Queue</span>
                  <AlertOctagon size={16} className={(upiStatus?.stats?.mismatchQueueCount || 0) > 0 ? 'text-danger' : 'text-muted'} />
                </div>
                <div className="kpi-metric-val text-danger">
                  {upiStatus?.stats?.mismatchQueueCount || 0}
                </div>
                <span className="kpi-sub-text">
                  {upiStatus?.stats?.amountMismatchesCount || 0} amount mismatches • {upiStatus?.stats?.unmatchedEventsCount || 0} unmatched • {upiStatus?.stats?.ambiguousEventsCount || 0} ambiguous
                </span>
              </div>
            </div>

            {/* Reconciliation Run Results Banner (if freshly executed) */}
            {reconcileResult && (
              <div className="reconcile-result-banner card animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-teal" />
                  <strong>Reconciliation Cron Run Complete:</strong>
                  <span className="text-sm text-muted">
                    {reconcileResult.expiredOrdersCount} expired orders cleaned up • {reconcileResult.reMatchedCount} retried events matched
                  </span>
                </div>
                <div className="sanity-check-row">
                  <span>Daily Sanity Check: Paid Orders ({formatINR(reconcileResult.sanity?.totalPaidOrdersPaise / 100)}) vs Bank Matched ({formatINR(reconcileResult.sanity?.totalMatchedEventsPaise / 100)})</span>
                  <span className="badge badge-teal">Balanced (Diff: ₹0)</span>
                </div>
              </div>
            )}

            {/* Sub-view Navigation */}
            <div className="upi-subview-tabs card">
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'overview' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('overview')}
              >
                <Activity size={14} /> Overview & Ledger
              </button>
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'mismatches' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('mismatches')}
              >
                <AlertOctagon size={14} /> Mismatch & Ambiguity Queue ({upiStatus?.stats?.mismatchQueueCount || 0})
              </button>
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'orders' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('orders')}
              >
                <ShoppingBag size={14} /> All UPI Orders ({upiOrders.length})
              </button>
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'events' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('events')}
              >
                <Database size={14} /> Raw Payment Events ({upiEvents.length})
              </button>
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'simulator' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('simulator')}
              >
                <Terminal size={14} /> Webhook Simulator & Security Sandbox
              </button>
              <button
                type="button"
                className={`upi-sub-btn ${upiViewMode === 'audit' ? 'active' : ''}`}
                onClick={() => setUpiViewMode('audit')}
              >
                <FileText size={14} /> Reconciliation Audit Log
              </button>
            </div>

            {/* VIEW 1: MISMATCH & AMBIGUITY QUEUE */}
            {(upiViewMode === 'mismatches' || (upiViewMode === 'overview' && (upiStatus?.stats?.mismatchQueueCount || 0) > 0)) && (
              <div className="table-card card animate-fade-in">
                <div className="table-card-header">
                  <div>
                    <h3 className="chart-title text-danger flex items-center gap-2">
                      <AlertOctagon size={18} /> Mismatch & Human Review Queue
                    </h3>
                    <span className="chart-sub">
                      Events where amount differs, notes were truncated with multiple candidates, or customer paid wrong account. Server NEVER auto-confirms mismatches.
                    </span>
                  </div>
                  <span className="badge badge-danger">
                    {(upiStatus?.stats?.mismatchQueueCount || 0)} Exceptions Requiring Action
                  </span>
                </div>

                {upiOrders.filter(o => o.status === 'amount_mismatch').length === 0 && upiEvents.filter(e => e.match_status !== 'matched').length === 0 ? (
                  <div className="empty-mismatch-state">
                    <CheckCircle2 size={36} className="text-teal mb-2" />
                    <strong>Mismatch Queue is Empty</strong>
                    <p className="text-muted text-sm">All incoming payments matched authoritative amounts and public references cleanly.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Order Ref</th>
                          <th>Customer</th>
                          <th>Expected Amount</th>
                          <th>Received / Paid</th>
                          <th>Failure Reason</th>
                          <th>Bank Txn / RRN</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upiOrders.filter(o => o.status === 'amount_mismatch').map(order => (
                          <tr key={order.id} className="row-mismatch-highlight">
                            <td>
                              <code className="ref-code-strong">{order.public_ref}</code>
                            </td>
                            <td>
                              <strong>{order.customer_name}</strong>
                              <div className="text-xs text-muted">{order.customer_phone}</div>
                            </td>
                            <td>
                              <strong className="text-primary">{formatINR(order.amount_paise / 100)}</strong>
                              <div className="text-xs text-muted font-mono">{order.amount_paise} paise</div>
                            </td>
                            <td>
                              <strong className="text-danger">{order.paid_amount_paise ? formatINR(order.paid_amount_paise / 100) : 'Differing Amount'}</strong>
                            </td>
                            <td>
                              <span className="badge badge-danger">Amount Mismatch (Layer 1 Guard)</span>
                              <div className="text-xs text-muted mt-1">Customer paid different amount than order total</div>
                            </td>
                            <td>
                              <code className="text-xs">{order.matched_event?.bank_txn_id || 'N/A'}</code>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs btn-success"
                                  onClick={() => handleConfirmUpi(order.public_ref)}
                                  title="Manually Accept Payment and Mark Paid"
                                >
                                  Confirm Paid
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs btn-danger"
                                  onClick={() => handleRefundUpi(order.public_ref)}
                                  title="Flag for UPI Refund"
                                >
                                  Refund
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {upiEvents.filter(e => e.match_status !== 'matched').map(event => (
                          <tr key={event.id} className="row-event-unmatched">
                            <td>
                              <code className="text-muted">{event.parsed_ref || 'NO REF IN NOTE'}</code>
                            </td>
                            <td>
                              <span className="text-sm font-semibold">{event.parsed_vpa || 'Direct Bank Credit'}</span>
                              <div className="text-xs text-muted">Source: {event.source}</div>
                            </td>
                            <td>—</td>
                            <td>
                              <strong>{formatINR(event.parsed_amount_paise ? event.parsed_amount_paise / 100 : 0)}</strong>
                              <div className="text-xs text-muted font-mono">{event.parsed_amount_paise} paise</div>
                            </td>
                            <td>
                              <span className={`badge ${event.match_status === 'ambiguous' ? 'badge-warning' : 'badge-secondary'}`}>
                                {event.match_status === 'ambiguous' ? 'Ambiguous (2+ orders same hour)' : 'Unmatched (No Order Found)'}
                              </span>
                            </td>
                            <td>
                              <code className="text-xs">{event.bank_txn_id || 'N/A'}</code>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline btn-xs"
                                onClick={() => {
                                  const ref = prompt('Enter Order Ref to manually bind this payment event to (e.g. ORD-XXXXXX):');
                                  if (ref) handleConfirmUpi(ref.trim());
                                }}
                              >
                                Bind to Order
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: ORDERS LEDGER */}
            {(upiViewMode === 'orders' || upiViewMode === 'overview') && (
              <div className="table-card card animate-fade-in">
                <div className="table-card-header">
                  <div>
                    <h3 className="chart-title">UPI Payment Orders Directory</h3>
                    <span className="chart-sub">Authoritative order states, Base32 reconciliation references, and confirmation audit trails.</span>
                  </div>
                  <span className="badge badge-teal">{upiOrders.length} Total Orders</span>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Order Ref</th>
                        <th>Status</th>
                        <th>Authoritative Amount</th>
                        <th>Settled Amount</th>
                        <th>Confirmed By</th>
                        <th>Created At</th>
                        <th>Expiry / Paid Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upiOrders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <code className="ref-code-strong">{order.public_ref}</code>
                              <button
                                type="button"
                                className="icon-copy-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.public_ref);
                                  showFeedback(`Copied ${order.public_ref}`);
                                }}
                                title="Copy Ref"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <div className="text-xs text-muted mt-1">{order.customer_name} ({order.customer_phone})</div>
                          </td>
                          <td>
                            <span className={`badge ${
                              order.status === 'paid' ? 'badge-teal' :
                              order.status === 'pending_payment' ? 'badge-warning' :
                              order.status === 'amount_mismatch' ? 'badge-danger' :
                              order.status === 'refunded' ? 'badge-purple' : 'badge-secondary'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <strong>{formatINR(order.amount_paise / 100)}</strong>
                            <div className="text-xs text-muted font-mono">{order.amount_paise} paise</div>
                          </td>
                          <td>
                            {order.paid_amount_paise ? (
                              <>
                                <strong className="text-teal">{formatINR(order.paid_amount_paise / 100)}</strong>
                                <div className="text-xs text-muted font-mono">{order.paid_amount_paise} paise</div>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {order.confirmed_by ? (
                              <span className="badge badge-secondary">{order.confirmed_by}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className="text-xs">{new Date(order.created_at).toLocaleString('en-IN')}</span>
                          </td>
                          <td>
                            {order.paid_at ? (
                              <span className="text-xs text-teal font-semibold">
                                Paid {new Date(order.paid_at).toLocaleTimeString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-xs text-muted">
                                Exp: {new Date(order.expires_at).toLocaleTimeString('en-IN')}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-outline btn-xs"
                                onClick={() => setPreviewQrOrder(order)}
                                title="Preview Server QR"
                              >
                                <QrCode size={12} /> QR
                              </button>
                              {order.status === 'pending_payment' && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs btn-success"
                                  onClick={() => handleConfirmUpi(order.public_ref)}
                                  title="Manual Confirmation"
                                >
                                  Confirm
                                </button>
                              )}
                              {order.status === 'paid' && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs btn-danger"
                                  onClick={() => handleRefundUpi(order.public_ref)}
                                  title="Issue Refund"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: WEBHOOK SIMULATOR & SECURITY TESTING SANDBOX */}
            {(upiViewMode === 'simulator' || upiViewMode === 'overview') && (
              <div className="simulator-sandbox-card card animate-fade-in">
                <div className="table-card-header">
                  <div>
                    <h3 className="chart-title flex items-center gap-2">
                      <Terminal size={18} className="text-primary" /> Interactive Webhook Simulator & Security Sandbox
                    </h3>
                    <span className="chart-sub">
                      Test multi-bank SMS formats, replay attack protections, HMAC signature tampering, and Layer 1/2/3 matching without a physical Android device.
                    </span>
                  </div>
                  <span className="badge badge-secondary">Developer Tool</span>
                </div>

                <div className="simulator-layout-grid">
                  {/* Left Form: Bank Message & Simulation Parameters */}
                  <div className="sim-form-pane">
                    <div className="form-group mb-3">
                      <label className="form-label">Bank Notification Template Preset:</label>
                      <div className="sim-presets-row">
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'sbi' ? 'active' : ''}`}
                          onClick={() => setSimPreset('sbi')}
                        >
                          SBI (State Bank)
                        </button>
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'hdfc' ? 'active' : ''}`}
                          onClick={() => setSimPreset('hdfc')}
                        >
                          HDFC Bank
                        </button>
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'icici' ? 'active' : ''}`}
                          onClick={() => setSimPreset('icici')}
                        >
                          ICICI Bank
                        </button>
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'axis' ? 'active' : ''}`}
                          onClick={() => setSimPreset('axis')}
                        >
                          Axis Bank
                        </button>
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'truncated' ? 'active' : ''}`}
                          onClick={() => setSimPreset('truncated')}
                        >
                          Truncated Note (Layer 2)
                        </button>
                        <button
                          type="button"
                          className={`preset-btn ${simPreset === 'mismatch' ? 'active' : ''}`}
                          onClick={() => setSimPreset('mismatch')}
                        >
                          Amount Mismatch (Layer 3)
                        </button>
                      </div>
                    </div>

                    <div className="form-grid-3 mb-3">
                      <div className="form-group">
                        <label className="form-label">Amount (₹ Rupees):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={simAmount}
                          onChange={(e) => setSimAmount(e.target.value)}
                          className="form-input font-mono"
                          placeholder="999.00"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Order Reference:</label>
                        <input
                          type="text"
                          value={simRef}
                          onChange={(e) => setSimRef(e.target.value.toUpperCase())}
                          className="form-input font-mono"
                          placeholder={upiOrders[0]?.public_ref || 'ORD-7K3M9Q'}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bank UTR / RRN (12 Digits):</label>
                        <input
                          type="text"
                          value={simTxnId}
                          onChange={(e) => setSimTxnId(e.target.value)}
                          className="form-input font-mono"
                          placeholder="328912839210"
                        />
                      </div>
                    </div>

                    {/* Security Guards Toggles */}
                    <div className="sim-security-toggles mb-4">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={simStaleTs}
                          onChange={(e) => setSimStaleTs(e.target.checked)}
                        />
                        <span>Simulate Stale Timestamp Replay Attack (&gt;300s window)</span>
                      </label>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={simTamperedSig}
                          onChange={(e) => setSimTamperedSig(e.target.checked)}
                        />
                        <span>Simulate Tampered HMAC-SHA256 Signature</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={handleRunSimulation}
                      disabled={simRunning}
                    >
                      <Terminal size={16} />
                      <span>{simRunning ? 'Executing Webhook...' : 'Dispatch Signed Webhook to /api/webhooks/upi'}</span>
                    </button>
                  </div>

                  {/* Right Console: Live Execution Results */}
                  <div className="sim-console-pane">
                    <div className="console-top-bar">
                      <div className="console-dots">
                        <span className="dot red"></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                      </div>
                      <span className="console-title">Webhook Execution & Match Trace</span>
                    </div>

                    <div className="console-output-box">
                      {!simResult ? (
                        <div className="console-placeholder">
                          <p>Ready to test. Select a bank preset and click "Dispatch Signed Webhook".</p>
                          <p className="text-xs text-muted mt-2">
                            The simulator will compute HMAC-SHA256(secret, ts.rawBody), verify the 5-minute replay guard, deduplicate via SHA-256 event hash, parse the SMS with bank regexes, and run the 3-layer reconciliation engine.
                          </p>
                        </div>
                      ) : (
                        <div className="console-trace-content animate-fade-in">
                          <div className={`trace-status-pill ${simResult.success ? 'success' : 'failure'}`}>
                            {simResult.success ? 'HTTP 200 OK — Webhook Verified & Processed' : `HTTP 400/401 REJECTED — ${simResult.rejectionReason}`}
                          </div>

                          <div className="trace-section">
                            <span className="trace-header">1. Security & Signature Verification:</span>
                            <div className="trace-code-block">
                              <div>Timestamp: {simResult.simulatedHeaders?.['x-timestamp']} ({simStaleTs ? '⚠️ Stale' : '✅ Valid within 300s'})</div>
                              <div>HMAC Sig: {simResult.simulatedHeaders?.['x-signature']?.substring(0, 32)}...</div>
                              <div>Status: {simResult.rejectionReason ? `❌ ${simResult.rejectionReason}` : '✅ Timing-safe HMAC-SHA256 Validated'}</div>
                            </div>
                          </div>

                          {simResult.parsed && (
                            <div className="trace-section">
                              <span className="trace-header">2. Multi-Bank Regex Parser Output:</span>
                              <div className="trace-code-block">
                                <div>Parsed Amount: {simResult.parsed.amountPaise} paise (₹{(simResult.parsed.amountPaise / 100).toFixed(2)})</div>
                                <div>Parsed Ref: {simResult.parsed.ref || 'None detected (Layer 2 fallback)'}</div>
                                <div>Bank Txn ID: {simResult.parsed.bank_txn_id || 'N/A'}</div>
                              </div>
                            </div>
                          )}

                          {simResult.matchResult && (
                            <div className="trace-section">
                              <span className="trace-header">3. Three-Layer Matching Engine:</span>
                              <div className="trace-code-block">
                                <div>Match Status: <strong className={simResult.matchResult.status === 'matched' ? 'text-teal' : 'text-danger'}>{simResult.matchResult.status}</strong></div>
                                <div>Matched Layer: <code>{simResult.matchResult.layer}</code></div>
                                <div>Matched Order ID: {simResult.matchResult.id || 'None'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: RAW PAYMENT EVENTS TABLE */}
            {(upiViewMode === 'events' || upiViewMode === 'overview') && (
              <div className="table-card card animate-fade-in">
                <div className="table-card-header">
                  <div>
                    <h3 className="chart-title">Raw Payment Events (Idempotent Event Log)</h3>
                    <span className="chart-sub">All raw bank notifications ingested with SHA-256 deduplication hashes and re-parsing capability.</span>
                  </div>
                  <span className="badge badge-teal">{upiEvents.length} Events</span>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Source</th>
                        <th>Parsed Amount</th>
                        <th>Parsed Ref</th>
                        <th>Match Status</th>
                        <th>Bank Txn / RRN</th>
                        <th>Event Hash (Dedupe)</th>
                        <th>Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upiEvents.map(event => (
                        <tr key={event.id}>
                          <td>
                            <code className="text-xs">{event.id}</code>
                          </td>
                          <td>
                            <span className="badge badge-secondary">{event.source}</span>
                          </td>
                          <td>
                            <strong>{formatINR(event.parsed_amount_paise ? event.parsed_amount_paise / 100 : 0)}</strong>
                            <div className="text-xs text-muted font-mono">{event.parsed_amount_paise} paise</div>
                          </td>
                          <td>
                            <code>{event.parsed_ref || '—'}</code>
                          </td>
                          <td>
                            <span className={`badge ${
                              event.match_status === 'matched' ? 'badge-teal' :
                              event.match_status === 'amount_mismatch' ? 'badge-danger' :
                              event.match_status === 'ambiguous' ? 'badge-warning' : 'badge-secondary'
                            }`}>
                              {event.match_status}
                            </span>
                          </td>
                          <td>
                            <code className="text-xs">{event.bank_txn_id || '—'}</code>
                          </td>
                          <td>
                            <span className="text-xs font-mono text-muted" title={event.event_hash}>
                              {event.event_hash ? `${event.event_hash.substring(0, 16)}...` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs">{new Date(event.received_at).toLocaleTimeString('en-IN')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 5: RECONCILIATION AUDIT LOG */}
            {(upiViewMode === 'audit' || upiViewMode === 'overview') && (
              <div className="table-card card animate-fade-in">
                <div className="table-card-header">
                  <div>
                    <h3 className="chart-title">Audit Trail & Transaction Ledger</h3>
                    <span className="chart-sub">Every state change, manual confirmation, mismatch, refund, and cron execution permanently tracked.</span>
                  </div>
                  <span className="badge badge-secondary">Immutable Audit Log</span>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Order ID</th>
                        <th>Metadata</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(upiStatus?.recentLogs || []).map(log => (
                        <tr key={log.id}>
                          <td>#{log.id}</td>
                          <td>
                            <span className="badge badge-secondary">{log.actor}</span>
                          </td>
                          <td>
                            <strong className="text-sm font-mono">{log.action}</strong>
                          </td>
                          <td>
                            <code className="text-xs">{log.order_id || 'Global'}</code>
                          </td>
                          <td>
                            <span className="text-xs font-mono text-muted">{log.meta_json || '{}'}</span>
                          </td>
                          <td>
                            <span className="text-xs">{new Date(log.created_at).toLocaleString('en-IN')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* QR Code Drawer Modal */}
            {previewQrOrder && (
              <div className="admin-modal-overlay animate-fade-in" onClick={() => setPreviewQrOrder(null)}>
                <div className="admin-modal-card upi-modal-box" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3 className="modal-title">UPI QR Code: {previewQrOrder.public_ref}</h3>
                      <p className="text-xs text-muted">Authoritative UPI Payment string generated server-side</p>
                    </div>
                    <button type="button" className="close-btn" onClick={() => setPreviewQrOrder(null)}>✕</button>
                  </div>

                  <div className="modal-body text-center py-4">
                    <img
                      src={previewQrOrder.qr_data_url || `/api/upi/orders/${previewQrOrder.public_ref}/qr.png`}
                      alt={previewQrOrder.public_ref}
                      className="upi-modal-qr-img mb-3"
                    />
                    <div className="font-mono font-bold text-lg text-primary mb-1">
                      {formatINR(previewQrOrder.amount_paise / 100)} ({previewQrOrder.amount_paise} paise)
                    </div>
                    <code className="bg-gray-100 p-2 rounded text-xs block mb-3 break-all select-all">
                      {previewQrOrder.upi_uri}
                    </code>
                    <p className="text-xs text-muted">
                      Customer: {previewQrOrder.customer_name} • Expires: {new Date(previewQrOrder.expires_at).toLocaleTimeString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
