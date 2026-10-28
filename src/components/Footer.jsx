import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  HeartHandshake, 
  Send, 
  Sparkles,
  CheckCircle2,
  Blocks,
  Atom,
  Smile,
  Car,
  Gamepad2,
  Crown,
  PackageSearch,
  Heart,
  MapPin,
  BadgePercent,
  Headphones,
  Phone,
  Mail,
  QrCode,
  Smartphone,
  CreditCard,
  Landmark,
  Banknote,
  Lock,
  Award,
  MessageCircle,
  FileText,
  FileCheck
} from 'lucide-react';
import { formatINR } from '../services/api';
import { FREE_SHIPPING_THRESHOLD_INR } from '../context/CartContext';
import './Footer.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="footer-root">
      {/* Value Proposition Highlights (India) */}
      <div className="footer-perks-section">
        <div className="container perks-grid">
          <div className="perk-card">
            <div className="perk-icon-wrap perk-truck">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="perk-title">Free Express Shipping</h4>
              <p className="perk-desc">Fast 2-4 day delivery across India on orders over {formatINR(FREE_SHIPPING_THRESHOLD_INR)}</p>
            </div>
          </div>

          <div className="perk-card">
            <div className="perk-icon-wrap perk-shield">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="perk-title">100% BIS Certified Child-Safe</h4>
              <p className="perk-desc">Non-toxic, lab-tested, conforming to IS-9873 Indian Standards</p>
            </div>
          </div>

          <div className="perk-card">
            <div className="perk-icon-wrap perk-rotate">
              <RotateCcw size={24} />
            </div>
            <div>
              <h4 className="perk-title">Hassle-Free 30-Day Returns</h4>
              <p className="perk-desc">Free doorstep reverse pickup across 19,000+ Indian pincodes</p>
            </div>
          </div>

          <div className="perk-card">
            <div className="perk-icon-wrap perk-gift">
              <HeartHandshake size={24} />
            </div>
            <div>
              <h4 className="perk-title">Free Festive Packaging</h4>
              <p className="perk-desc">Custom greeting card & tamper-evident safety packaging</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="container footer-grid">
          {/* Brand Info & Contacts */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-icon">🧸</span>
              <div className="footer-logo-text">
                <span className="brand-title">ToyVerse <span className="text-coral">India</span></span>
                <span className="brand-tagline">Wonder • Play • Learn</span>
              </div>
            </Link>
            <p className="footer-bio">
              India's premier toy wonderland! Curating child-safe, high-precision STEM sets, ISRO space kits, building bricks, and GI-certified heritage wooden craft conforming to strict BIS IS-9873 standards.
            </p>

            {/* Direct Contact Details */}
            <div className="footer-contact-block">
              <div className="footer-contact-item">
                <Phone size={14} className="footer-contact-icon text-coral" />
                <span>+91 98450 12345 (Mon–Sat, 9AM–8PM IST)</span>
              </div>
              <div className="footer-contact-item">
                <Mail size={14} className="footer-contact-icon text-amber" />
                <span>care@toyverse.in</span>
              </div>
              <div className="footer-contact-item">
                <MapPin size={14} className="footer-contact-icon text-teal" />
                <span>Koramangala 4th Block, Bengaluru, KA 560034</span>
              </div>
            </div>

            {/* Social Channel Links */}
            <div className="footer-social-row">
              <a href="https://wa.me/919845012345" target="_blank" rel="noopener noreferrer" className="social-icon-btn whatsapp" title="WhatsApp Support">
                <MessageCircle size={16} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn instagram" title="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn facebook" title="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn youtube" title="YouTube">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn twitter" title="X / Twitter">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="footer-badges-row">
              <span className="footer-pill-tag">
                <Award size={13} className="text-amber mr-1" />
                <span>Made in India</span>
              </span>
              <span className="footer-pill-tag">
                <ShieldCheck size={13} className="text-teal mr-1" />
                <span>BIS IS-9873 Certified</span>
              </span>
            </div>
          </div>

          {/* Categories with Icons */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Shop by Category</h4>
            <ul className="footer-link-list">
              <li>
                <Link to="/shop?category=LEGO+%26+Building">
                  <Blocks size={15} className="footer-link-icon text-amber" />
                  <span>LEGO & Building Bricks</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=STEM+%26+Learning">
                  <Atom size={15} className="footer-link-icon text-teal" />
                  <span>STEM & Science Kits</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Plush+%26+Soft+Toys">
                  <Smile size={15} className="footer-link-icon text-coral" />
                  <span>Huggable Soft Toys & Plushies</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=RC+Vehicles+%26+Drones">
                  <Car size={15} className="footer-link-icon text-blue" />
                  <span>RC Vehicles & Drones</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Board+Games+%26+Puzzles">
                  <Gamepad2 size={15} className="footer-link-icon text-purple" />
                  <span>Heritage Board Games & Puzzles</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Dolls+%26+Playsets">
                  <Crown size={15} className="footer-link-icon text-pink" />
                  <span>Dollhouses & Playsets</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links with Icons */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Parent & Kid Care</h4>
            <ul className="footer-link-list">
              <li>
                <Link to="/account/orders">
                  <PackageSearch size={15} className="footer-link-icon text-blue" />
                  <span>Track Live Courier Order</span>
                </Link>
              </li>
              <li>
                <Link to="/account/wishlist">
                  <Heart size={15} className="footer-link-icon text-coral" />
                  <span>My Saved Wishlist</span>
                </Link>
              </li>
              <li>
                <Link to="/account/addresses">
                  <MapPin size={15} className="footer-link-icon text-teal" />
                  <span>Saved Delivery Addresses</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?deals=true">
                  <BadgePercent size={15} className="footer-link-icon text-amber" />
                  <span>Diwali & Birthday Offers</span>
                </Link>
              </li>
              <li>
                <Link to="/bis-certification">
                  <FileCheck size={15} className="footer-link-icon text-green" />
                  <span>BIS Safety Standards</span>
                </Link>
              </li>
              <li>
                <a href="tel:+919845012345">
                  <Headphones size={15} className="footer-link-icon text-purple" />
                  <span>24/7 Helpline & Support</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Box & Payment Methods */}
          <div className="footer-newsletter-col">
            <h4 className="footer-col-title">Join ToyVerse Club! 🎈</h4>
            <p className="newsletter-desc">
              Subscribe to unlock 15% off your first order, festive early-bird access, and exclusive STEM release alerts.
            </p>

            {subscribed ? (
              <div className="newsletter-success">
                <CheckCircle2 size={20} className="text-teal" />
                <span>You're in! Use coupon <strong>FIRST10</strong> at checkout for 10% off.</span>
              </div>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="newsletter-input"
                />
                <button type="submit" className="newsletter-btn" aria-label="Subscribe to newsletter">
                  <Send size={16} />
                </button>
              </form>
            )}

            {/* Bank Grade Security Assurance */}
            <div className="footer-ssl-badge">
              <Lock size={14} className="text-teal" />
              <span>256-Bit SSL Bank-Grade Safe Checkout</span>
            </div>

            {/* Payment Method Badges with Icons */}
            <div className="payment-icons-row">
              <span className="payment-tag">
                <QrCode size={13} className="payment-icon text-amber" />
                <span>UPI / QR</span>
              </span>
              <span className="payment-tag">
                <Smartphone size={13} className="payment-icon text-teal" />
                <span>GPay • PhonePe</span>
              </span>
              <span className="payment-tag">
                <CreditCard size={13} className="payment-icon text-blue" />
                <span>RuPay • Cards</span>
              </span>
              <span className="payment-tag">
                <Landmark size={13} className="payment-icon text-purple" />
                <span>50+ Net Banks</span>
              </span>
              <span className="payment-tag">
                <Sparkles size={13} className="payment-icon text-green" />
                <span>Paytm • BHIM</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Certification Bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-flex">
          <p>© 2026 ToyVerse India Retail Pvt. Ltd. All rights reserved. Registered under Bureau of Indian Standards (BIS).</p>
          <div className="footer-legal-links">
            <Link to="/bis-certification">
              <ShieldCheck size={13} className="text-teal" />
              <span>BIS IS-9873 Standards</span>
            </Link>
            <span>•</span>
            <Link to="/privacy">
              <FileText size={13} className="text-amber" />
              <span>Privacy Policy (DPDP)</span>
            </Link>
            <span>•</span>
            <Link to="/terms">
              <FileText size={13} className="text-blue" />
              <span>Terms & GST Rules</span>
            </Link>
            <span>•</span>
            <Link to="/returns-policy">
              <RotateCcw size={13} className="text-coral" />
              <span>30-Day Returns</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

