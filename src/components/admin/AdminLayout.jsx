import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Tag, 
  Users, 
  ExternalLink, 
  ShieldCheck, 
  Layers,
  Award,
  Megaphone,
  MessageSquare,
  Send,
  Truck,
  Database,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import './AdminLayout.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'customers';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toys = StorageService.getToys();
  const orders = StorageService.getOrders();

  const lowStockCount = toys.filter(t => t.stock <= 5).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Placed' || o.status === 'Processing').length;

  const navSections = [
    {
      heading: 'Operations',
      items: [
        { path: '/admin', label: 'Overview & KPIs', icon: LayoutDashboard },
        { path: '/admin/products', label: 'Products & Catalog', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : null, badgeType: 'warning' },
        { path: '/admin/orders', label: 'Orders & Dispatch', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} new` : null, badgeType: 'primary' },
      ]
    },
    {
      heading: 'Merchandising',
      items: [
        { path: '/admin/operations?tab=categories', tabKey: 'categories', label: 'Categories Taxonomy', icon: Layers },
        { path: '/admin/operations?tab=brands', tabKey: 'brands', label: 'Brands & GI Crafts', icon: Award },
        { path: '/admin/coupons', label: 'Coupons & Promos', icon: Tag },
        { path: '/admin/operations?tab=banners', tabKey: 'banners', label: 'Store Banners CMS', icon: Megaphone }
      ]
    },
    {
      heading: 'Customers & Moderation',
      items: [
        { path: '/admin/operations?tab=customers', tabKey: 'customers', label: 'Customers & Staff', icon: Users },
        { path: '/admin/operations?tab=reviews', tabKey: 'reviews', label: 'Review Moderation', icon: MessageSquare }
      ]
    },
    {
      heading: 'Marketing & Settings',
      items: [
        { path: '/admin/operations?tab=marketing', tabKey: 'marketing', label: 'Abandoned Cart & SMS', icon: Send },
        { path: '/admin/operations?tab=shipping', tabKey: 'shipping', label: 'Shipping Rules & PINs', icon: Truck },
        { path: '/admin/operations?tab=system', tabKey: 'system', label: 'System & Backups', icon: Database }
      ]
    }
  ];

  const isItemActive = (item) => {
    if (item.tabKey) {
      return location.pathname === '/admin/operations' && currentTab === item.tabKey;
    }
    return location.pathname === item.path && !location.search;
  };

  return (
    <div className="admin-layout-root animate-fade-in">
      <div className="admin-container">
        {/* Mobile Navigation Bar for Admin on Small Screens */}
        <div className="admin-mobile-topbar">
          <div className="admin-mobile-brand">
            <span style={{ fontSize: '1.2rem' }}>🧸</span>
            <span className="admin-mobile-title">Admin Console</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm admin-mobile-toggle-btn"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle admin navigation menu"
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            <span>{mobileNavOpen ? 'Close Menu' : 'Admin Menu'}</span>
          </button>
        </div>

        {/* Admin Sidebar */}
        <aside className={`admin-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <div className="admin-brand-box">
            <div className="admin-badge-icon">
              <span style={{ fontSize: '1.25rem' }}>🧸</span>
            </div>
            <div>
              <h2 className="admin-brand-title">Admin Console</h2>
              <span className="admin-brand-sub">ToyVerse Control Center</span>
            </div>
          </div>

          <nav className="admin-nav-menu">
            {navSections.map((section, idx) => (
              <div key={idx} className="admin-nav-section">
                <span className="admin-nav-heading">{section.heading}</span>
                <div className="admin-section-items">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = isItemActive(item);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileNavOpen(false)}
                        className={`admin-nav-link ${active ? 'active' : ''}`}
                      >
                        <div className="admin-link-left">
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`admin-nav-pill ${item.badgeType}`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <Link to="/" className="btn btn-outline btn-sm btn-block preview-store-btn" onClick={() => setMobileNavOpen(false)}>
              <span>View Storefront</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </aside>

        {/* Admin Content Area */}
        <main className="admin-main-stage">
          {children}
        </main>
      </div>
    </div>
  );
}
