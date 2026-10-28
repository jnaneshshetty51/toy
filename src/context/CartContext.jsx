import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// India Free Delivery Threshold
export const FREE_SHIPPING_THRESHOLD_INR = 999;
export const STANDARD_SHIPPING_FEE_INR = 79;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('toyverse_cart_inr');
      return saved ? JSON.parse(saved) : [
        {
          id: "toy-1",
          name: "CyberBot 3000 Programmable STEM Robot",
          price: 4999,
          originalPrice: 6499,
          quantity: 1,
          image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
          category: "STEM & Learning"
        }
      ];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(['toy-1', 'toy-6']);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Save cart
  useEffect(() => {
    try {
      localStorage.setItem('toyverse_cart_inr', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Sync wishlist from API
  useEffect(() => {
    api.wishlist.get()
      .then(ids => {
        if (ids && ids.length) setWishlist(ids);
      })
      .catch(() => {});
  }, []);

  const addToCart = (toy, quantity = 1) => {
    setCart(prev => {
      const itemKey = toy.sku || (toy.variantName ? `${toy.id}-${toy.variantName}` : toy.id);
      const existingIndex = prev.findIndex(item => {
        const key = item.key || item.sku || (item.variantName ? `${item.id}-${item.variantName}` : item.id);
        return key === itemKey;
      });

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + Number(quantity) }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: toy.id,
            key: itemKey,
            sku: toy.sku || `TY-${toy.id}`,
            variantName: toy.variantName || null,
            name: toy.name,
            price: Number(toy.price),
            originalPrice: Number(toy.originalPrice || toy.price),
            image: (toy.images && toy.images[0]) || toy.image || '',
            category: toy.category,
            brand: toy.brand,
            quantity: Number(quantity)
          }
        ];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (itemKeyOrId) => {
    setCart(prev => prev.filter(item => {
      const key = item.key || item.sku || (item.variantName ? `${item.id}-${item.variantName}` : item.id);
      return key !== itemKeyOrId && item.id !== itemKeyOrId;
    }));
  };

  const updateQuantity = (itemKeyOrId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemKeyOrId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        const key = item.key || item.sku || (item.variantName ? `${item.id}-${item.variantName}` : item.id);
        return (key === itemKeyOrId || item.id === itemKeyOrId) ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Wishlist
  const toggleWishlist = async (toyId) => {
    // Optimistic UI update
    setWishlist(prev =>
      prev.includes(toyId) ? prev.filter(id => id !== toyId) : [...prev, toyId]
    );

    try {
      const res = await api.wishlist.toggle(toyId);
      if (res.wishlist) {
        setWishlist(res.wishlist);
      }
    } catch {
      // Fallback local storage
    }
  };

  const isInWishlist = (toyId) => wishlist.includes(toyId);

  // Calculations in INR (₹)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = Math.round(
    cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  );

  let discountAmount = 0;
  let freeShippingByCoupon = false;

  if (appliedCoupon) {
    if (appliedCoupon.discountAmount) {
      discountAmount = appliedCoupon.discountAmount;
    } else if (appliedCoupon.discountPercent) {
      discountAmount = Math.round((cartSubtotal * appliedCoupon.discountPercent) / 100);
    }
    if (appliedCoupon.freeShipping) {
      freeShippingByCoupon = true;
    }
  }

  const shippingFee = (cartSubtotal >= FREE_SHIPPING_THRESHOLD_INR || freeShippingByCoupon || cartSubtotal === 0)
    ? 0
    : STANDARD_SHIPPING_FEE_INR;

  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);

  const applyCoupon = async (code) => {
    setCouponError('');
    try {
      const res = await api.coupons.validate(code, cartSubtotal);
      if (res.valid) {
        setAppliedCoupon(res.coupon);
        return { success: true, message: res.message };
      } else {
        setCouponError(res.message);
        return { success: false, message: res.message };
      }
    } catch (err) {
      const msg = err.message || 'Invalid coupon code';
      setCouponError(msg);
      return { success: false, message: msg };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        shippingFee,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD_INR,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        couponError,
        discountAmount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
        wishlist,
        toggleWishlist,
        isInWishlist
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
