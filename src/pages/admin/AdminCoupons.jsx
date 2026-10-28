import React, { useState, useEffect } from 'react';
import { Tag, Plus, Check, X, Percent, ShieldCheck, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api, formatINR } from '../../services/api';
import './AdminCoupons.css';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercent: 20,
    minSpend: 999,
    description: '',
    freeShipping: false
  });

  const loadCoupons = () => {
    setLoading(true);
    api.coupons.getAll()
      .then(data => setCoupons(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleActive = async (code) => {
    try {
      await api.coupons.toggle(code);
      setCoupons(prev => prev.map(c => c.code === code ? { ...c, active: !c.active } : c));
    } catch (err) {
      alert('Failed to update coupon status.');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;

    try {
      await api.coupons.create({
        code: newCoupon.code.trim().toUpperCase(),
        discountPercent: Number(newCoupon.discountPercent),
        minSpend: Number(newCoupon.minSpend),
        description: newCoupon.description.trim() || `${newCoupon.discountPercent}% Off Festive Offer`,
        freeShipping: newCoupon.freeShipping
      });

      setShowAddModal(false);
      setNewCoupon({
        code: '',
        discountPercent: 20,
        minSpend: 999,
        description: '',
        freeShipping: false
      });
      loadCoupons();
    } catch (err) {
      alert(`Failed to create coupon: ${err.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-coupons-root animate-fade-in">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Coupons & Festive Promotional Offers 🇮🇳</h1>
            <p className="admin-page-sub">Create Diwali discount campaign codes, seasonal vouchers in INR, and free shipping triggers</p>
          </div>
          <div className="admin-header-actions">
            <button className="btn btn-outline btn-sm mr-2" onClick={loadCoupons}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Create Promo Code
            </button>
          </div>
        </div>

        <div className="table-card card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Voucher Code</th>
                  <th>Discount Value</th>
                  <th>Minimum Spend (INR)</th>
                  <th>Campaign Description</th>
                  <th>Active Status</th>
                  <th style={{ textAlign: 'right' }}>Toggle</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => (
                  <tr key={coupon.code}>
                    <td>
                      <div className="coupon-code-pill">
                        <Tag size={14} className="text-primary" />
                        <strong>{coupon.code}</strong>
                      </div>
                    </td>
                    <td>
                      {coupon.freeShipping ? (
                        <span className="badge badge-teal">FREE DELIVERY</span>
                      ) : (
                        <strong className="text-primary font-bold">{coupon.discountPercent}% OFF</strong>
                      )}
                    </td>
                    <td>{formatINR(coupon.minSpend || 0)}</td>
                    <td>{coupon.description}</td>
                    <td>
                      <span className={`badge ${coupon.active ? 'badge-success' : 'badge-danger'}`}>
                        {coupon.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${coupon.active ? 'btn-outline text-danger' : 'btn-primary'}`}
                        onClick={() => handleToggleActive(coupon.code)}
                      >
                        {coupon.active ? 'Deactivate' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="modal-card card animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3 className="modal-title">Create New Festive Voucher</h3>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon}>
                <div className="form-group">
                  <label className="form-label">Coupon Code (Uppercase) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DIWALI30"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="form-input"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={newCoupon.discountPercent}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Cart Value (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCoupon.minSpend}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Campaign Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Festive Diwali 20% discount on orders above ₹999"
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-custom-label">
                    <input
                      type="checkbox"
                      checked={newCoupon.freeShipping}
                      onChange={(e) => setNewCoupon({ ...newCoupon, freeShipping: e.target.checked })}
                    />
                    <span className="checkbox-text">Also grant Free Priority Delivery across India</span>
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
