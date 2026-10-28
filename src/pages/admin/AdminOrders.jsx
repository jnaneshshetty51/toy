import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Eye, 
  CheckCircle, 
  Truck, 
  Package, 
  Clock, 
  X, 
  MapPin, 
  Phone, 
  Mail,
  RefreshCw,
  Printer,
  Tag,
  RotateCcw,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api, formatINR } from '../../services/api';
import './AdminOrders.css';

const INDIAN_COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'XpressBees', 'Shadowfax'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sub-modals for Invoice and Shipping Label
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Shipping Provider edit state
  const [shippingForm, setShippingForm] = useState({
    provider: 'Delhivery',
    trackingNumber: ''
  });
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadOrders = () => {
    setLoading(true);
    api.orders.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined })
      .then(data => setOrders(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedOrder) {
      setShippingForm({
        provider: selectedOrder.shippingProvider || 'Delhivery',
        trackingNumber: selectedOrder.trackingNumber || ''
      });
    }
  }, [selectedOrder]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.orders.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
      displaySuccess(`Order status updated to "${newStatus}"!`);
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleSaveShipping = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await api.orders.updateShipping(selectedOrder.id, {
        shippingProvider: shippingForm.provider,
        trackingNumber: shippingForm.trackingNumber,
        status: selectedOrder.status === 'Placed' ? 'Processing' : selectedOrder.status
      });
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      displaySuccess(`Shipping details saved! Assigned to ${shippingForm.provider} (${shippingForm.trackingNumber}).`);
    } catch (err) {
      alert('Failed to update shipping provider.');
    }
  };

  const handleOpenInvoice = async (order) => {
    try {
      const inv = await api.orders.getInvoice(order.id);
      setInvoiceData(inv);
      setShowInvoiceModal(true);
    } catch (err) {
      alert('Failed to fetch invoice.');
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Are you sure you want to cancel order ${selectedOrder.id} and replenish warehouse inventory?`)) return;
    try {
      const res = await api.orders.cancel(selectedOrder.id, 'Admin cancellation');
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
      displaySuccess(res.message);
    } catch (err) {
      alert(`Cancellation error: ${err.message}`);
    }
  };

  const handleProcessReturn = async (type) => {
    if (!selectedOrder) return;
    try {
      const res = await api.orders.requestReturn(selectedOrder.id, { type, reason: 'Customer return approved by admin' });
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
      displaySuccess(res.message);
    } catch (err) {
      alert(`Return error: ${err.message}`);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedOrder) return;
    const amount = prompt(`Enter refund amount in INR (Full amount: ₹${selectedOrder.total}):`, selectedOrder.total);
    if (!amount) return;
    const restock = window.confirm('Restock product inventory back to warehouse?');
    try {
      const res = await api.orders.refund(selectedOrder.id, {
        amount: Number(amount),
        reason: 'Refund approved by administrator',
        restockInventory: restock
      });
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
      displaySuccess(res.message);
    } catch (err) {
      alert(`Refund error: ${err.message}`);
    }
  };

  const handleAutoAwb = async () => {
    try {
      const res = await api.shipping.generateAwb({
        orderId: selectedOrder.id,
        courier: shippingForm.provider || 'Delhivery'
      });
      displaySuccess(res.message);
      setShippingForm(prev => ({ ...prev, trackingNumber: res.awbNumber }));
      setSelectedOrder(prev => ({ ...prev, trackingNumber: res.awbNumber, status: 'Shipped', shippingProvider: res.provider }));
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, trackingNumber: res.awbNumber, status: 'Shipped', shippingProvider: res.provider } : o));
    } catch (err) {
      alert(err.message || 'Failed to auto-manifest shipment.');
    }
  };

  const handlePrintLabel = () => {
    window.open(`/api/shipping/label/${selectedOrder.id}`, '_blank');
  };

  const displaySuccess = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const filteredOrders = orders.filter(o => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = o.customer?.name?.toLowerCase().includes(q) || o.customer?.email?.toLowerCase().includes(q);
      const matchTrack = o.trackingNumber?.toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchTrack) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="admin-orders-root animate-fade-in">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Order Processing, Fulfillment & Shipping 🇮🇳</h1>
            <p className="admin-page-sub">
              Manage lifecycle from placement to doorstep delivery, assign Indian couriers, generate GST tax invoices & dispatch labels.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadOrders}>
            <RefreshCw size={14} /> Refresh Orders
          </button>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccessMsg && (
          <div className="auth-success-banner animate-fade-in">
            <CheckCircle2 size={16} />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Status Filters Bar */}
        <div className="orders-status-nav card">
          <div className="status-nav-buttons">
            {['all', 'Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Refunded'].map(st => (
              <button
                key={st}
                className={`status-nav-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All Orders' : st}
                <span className="status-count-bubble">
                  {st === 'all' ? orders.length : orders.filter(o => (o.status || '').toLowerCase() === st.toLowerCase()).length}
                </span>
              </button>
            ))}
          </div>

          <div className="order-search-box">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, or AWB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="order-search-input"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="table-card card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer Info</th>
                  <th>Shipping & AWB</th>
                  <th>Total (INR)</th>
                  <th>Payment Status</th>
                  <th>Fulfillment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                      No orders matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <strong className="order-id-label">{order.id}</strong>
                        <span className="table-sub-date">{order.date} • {order.items?.length || 1} items</span>
                      </td>
                      <td>
                        <span className="customer-cell-name">{order.customer?.name}</span>
                        <span className="table-sub-date">{order.shippingAddress?.city}, {order.shippingAddress?.pincode}</span>
                      </td>
                      <td>
                        <div className="font-mono text-xs">
                          <strong>{order.shippingProvider || 'Delhivery'}</strong>
                          <span className="text-muted block">{order.trackingNumber || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="order-price-num">{formatINR(order.total)}</strong>
                        <span className="table-sub-date">{order.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={`badge ${order.paymentStatus === 'Paid' ? 'badge-teal' : order.paymentStatus === 'Refunded' ? 'badge-amber' : 'badge-outline'}`}>
                          {order.paymentStatus || 'Paid'}
                        </span>
                      </td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`status-select status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <option value="Placed">Placed</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Return Requested">Return Requested</option>
                          <option value="Returned">Returned</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-1 justify-end">
                          <button 
                            className="table-action-icon"
                            onClick={() => setSelectedOrder(order)}
                            title="Inspect & Manage Fulfillment"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="table-action-icon"
                            onClick={() => handleOpenInvoice(order)}
                            title="Print GST Tax Invoice"
                          >
                            <Printer size={16} />
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

        {/* Order Details & Fulfillment Suite Modal */}
        {selectedOrder && (
          <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="modal-card card animate-fade-in order-modal-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <div>
                  <h3 className="modal-title">Fulfillment Suite: {selectedOrder.id}</h3>
                  <span className="modal-date">
                    Invoice: {selectedOrder.invoiceNumber} • Placed {selectedOrder.date}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => handleOpenInvoice(selectedOrder)}>
                    <Printer size={14} /> Tax Invoice
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowLabelModal(true)}>
                    <Tag size={14} /> Shipping Label
                  </button>
                  <button className="modal-close" onClick={() => setSelectedOrder(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="order-modal-body">
                {/* Shipping Provider & Tracking Assignment Card */}
                <div className="p-3 bg-muted border rounded mb-3">
                  <h4 className="text-xs font-mono font-bold uppercase mb-2 flex items-center gap-1">
                    <Truck size={14} /> Indian Logistics & Dispatch Provider
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted block mb-1">Carrier Provider</label>
                      <select
                        value={shippingForm.provider}
                        onChange={(e) => setShippingForm({ ...shippingForm, provider: e.target.value })}
                        className="form-select text-xs"
                      >
                        {INDIAN_COURIERS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">AWB Tracking Number</label>
                      <input
                        type="text"
                        value={shippingForm.trackingNumber}
                        onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                        className="form-input text-xs font-mono"
                        placeholder="e.g. DELHIVERY-8849102"
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      <button className="btn btn-primary btn-sm" onClick={handleSaveShipping} title="Save manually entered carrier & AWB">
                        Save AWB
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={handleAutoAwb} title="Auto-manifest shipment with Delhivery Air & assign AWB">
                        <Truck size={13} /> Auto AWB
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={handlePrintLabel} title="Print official 4x6 barcode shipping label">
                        <Printer size={13} /> Print Label
                      </button>
                    </div>
                  </div>
                </div>

                <div className="order-modal-grid">
                  {/* Customer & Shipping */}
                  <div className="modal-col-card">
                    <h4 className="modal-col-heading">Customer & Indian Shipping Address</h4>
                    <p className="cust-full-name"><strong>{selectedOrder.customer?.name}</strong></p>
                    <p className="cust-detail-line"><Mail size={14} /> {selectedOrder.customer?.email}</p>
                    <p className="cust-detail-line"><Phone size={14} /> {selectedOrder.customer?.phone}</p>

                    <div className="destination-divider"></div>
                    <p className="destination-line"><MapPin size={14} /> {selectedOrder.shippingAddress?.address}</p>
                    <p className="destination-line-indent">
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - <strong>{selectedOrder.shippingAddress?.pincode}</strong>
                    </p>
                    <p className="destination-line-indent">{selectedOrder.shippingAddress?.country || 'India'}</p>

                    {selectedOrder.isGift && (
                      <div className="gift-modal-notice mt-2">
                        <span className="badge badge-amber">Gift Packaging Included</span>
                        {selectedOrder.giftNote && <p>"{selectedOrder.giftNote}"</p>}
                      </div>
                    )}
                  </div>

                  {/* Purchased Items & Taxes */}
                  <div className="modal-col-card">
                    <h4 className="modal-col-heading">Line Items ({selectedOrder.items?.length || 1})</h4>
                    <div className="modal-items-scroll">
                      {selectedOrder.items?.map(it => (
                        <div key={it.id} className="modal-item-line">
                          <img src={it.image} alt={it.name} className="modal-item-thumb" />
                          <div className="modal-item-meta">
                            <span className="modal-item-title">{it.name}</span>
                            <span className="modal-item-calc">{it.quantity} x {formatINR(it.price)}</span>
                          </div>
                          <span className="modal-item-total">{formatINR(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="modal-totals-breakdown">
                      <div className="modal-total-line">
                        <span>Subtotal:</span>
                        <span>{formatINR(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="modal-total-line text-xs text-muted">
                        <span>GST 18% (CGST 9% + SGST 9% Included):</span>
                        <span>{formatINR(selectedOrder.taxAmount || Math.round((selectedOrder.subtotal * 0.18) / 1.18))}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="modal-total-line text-success">
                          <span>Festive Discount:</span>
                          <span>-{formatINR(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="modal-total-line">
                        <span>Doorstep Delivery:</span>
                        <span>{selectedOrder.shippingFee === 0 ? 'FREE' : formatINR(selectedOrder.shippingFee)}</span>
                      </div>
                      <div className="modal-total-line modal-grand-total">
                        <span>Total Paid (INR):</span>
                        <span>{formatINR(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lifecycle Actions Bar: Cancellations, Returns, Replacements, Refunds */}
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-xs font-mono font-bold uppercase mb-2">Order Exceptions & Resolution Suite</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Delivered' && (
                      <button className="btn btn-outline btn-sm text-danger border-danger" onClick={handleCancelOrder}>
                        <X size={14} /> Cancel Order & Restock
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => handleProcessReturn('return')}>
                      <RotateCcw size={14} /> Initiate Return
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleProcessReturn('replacement')}>
                      <Package size={14} /> Dispatch Replacement
                    </button>
                    {selectedOrder.paymentStatus !== 'Refunded' && (
                      <button className="btn btn-outline btn-sm text-primary" onClick={handleProcessRefund}>
                        <DollarSign size={14} /> Process Refund (₹)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GST Tax Invoice Modal */}
        {showInvoiceModal && invoiceData && (
          <div className="modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
            <div className="modal-card card animate-fade-in max-w-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold font-heading">TAX INVOICE</h2>
                  <p className="text-xs text-muted font-mono">Original for Recipient • GSTIN Compliant</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold block">{invoiceData.invoiceNumber}</span>
                  <span className="text-xs text-muted">Date: {invoiceData.invoiceDate}</span>
                </div>
              </div>

              {/* Seller & Buyer Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3 bg-muted rounded border">
                <div>
                  <strong className="block mb-1 font-mono uppercase">Sold By (Seller):</strong>
                  <p className="font-semibold">{invoiceData.seller?.legalName}</p>
                  <p>GSTIN: <strong>{invoiceData.seller?.gstin}</strong></p>
                  <p>PAN: {invoiceData.seller?.pan}</p>
                  <p className="text-muted mt-1">{invoiceData.seller?.address}</p>
                </div>
                <div>
                  <strong className="block mb-1 font-mono uppercase">Billed To (Buyer):</strong>
                  <p className="font-semibold">{invoiceData.buyer?.name}</p>
                  <p>Phone: {invoiceData.buyer?.phone}</p>
                  <p>{invoiceData.buyer?.shippingAddress?.address}</p>
                  <p>{invoiceData.buyer?.shippingAddress?.city}, {invoiceData.buyer?.shippingAddress?.state} - {invoiceData.buyer?.shippingAddress?.pincode}</p>
                  <p className="mt-1">Place of Supply: <strong>{invoiceData.buyer?.placeOfSupply}</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs mb-4 border">
                <thead className="bg-muted border-b font-mono">
                  <tr>
                    <th className="p-2 text-left">Item Description</th>
                    <th className="p-2 text-center">HSN</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems?.map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 text-center font-mono">{item.hsn}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">{formatINR(item.unitPrice)}</td>
                      <td className="p-2 text-right font-mono">{formatINR(item.itemTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax & Total Summary */}
              <div className="flex justify-between items-start text-xs border-t pt-3">
                <div className="space-y-1">
                  <p>HSN Code: <strong>9503</strong> (Toys & Educational Games)</p>
                  <p>CGST (9%): <strong>{formatINR(invoiceData.pricingBreakdown?.cgst)}</strong></p>
                  <p>SGST (9%): <strong>{formatINR(invoiceData.pricingBreakdown?.sgst)}</strong></p>
                  <p>Total GST (18%): <strong>{formatINR(invoiceData.pricingBreakdown?.totalGst)}</strong></p>
                  <p className="text-muted mt-2">Payment Mode: {invoiceData.paymentDetails?.mode} ({invoiceData.paymentDetails?.status})</p>
                </div>
                <div className="text-right space-y-1 font-mono">
                  <p>Taxable Subtotal: {formatINR(invoiceData.pricingBreakdown?.taxableSubtotal)}</p>
                  <p>Total Tax: {formatINR(invoiceData.pricingBreakdown?.totalGst)}</p>
                  <p>Delivery Fee: {invoiceData.pricingBreakdown?.shippingFee === 0 ? 'FREE' : formatINR(invoiceData.pricingBreakdown?.shippingFee)}</p>
                  <p className="text-base font-bold pt-2 border-t font-sans">
                    Grand Total: {formatINR(invoiceData.pricingBreakdown?.grandTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Tax Invoice
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowInvoiceModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4x6" Thermal Dispatch Shipping Label Modal */}
        {showLabelModal && selectedOrder && (
          <div className="modal-backdrop" onClick={() => setShowLabelModal(false)}>
            <div className="modal-card card animate-fade-in max-w-md bg-white p-6 border-2 border-dashed border-gray-400 font-mono" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-3 mb-3">
                <div className="flex items-center gap-1 font-bold text-sm">
                  <Truck size={18} />
                  <span>{selectedOrder.shippingProvider?.toUpperCase() || 'DELHIVERY'} EXPRESS</span>
                </div>
                <span className="border border-black px-2 py-0.5 text-xs font-bold">
                  {selectedOrder.paymentMethod.includes('Cash on Delivery') ? 'COD : ' + formatINR(selectedOrder.total) : 'PREPAID'}
                </span>
              </div>

              {/* Barcode Mock */}
              <div className="text-center my-3 p-2 bg-gray-100 border">
                <div className="text-2xl font-bold tracking-widest font-mono select-none">
                  ||||| | |||| ||| ||||||| |||| |
                </div>
                <span className="text-xs font-mono font-bold">{selectedOrder.trackingNumber || 'DELHIVERY-9984102'}</span>
              </div>

              {/* Routing & Pin */}
              <div className="grid grid-cols-2 gap-2 text-xs border p-2 mb-3">
                <div>
                  <span className="text-gray-500 block">ROUTING PIN:</span>
                  <strong className="text-lg font-bold">{selectedOrder.shippingAddress?.pincode}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">STATE / HUB:</span>
                  <strong className="text-base font-bold">{selectedOrder.shippingAddress?.state?.slice(0, 3).toUpperCase()}</strong>
                </div>
              </div>

              {/* Deliver To */}
              <div className="text-xs mb-3 space-y-0.5">
                <strong className="block text-gray-500">SHIP TO (RECIPIENT):</strong>
                <p className="font-bold text-sm">{selectedOrder.customer?.name}</p>
                <p>{selectedOrder.shippingAddress?.address}</p>
                <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}</p>
                <p>Phone: {selectedOrder.customer?.phone}</p>
              </div>

              {/* Return Address */}
              <div className="text-[10px] text-gray-500 border-t pt-2 space-y-0.5">
                <strong>RETURN IF UNDELIVERED TO:</strong>
                <p>ToyVerse India Warehouse Hub, #42 Koramangala 4th Block, Bengaluru, KA - 560034</p>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t pt-3 font-sans">
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Label (4x6")
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowLabelModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
