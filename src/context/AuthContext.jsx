import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEFAULT_DEMO_USER = {
  id: 'user-cust-1',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+91 98450 12345',
  role: 'customer',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  rewardsPoints: 580
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('toyverse_jwt_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('toyverse_user_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load user profile & addresses on mount or when token changes
  useEffect(() => {
    if (token) {
      api.auth.getMe()
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('toyverse_user_data', JSON.stringify(data.user));
          }
        })
        .catch(err => {
          console.warn('Token validation failed:', err.message);
        });

      api.addresses.getAll()
        .then(addrs => setAddresses(addrs || []))
        .catch(() => {});
    }
  }, [token]);

  // Login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res.token && res.user) {
        localStorage.setItem('toyverse_jwt_token', res.token);
        localStorage.setItem('toyverse_user_data', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        // Load addresses
        try {
          const addrs = await api.addresses.getAll();
          setAddresses(addrs || []);
        } catch {}
      }
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.auth.register(userData);
      if (res.token && res.user) {
        localStorage.setItem('toyverse_jwt_token', res.token);
        localStorage.setItem('toyverse_user_data', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
      }
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('toyverse_jwt_token');
    localStorage.removeItem('toyverse_user_data');
    setToken(null);
    setUser(null);
    setAddresses([]);
  };

  // 1-Click Demo Login (Customer vs Admin)
  const quickDemoLogin = async (targetRole = 'customer') => {
    const creds = targetRole === 'admin'
      ? { email: 'admin@toyverse.in', password: 'Admin@123' }
      : { email: 'aarav.sharma@example.com', password: 'Customer@123' };

    return login(creds.email, creds.password);
  };

  // Profile Update
  const updateProfile = async (profileData) => {
    try {
      const res = await api.auth.updateProfile(profileData);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('toyverse_user_data', JSON.stringify(res.user));
      }
      return res.user;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Addresses
  const saveAddress = async (addressData) => {
    try {
      const res = await api.addresses.save(addressData);
      const updated = await api.addresses.getAll();
      setAddresses(updated || []);
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteAddress = async (id) => {
    try {
      await api.addresses.delete(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const role = user?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isAdmin: role === 'admin',
        isCustomer: role === 'customer',
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        register,
        logout,
        quickDemoLogin,
        updateProfile,
        addresses,
        saveAddress,
        deleteAddress
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
