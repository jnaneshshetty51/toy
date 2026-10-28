const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('toyverse_jwt_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Indian Rupee Currency Formatter
export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export const api = {
  // Auth API
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
    getMe: () => request('/auth/me'),
    updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
    sendVerification: () => request('/auth/send-verification', { method: 'POST' }),
    verifyAccount: (code) => request('/auth/verify', { method: 'POST', body: JSON.stringify({ code }) }),
    exportData: () => request('/auth/export-data'),
    deleteAccount: () => request('/auth/account', { method: 'DELETE' }),
    getDemoAccounts: () => request('/auth/demo-accounts')
  },

  // Products API
  products: {
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, v);
        }
      });
      const qs = searchParams.toString();
      return request(`/products${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => request(`/products/${id}`),
    create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    adjustStock: (id, delta) => request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
    addReview: (id, review) => request(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(review) }),
    bulkImport: (payload) => request('/products/bulk-import', { method: 'POST', body: JSON.stringify(payload) }),
    getAutocomplete: (query) => request(`/products/autocomplete?q=${encodeURIComponent(query)}`),
    getBrands: () => request('/products/meta/brands')
  },

  // Orders API
  orders: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/orders${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => request(`/orders/${id}`),
    getInvoice: (id) => request(`/orders/${id}/invoice`),
    validate: (items) => request('/orders/validate', { method: 'POST', body: JSON.stringify({ items }) }),
    create: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    updateShipping: (id, data) => request(`/orders/${id}/shipping`, { method: 'PATCH', body: JSON.stringify(data) }),
    cancel: (id, reason) => request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    requestReturn: (id, data) => request(`/orders/${id}/return`, { method: 'POST', body: JSON.stringify(data) }),
    refund: (id, data) => request(`/orders/${id}/refund`, { method: 'POST', body: JSON.stringify(data) })
  },

  // Payments API
  payments: {
    getMethods: () => request('/payments/methods'),
    verify: (data) => request('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),
    simulateFailure: () => request('/payments/simulate-failure', { method: 'POST' }),
    sendWebhook: (payload) => request('/payments/webhook', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Coupons API
  coupons: {
    getAll: () => request('/coupons'),
    validate: (code, cartSubtotal) => request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, cartSubtotal }) }),
    create: (couponData) => request('/coupons', { method: 'POST', body: JSON.stringify(couponData) }),
    toggle: (code) => request(`/coupons/${code}/toggle`, { method: 'PATCH' })
  },

  // Addresses API
  addresses: {
    getAll: () => request('/addresses'),
    save: (addressData) => request('/addresses', { method: 'POST', body: JSON.stringify(addressData) }),
    delete: (id) => request(`/addresses/${id}`, { method: 'DELETE' })
  },

  // Wishlist API
  wishlist: {
    get: () => request('/wishlist'),
    toggle: (productId) => request('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ productId }) })
  },

  // Admin Stats
  stats: {
    get: () => request('/admin/stats')
  },

  // Business Operations & Marketing
  operations: {
    getCustomers: () => request('/admin/operations/customers'),
    updateCustomerRole: (id, role) => request(`/admin/operations/customers/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    getReviews: () => request('/admin/operations/reviews'),
    verifyReview: (id) => request(`/admin/operations/reviews/${id}/verify`, { method: 'PATCH' }),
    deleteReview: (id) => request(`/admin/operations/reviews/${id}`, { method: 'DELETE' }),
    getBanners: () => request('/admin/operations/banners'),
    getAllBanners: () => request('/admin/operations/banners/all'),
    createBanner: (data) => request('/admin/operations/banners', { method: 'POST', body: JSON.stringify(data) }),
    toggleBanner: (id) => request(`/admin/operations/banners/${id}/toggle`, { method: 'PATCH' }),
    deleteBanner: (id) => request(`/admin/operations/banners/${id}`, { method: 'DELETE' }),
    getCategories: () => request('/admin/operations/categories'),
    createCategory: (data) => request('/admin/operations/categories', { method: 'POST', body: JSON.stringify(data) }),
    getBrands: () => request('/admin/operations/brands'),
    getShippingRules: () => request('/admin/operations/shipping-rules'),
    updateShippingRules: (data) => request('/admin/operations/shipping-rules', { method: 'PATCH', body: JSON.stringify(data) }),
    triggerCartRecovery: () => request('/admin/operations/marketing/abandoned-cart-campaign', { method: 'POST' }),
    sendTransactional: (data) => request('/admin/operations/marketing/send-transactional', { method: 'POST', body: JSON.stringify(data) }),
    createBackup: () => request('/admin/operations/backup', { method: 'POST' }),
    getBackups: () => request('/admin/operations/backups'),
    getSystemStatus: () => request('/admin/operations/system-status')
  },

  // Shipping & Logistics API
  shipping: {
    checkServiceability: (pincode) => request(`/shipping/serviceability?pincode=${encodeURIComponent(pincode)}`),
    generateAwb: (data) => request('/shipping/generate-awb', { method: 'POST', body: JSON.stringify(data) }),
    syncStatus: (data) => request('/shipping/sync-status', { method: 'POST', body: JSON.stringify(data) })
  },

  // Autonomous UPI Gateway & Reconciliation Engine (₹0 to run)
  upi: {
    createOrder: (data) => request('/upi/orders', { method: 'POST', body: JSON.stringify(data) }),
    getOrderStatus: (ref) => request(`/orders/${ref}`),
    getAdminStatus: () => request('/upi/admin/status'),
    getAdminOrders: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/upi/admin/orders${q ? `?${q}` : ''}`);
    },
    getAdminEvents: () => request('/upi/admin/events'),
    confirmOrder: (ref) => request(`/upi/admin/orders/${ref}/confirm`, { method: 'POST' }),
    refundOrder: (ref, reason) => request(`/upi/admin/orders/${ref}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }),
    triggerReconcile: () => request('/upi/admin/reconcile', { method: 'POST' }),
    simulateWebhook: (payload) => request('/upi/admin/simulate-webhook', { method: 'POST', body: JSON.stringify(payload) }),
    sendHeartbeat: (data) => request('/webhooks/heartbeat', { method: 'POST', body: JSON.stringify(data) })
  }
};
