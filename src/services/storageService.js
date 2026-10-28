import { INITIAL_TOYS, INITIAL_COUPONS, INITIAL_ORDERS } from '../data/mockToys';

const STORAGE_KEYS = {
  TOYS: 'toyverse_products',
  ORDERS: 'toyverse_orders',
  COUPONS: 'toyverse_coupons',
  WISHLIST: 'toyverse_wishlist',
  USER_PROFILE: 'toyverse_user_profile',
  ADDRESSES: 'toyverse_addresses'
};

const DEFAULT_PROFILE = {
  name: "Alex Mercer",
  email: "alex.mercer@example.com",
  phone: "+1 (555) 349-2810",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  memberSince: "October 2024",
  rewardsPoints: 480
};

const DEFAULT_ADDRESSES = [
  {
    id: "addr-1",
    label: "Home (Default)",
    fullName: "Alex Mercer",
    street: "742 Evergreen Terrace",
    city: "Springfield",
    state: "OR",
    zip: "97477",
    phone: "+1 (555) 349-2810",
    isDefault: true
  },
  {
    id: "addr-2",
    label: "Grandparents' House (Gifts)",
    fullName: "Eleanor Mercer",
    street: "404 Blueberry Hill Ln",
    city: "Portland",
    state: "OR",
    zip: "97201",
    phone: "+1 (555) 892-3341",
    isDefault: false
  }
];

// Helper to safely get & set JSON in localStorage
function getItem(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// Service API
export const StorageService = {
  // --- TOYS / PRODUCTS ---
  getToys() {
    const stored = getItem(STORAGE_KEYS.TOYS, null);
    if (!stored || !stored.length) {
      setItem(STORAGE_KEYS.TOYS, INITIAL_TOYS);
      return INITIAL_TOYS;
    }
    return stored;
  },

  getToyById(id) {
    const toys = this.getToys();
    return toys.find(t => t.id === id) || null;
  },

  saveToy(toyData) {
    const toys = this.getToys();
    const index = toys.findIndex(t => t.id === toyData.id);
    let updated;
    if (index >= 0) {
      updated = [...toys];
      updated[index] = { ...updated[index], ...toyData };
    } else {
      const newToy = {
        ...toyData,
        id: `toy-${Date.now()}`,
        sku: toyData.sku || `TY-${Math.floor(1000 + Math.random() * 9000)}`,
        rating: toyData.rating || 5.0,
        reviewsCount: toyData.reviewsCount || 0,
        reviews: toyData.reviews || []
      };
      updated = [newToy, ...toys];
    }
    setItem(STORAGE_KEYS.TOYS, updated);
    return updated;
  },

  deleteToy(id) {
    const toys = this.getToys().filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TOYS, toys);
    return toys;
  },

  adjustStock(id, newStock) {
    const toys = this.getToys();
    const updated = toys.map(t => t.id === id ? { ...t, stock: Math.max(0, newStock) } : t);
    setItem(STORAGE_KEYS.TOYS, updated);
    return updated;
  },

  addReview(toyId, review) {
    const toys = this.getToys();
    const updated = toys.map(t => {
      if (t.id === toyId) {
        const reviews = [
          {
            id: `rev-${Date.now()}`,
            user: review.user || "Happy Parent",
            rating: Number(review.rating),
            date: new Date().toISOString().split('T')[0],
            comment: review.comment,
            verified: true
          },
          ...(t.reviews || [])
        ];
        const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        return {
          ...t,
          reviews,
          reviewsCount: reviews.length,
          rating: Number(avg.toFixed(1))
        };
      }
      return t;
    });
    setItem(STORAGE_KEYS.TOYS, updated);
    return updated;
  },

  // --- ORDERS ---
  getOrders() {
    const stored = getItem(STORAGE_KEYS.ORDERS, null);
    if (!stored || !stored.length) {
      setItem(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    return stored;
  },

  createOrder(orderData) {
    const orders = this.getOrders();
    const newOrder = {
      ...orderData,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Placed',
      trackingNumber: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`
    };
    const updatedOrders = [newOrder, ...orders];
    setItem(STORAGE_KEYS.ORDERS, updatedOrders);

    // Also deduct stock from products
    if (orderData.items && orderData.items.length) {
      const toys = this.getToys();
      const updatedToys = toys.map(toy => {
        const purchased = orderData.items.find(i => i.id === toy.id);
        if (purchased) {
          return { ...toy, stock: Math.max(0, toy.stock - purchased.quantity) };
        }
        return toy;
      });
      setItem(STORAGE_KEYS.TOYS, updatedToys);
    }

    return newOrder;
  },

  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setItem(STORAGE_KEYS.ORDERS, updated);
    return updated;
  },

  // --- COUPONS ---
  getCoupons() {
    const stored = getItem(STORAGE_KEYS.COUPONS, null);
    if (!stored || !stored.length) {
      setItem(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
      return INITIAL_COUPONS;
    }
    return stored;
  },

  validateCoupon(code, cartTotal) {
    if (!code) return { valid: false, message: "Enter coupon code" };
    const coupons = this.getCoupons();
    const found = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active);
    if (!found) {
      return { valid: false, message: "Invalid or expired coupon code" };
    }
    if (found.minSpend && cartTotal < found.minSpend) {
      return { valid: false, message: `Minimum spend of $${found.minSpend} required` };
    }
    return { valid: true, coupon: found };
  },

  createCoupon(coupon) {
    const coupons = this.getCoupons();
    const updated = [{ ...coupon, active: true }, ...coupons];
    setItem(STORAGE_KEYS.COUPONS, updated);
    return updated;
  },

  toggleCoupon(code) {
    const coupons = this.getCoupons();
    const updated = coupons.map(c => c.code === code ? { ...c, active: !c.active } : c);
    setItem(STORAGE_KEYS.COUPONS, updated);
    return updated;
  },

  // --- WISHLIST ---
  getWishlist() {
    return getItem(STORAGE_KEYS.WISHLIST, ["toy-1", "toy-6"]);
  },

  toggleWishlist(toyId) {
    const list = this.getWishlist();
    let updated;
    if (list.includes(toyId)) {
      updated = list.filter(id => id !== toyId);
    } else {
      updated = [...list, toyId];
    }
    setItem(STORAGE_KEYS.WISHLIST, updated);
    return updated;
  },

  // --- USER PROFILE & ADDRESSES ---
  getUserProfile() {
    return getItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_PROFILE);
  },

  updateUserProfile(profileData) {
    const updated = { ...this.getUserProfile(), ...profileData };
    setItem(STORAGE_KEYS.USER_PROFILE, updated);
    return updated;
  },

  getAddresses() {
    return getItem(STORAGE_KEYS.ADDRESSES, DEFAULT_ADDRESSES);
  },

  saveAddress(address) {
    const addresses = this.getAddresses();
    let updated;
    if (address.id) {
      updated = addresses.map(a => a.id === address.id ? { ...a, ...address } : a);
    } else {
      const newAddr = {
        ...address,
        id: `addr-${Date.now()}`,
        isDefault: addresses.length === 0 ? true : address.isDefault || false
      };
      if (newAddr.isDefault) {
        updated = [newAddr, ...addresses.map(a => ({ ...a, isDefault: false }))];
      } else {
        updated = [...addresses, newAddr];
      }
    }
    setItem(STORAGE_KEYS.ADDRESSES, updated);
    return updated;
  },

  deleteAddress(id) {
    const addresses = this.getAddresses().filter(a => a.id !== id);
    setItem(STORAGE_KEYS.ADDRESSES, addresses);
    return addresses;
  },

  // --- RESET ALL DATA ---
  resetAll() {
    setItem(STORAGE_KEYS.TOYS, INITIAL_TOYS);
    setItem(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    setItem(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
    setItem(STORAGE_KEYS.WISHLIST, ["toy-1", "toy-6"]);
    setItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_PROFILE);
    setItem(STORAGE_KEYS.ADDRESSES, DEFAULT_ADDRESSES);
  }
};
