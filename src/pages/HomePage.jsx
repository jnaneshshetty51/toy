import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgeIndianRupee,
  Sparkles,
  Star,
  Gift,
  Crown,
  Trophy,
  Zap,
  Car,
  Puzzle,
  Dices,
  Award,
  Target,
  Gamepad2,
  Layers,
  Heart,
  Boxes,
  Bot,
  Magnet,
  Package,
  Timer,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  Search,
  CheckCheck,
  Percent,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { api, formatINR } from '../services/api';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

const CATEGORY_ICON_MAP = {
  Crown,
  Trophy,
  Zap,
  Car,
  Gift,
  Puzzle,
  Dices,
  Award,
  Target,
  Gamepad2,
  Layers,
  Heart,
  Boxes,
  Sparkles,
  Bot,
  BadgeIndianRupee,
  Magnet,
  Package
};

// Curated Category Tiles with 3D Gradients, Custom Icons & Live Item Counts
const ALL_CATEGORIES = [
  {
    id: 'Pop Vinyl Figures',
    label: 'Pop Vinyl Figures',
    count: '513 Toys',
    iconName: 'Crown',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    accent: '#2563EB',
    featured: true
  },
  {
    id: 'Collectible Statues',
    label: 'Collectible Statues',
    count: '159 Toys',
    iconName: 'Trophy',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    accent: '#7C3AED',
    featured: true
  },
  {
    id: 'Action Figures',
    label: 'Action Figures',
    count: '138 Toys',
    iconName: 'Zap',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    bg: '#FFF7ED',
    border: '#FED7AA',
    accent: '#EA580C',
    featured: true
  },
  {
    id: 'Diecast Cars & Vehicles',
    label: 'Diecast Vehicles',
    count: '76 Toys',
    iconName: 'Car',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    accent: '#059669',
    featured: true
  },
  {
    id: 'Blind Boxes & Mystery Figures',
    label: 'Blind Boxes & Mystery',
    count: '73 Toys',
    iconName: 'Gift',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    accent: '#DB2777',
    featured: true
  },
  {
    id: 'Model Kits',
    label: 'Model Kits',
    count: '47 Toys',
    iconName: 'Puzzle',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    bg: '#FFFBEB',
    border: '#FDE68A',
    accent: '#D97706',
    featured: true
  },
  {
    id: 'Board Games & Puzzles',
    label: 'Board Games',
    count: '23 Toys',
    iconName: 'Dices',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    accent: '#4F46E5',
    featured: true
  },
  {
    id: 'Collectible Pins',
    label: 'Pins & Badges',
    count: '50 Toys',
    iconName: 'Award',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    accent: '#0891B2',
    featured: true
  },
  {
    id: 'Toy Blasters',
    label: 'Toy Blasters',
    count: '17 Toys',
    iconName: 'Target',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    bg: '#FEF2F2',
    border: '#FECACA',
    accent: '#DC2626',
    featured: true
  },
  {
    id: 'Gaming Accessories & Holders',
    label: 'Gaming Holders',
    count: '16 Toys',
    iconName: 'Gamepad2',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    bg: '#F0FDFA',
    border: '#99F6E4',
    accent: '#0D9488',
    featured: true
  },
  {
    id: 'Card Games',
    label: 'Card Games',
    count: '10 Toys',
    iconName: 'Layers',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
    bg: '#FFF1F2',
    border: '#FECDD3',
    accent: '#E11D48',
    featured: true
  },
  {
    id: 'Squishy Toys',
    label: 'Squishy Toys',
    count: '4 Toys',
    iconName: 'Heart',
    gradient: 'linear-gradient(135deg, #D946EF 0%, #C026D3 100%)',
    bg: '#FDF4FF',
    border: '#F5D0FE',
    accent: '#C026D3',
    featured: true
  },
  {
    id: 'Collectible Figures',
    label: 'Collectible Figures',
    count: '17 Toys',
    iconName: 'Boxes',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    accent: '#6D28D9',
    featured: false
  },
  {
    id: 'Advent Calendars',
    label: 'Advent Calendars',
    count: '3 Toys',
    iconName: 'Sparkles',
    gradient: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
    bg: '#FEFCE8',
    border: '#FEF08A',
    accent: '#CA8A04',
    featured: false
  },
  {
    id: 'Other Toys & Collectibles',
    label: 'Other Collectibles',
    count: '2 Toys',
    iconName: 'Bot',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    accent: '#475569',
    featured: false
  },
  {
    id: 'Collectible Gift Sets',
    label: 'Gift Sets',
    count: '1 Toy',
    iconName: 'Package',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    bg: '#FFF1F2',
    border: '#FECDD3',
    accent: '#E11D48',
    featured: false
  },
  {
    id: 'Collectible Magnets',
    label: 'Magnets',
    count: '1 Toy',
    iconName: 'Magnet',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    accent: '#0284C7',
    featured: false
  },
  {
    id: 'Gift Cards',
    label: 'Gift Cards',
    count: '1 Card',
    iconName: 'BadgeIndianRupee',
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    accent: '#047857',
    featured: false
  }
];

const AGE_BUBBLES = [
  { id: '0-2', label: '0–2', sub: 'years', emoji: '👶', color: 'pink' },
  { id: '3-5', label: '3–5', sub: 'years', emoji: '🐣', color: 'yellow' },
  { id: '6-8', label: '6–8', sub: 'years', emoji: '🚀', color: 'blue' },
  { id: '9-12', label: '9–12', sub: 'years', emoji: '🎮', color: 'mint' },
  { id: '12+', label: '12+', sub: 'years', emoji: '🧠', color: 'grape' }
];

// Top Brand Badges
const BRAND_SHOWCASE = [
  { name: 'Funko', count: '530+ Toys', desc: 'Pop! Vinyl Culture', gradient: 'linear-gradient(135deg, #2563EB, #1E40AF)', badge: 'Official Store' },
  { name: 'Banpresto', count: '146+ Toys', desc: 'Authentic Anime Statues', gradient: 'linear-gradient(135deg, #EC4899, #BE185D)', badge: '100% Japan Import' },
  { name: 'Pop Mart', count: '76+ Toys', desc: 'Designer Blind Boxes', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', badge: 'Art Collectibles' },
  { name: 'FiGPiN', count: '50+ Toys', desc: 'Hard Enamel Pins', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', badge: 'Serialized' },
  { name: 'Blokees', count: '47+ Toys', desc: 'Action Assembly Kits', gradient: 'linear-gradient(135deg, #10B981, #047857)', badge: 'Snap-Fit' },
  { name: 'Hasbro', count: '32+ Toys', desc: 'Marvel & Transformers', gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)', badge: 'Global Brand' },
  { name: 'Hot Wheels', count: '31+ Toys', desc: 'Diecast Metal Racers', gradient: 'linear-gradient(135deg, #F97316, #C2410C)', badge: 'Track Legends' },
  { name: 'Tomica', count: '28+ Toys', desc: 'Takara Tomy Vehicles', gradient: 'linear-gradient(135deg, #06B6D4, #0E7490)', badge: 'Precision Diecast' }
];

// Budget Tiers
const BUDGET_TIERS = [
  {
    label: 'Under ₹499',
    title: 'Pocket Money & Favours',
    desc: 'Fun keychains, mini figures & budget treats',
    tag: 'Budget Hero',
    maxPrice: 499,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: '🪙'
  },
  {
    label: 'Under ₹999',
    title: 'Return Gifts & Games',
    desc: 'Puzzles, board games, blind boxes & DIY sets',
    tag: 'Parents’ Choice',
    maxPrice: 999,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: '🎁'
  },
  {
    label: 'Under ₹1,999',
    title: 'Birthday Blockbusters',
    desc: 'Action figures, blasters & model assembly kits',
    tag: 'Top Gifting',
    maxPrice: 1999,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: '🚀'
  },
  {
    label: '₹2,999+',
    title: 'Collector & Grail Vault',
    desc: 'Scale anime statues, S.H. Figuarts & grails',
    tag: 'Grail Edition',
    sort: 'price_desc',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: '👑'
  }
];

// Verified Parent Testimonials
const VERIFIED_REVIEWS = [
  {
    id: 1,
    name: 'Priya Ramanathan',
    city: 'Bengaluru, Karnataka',
    role: 'Mother of 2 (Ages 4 & 7)',
    rating: 5,
    date: '2 days ago',
    title: 'Flawless packaging and 100% original!',
    comment: 'Ordered a Banpresto Demon Slayer figure and Hot Wheels 5-pack. Arrived in 48 hours bubble-wrapped like a bank vault. Zero crease on the collector box. My kids were over the moon!',
    tag: 'Verified Purchase'
  },
  {
    id: 2,
    name: 'Vikram Sengupta',
    city: 'Mumbai, Maharashtra',
    role: 'Collector & Uncle',
    rating: 5,
    date: '5 days ago',
    title: 'Best place in India for genuine Funko & Pop Mart',
    comment: 'Finding genuine imported Pop Mart blind boxes in India without crazy markups was impossible until ToyVerse. Fast COD checkout, instant WhatsApp tracking, and genuine BIS stickers.',
    tag: 'Verified Collector'
  },
  {
    id: 3,
    name: 'Aarav & Meera Kapoor',
    city: 'New Delhi, NCR',
    role: 'Parents of 6-year-old',
    rating: 5,
    date: '1 week ago',
    title: 'Diwali gifting sorted with zero stress',
    comment: 'Ordered return gifts for my son’s birthday party. The ₹999 return gift budget section was a life saver. Beautiful board games and model kits delivered together right on time.',
    tag: 'Verified Purchase'
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [toys, setToys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Live Flash Deals Countdown Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  // Interactive Gift Finder State
  const [finderAge, setFinderAge] = useState('all');
  const [finderCategory, setFinderCategory] = useState('all');
  const [finderBudget, setFinderBudget] = useState('all');

  // VIP Club Newsletter State
  const [vipEmail, setVipEmail] = useState('');
  const [vipClaimed, setVipClaimed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.products.getAll()
      .then(data => setToys(data || []))
      .catch(err => console.error('Failed to load toys:', err))
      .finally(() => setLoading(false));
  }, []);

  // Ticking Flash Sale Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 6, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const featuredToys = toys.filter(t => t.isFeatured).slice(0, 8);
  const bestSellers = toys.filter(t => t.isBestSeller).slice(0, 4);
  const newArrivals = toys.filter(t => t.isNewArrival).slice(0, 4);
  const trending = featuredToys.length ? featuredToys : toys.slice(0, 8);

  // Filter flash deal toys (significant discount or deals)
  const flashDeals = toys
    .filter(t => t.originalPrice && t.originalPrice > t.price)
    .sort((a, b) => ((b.originalPrice - b.price) / b.originalPrice) - ((a.originalPrice - a.price) / a.originalPrice))
    .slice(0, 4);

  const handleFinderSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (finderAge !== 'all') params.set('age', finderAge);
    if (finderCategory !== 'all') params.set('category', finderCategory);
    if (finderBudget !== 'all') params.set('maxPrice', finderBudget);
    navigate(`/shop?${params.toString()}`);
  };

  const handleVipSubmit = (e) => {
    e.preventDefault();
    if (!vipEmail || !vipEmail.includes('@')) return;
    setVipClaimed(true);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // silent fallback if canvas unsupported
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText('WELCOME250');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="home animate-fade-in">
      {/* ================= HERO ================= */}
      <section className="hero">
        <span className="hero-blob blob-1" aria-hidden="true" />
        <span className="hero-blob blob-2" aria-hidden="true" />
        <span className="hero-confetti c1" aria-hidden="true">⭐</span>
        <span className="hero-confetti c2" aria-hidden="true">🎈</span>
        <span className="hero-confetti c3" aria-hidden="true">✨</span>

        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-chip">
              <Sparkles size={16} /> Diwali Toy Fest is live!
            </span>
            <h1 className="hero-title">
              Where every day is
              <span className="hero-title-pop"> playtime! </span>
            </h1>
            <p className="hero-sub">
              Thousands of safe, BIS-certified toys for every age — from cuddly teddies
              to coding robots. Delivered to your doorstep across India.
            </p>

            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg" id="hero-shop-now">
                Shop All Toys <ArrowRight size={18} />
              </Link>
              <Link to="/shop?deals=true" className="btn btn-outline btn-lg" id="hero-deals">
                <Gift size={18} /> Today's Deals
              </Link>
            </div>

            <div className="hero-coupon">
              <span className="coupon-ticket">
                Use code <strong>DIWALI20</strong>
              </span>
              <span className="coupon-text">for 20% OFF + free delivery above ₹999</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-art-frame">
              <img
                src="/images/hero-toys.jpg"
                alt="A colourful collection of toys: teddy bear, rocket, robot, blocks and a toy car"
                className="hero-img"
                fetchPriority="high"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80";
                }}
              />
            </div>
            <div className="hero-sticker sticker-rating">
              <Star size={16} fill="#FFC83D" color="#FFC83D" />
              <div>
                <strong>4.8/5</strong>
                <span>50,000+ happy parents</span>
              </div>
            </div>
            <div className="hero-sticker sticker-safe">
              <ShieldCheck size={18} />
              <span>100% Child-Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST STRIP ================= */}
      <section className="trust-strip">
        <div className="container trust-grid">
          <div className="trust-item">
            <span className="trust-icon ti-blue"><Truck size={22} /></span>
            <div><strong>Free Delivery</strong><span>On orders above ₹999</span></div>
          </div>
          <div className="trust-item">
            <span className="trust-icon ti-mint"><ShieldCheck size={22} /></span>
            <div><strong>BIS Certified</strong><span>Safe, non-toxic toys</span></div>
          </div>
          <div className="trust-item">
            <span className="trust-icon ti-orange"><RotateCcw size={22} /></span>
            <div><strong>Easy Returns</strong><span>7-day hassle-free</span></div>
          </div>
          <div className="trust-item">
            <span className="trust-icon ti-pink"><BadgeIndianRupee size={22} /></span>
            <div><strong>Instant UPI</strong><span>GPay, PhonePe, Paytm</span></div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 1: LIVE FLASH SALE DEALS ================= */}
      <section className="home-section flash-deals-section">
        <div className="container">
          <div className="flash-banner-card">
            <div className="flash-banner-header">
              <div className="flash-header-left">
                <span className="flash-live-pill">
                  <span className="live-pulse-dot" />
                  <Flame size={16} className="flash-flame-icon" />
                  LIGHTNING FLASH SALE
                </span>
                <h2 className="flash-sale-title">Deals That Won't Last Long!</h2>
                <p className="flash-sale-sub">
                  Huge markdowns on authentic collector grails & trending blockbusters. While stocks last!
                </p>
              </div>

              <div className="flash-timer-box" aria-label="Flash sale ends in">
                <div className="flash-timer-label">
                  <Timer size={14} /> ENDS IN
                </div>
                <div className="flash-countdown-row">
                  <div className="timer-tile">
                    <span className="timer-val">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="timer-unit">HRS</span>
                  </div>
                  <span className="timer-colon">:</span>
                  <div className="timer-tile">
                    <span className="timer-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="timer-unit">MIN</span>
                  </div>
                  <span className="timer-colon">:</span>
                  <div className="timer-tile">
                    <span className="timer-val timer-seconds">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="timer-unit">SEC</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flash-products-grid">
              {flashDeals.length > 0 ? (
                flashDeals.map((toy, idx) => {
                  const discount = Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100);
                  const claimedPercent = [88, 76, 92, 84][idx % 4];
                  return (
                    <div key={toy.id} className="flash-deal-card">
                      <div className="flash-card-top">
                        <span className="flash-discount-tag">
                          <Percent size={12} /> {discount}% OFF
                        </span>
                        <span className="flash-brand-tag">{toy.brand || 'Original'}</span>
                      </div>
                      
                      <Link to={`/product/${toy.id}`} className="flash-img-wrap">
                        <img
                          src={toy.images?.[0] || toy.image || '/images/hero-toys.jpg'}
                          alt={toy.name}
                          loading="lazy"
                          className="flash-img"
                        />
                      </Link>

                      <div className="flash-card-info">
                        <Link to={`/product/${toy.id}`} className="flash-product-name" title={toy.name}>
                          {toy.name}
                        </Link>
                        
                        <div className="flash-price-row">
                          <span className="flash-deal-price">{formatINR(toy.price)}</span>
                          <span className="flash-orig-price">{formatINR(toy.originalPrice)}</span>
                          <span className="flash-save-amount">Save {formatINR(toy.originalPrice - toy.price)}</span>
                        </div>

                        <div className="flash-stock-claim">
                          <div className="claim-text">
                            <span>🔥 {claimedPercent}% claimed</span>
                            <span className="claim-alert">Hurry, low stock!</span>
                          </div>
                          <div className="claim-bar-track">
                            <div className="claim-bar-fill" style={{ width: `${claimedPercent}%` }} />
                          </div>
                        </div>

                        <Link to={`/product/${toy.id}`} className="btn btn-sm btn-primary flash-claim-btn">
                          Claim Deal <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="products-grid">
                  {trending.slice(0, 4).map(toy => <ProductCard key={toy.id} toy={toy} />)}
                </div>
              )}
            </div>

            <div className="flash-banner-footer">
              <Link to="/shop?deals=true" className="btn btn-yellow btn-md">
                <Sparkles size={16} /> Explore All Clearance Deals <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: SHOP BY CATEGORY ================= */}
      <section className="home-section category-section-wrap">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">🎁 EXPLORE PLAY WORLDS</span>
              <h2 className="section-title">Shop by Category</h2>
            </div>
            <button
              type="button"
              className="section-link category-toggle-btn"
              onClick={() => setShowAllCategories(!showAllCategories)}
              aria-label={showAllCategories ? 'Show top 12 categories' : 'Show all 18 categories'}
            >
              <span>{showAllCategories ? 'Show Top 12' : 'See all 18'}</span>
              <ArrowRight
                size={16}
                style={{
                  transform: showAllCategories ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.25s ease'
                }}
              />
            </button>
          </div>

          <div className="category-grid">
            {(showAllCategories ? ALL_CATEGORIES : ALL_CATEGORIES.filter(c => c.featured)).map(cat => {
              const IconComp = CATEGORY_ICON_MAP[cat.iconName] || Sparkles;
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.id)}`}
                  className="category-tile"
                  style={{
                    '--cat-bg': cat.bg,
                    '--cat-border': cat.border,
                    '--cat-accent': cat.accent,
                    '--cat-gradient': cat.gradient
                  }}
                  title={`Explore ${cat.label} (${cat.count})`}
                >
                  <div className="category-icon-orb">
                    <IconComp size={28} className="category-svg-icon" strokeWidth={2.3} />
                    <div className="orb-glass-shine" />
                  </div>
                  <span className="category-label">{cat.label}</span>
                  <span className="category-count-pill">{cat.count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: INTERACTIVE 10-SEC TOY & GIFT FINDER ================= */}
      <section className="home-section toy-finder-section">
        <div className="container">
          <div className="gift-finder-card">
            <div className="finder-header">
              <span className="finder-badge">
                <Sparkles size={16} /> 10-SECOND MATCHMAKER
              </span>
              <h2>Can't decide? Find the perfect gift instantly</h2>
              <p>Pick the recipient's age, what they love, and your budget. We'll handpick the best toys.</p>
            </div>

            <form className="finder-form-grid" onSubmit={handleFinderSubmit}>
              <div className="finder-select-group">
                <label htmlFor="finder-age" className="finder-label">
                  👶 1. Recipient Age
                </label>
                <select
                  id="finder-age"
                  value={finderAge}
                  onChange={(e) => setFinderAge(e.target.value)}
                  className="finder-select"
                >
                  <option value="all">Any Age Group</option>
                  <option value="0-2">0–2 Years (Baby & Toddler)</option>
                  <option value="3-5">3–5 Years (Pre-Schoolers)</option>
                  <option value="6-8">6–8 Years (Young Explorers)</option>
                  <option value="9-12">9–12 Years (Tweens & Builders)</option>
                  <option value="12+">12+ Years (Teens & Collectors)</option>
                </select>
              </div>

              <div className="finder-select-group">
                <label htmlFor="finder-category" className="finder-label">
                  🎮 2. Interest / Category
                </label>
                <select
                  id="finder-category"
                  value={finderCategory}
                  onChange={(e) => setFinderCategory(e.target.value)}
                  className="finder-select"
                >
                  <option value="all">All Play Styles</option>
                  <option value="Action Figures">Action Figures & Heroes</option>
                  <option value="Diecast Cars & Vehicles">Diecast Cars & Speed</option>
                  <option value="Blind Boxes & Mystery Figures">Blind Boxes & Mystery Surprise</option>
                  <option value="Board Games & Puzzles">Board Games & Brain Puzzles</option>
                  <option value="Pop Vinyl Figures">Pop Vinyl Figures</option>
                  <option value="Model Kits">Model Assembly Kits</option>
                  <option value="Toy Blasters">Toy Blasters</option>
                </select>
              </div>

              <div className="finder-select-group">
                <label htmlFor="finder-budget" className="finder-label">
                  🪙 3. Maximum Budget
                </label>
                <select
                  id="finder-budget"
                  value={finderBudget}
                  onChange={(e) => setFinderBudget(e.target.value)}
                  className="finder-select"
                >
                  <option value="all">Any Price</option>
                  <option value="499">Pocket Budget (Under ₹499)</option>
                  <option value="999">Sweet Spot (Under ₹999)</option>
                  <option value="1999">Birthday Special (Under ₹1,999)</option>
                  <option value="4999">Premium Collectible (Under ₹4,999)</option>
                </select>
              </div>

              <div className="finder-action-col">
                <button type="submit" className="btn btn-primary btn-lg finder-submit-btn" id="find-perfect-toys-btn">
                  <Search size={18} /> Find Perfect Toys <ArrowRight size={18} />
                </button>
              </div>
            </form>

            <div className="finder-quick-tags">
              <span className="quick-tags-title">Quick Picks:</span>
              <Link to="/shop?category=Pop%20Vinyl%20Figures" className="finder-pill">👑 Pop Figures</Link>
              <Link to="/shop?category=Diecast%20Cars%20%26%20Vehicles" className="finder-pill">🏎️ Hot Wheels & Diecast</Link>
              <Link to="/shop?category=Blind%20Boxes%20%26%20Mystery%20Figures" className="finder-pill">🎁 Pop Mart Mystery</Link>
              <Link to="/shop?deals=true" className="finder-pill">🔥 40%+ Off Deals</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: SHOP BY BUDGET ================= */}
      <section className="home-section budget-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">🪙 VALUE FOR EVERY RUPEE</span>
              <h2 className="section-title">Shop by Budget</h2>
            </div>
            <Link to="/shop" className="section-link">View all toys <ArrowRight size={16} /></Link>
          </div>

          <div className="budget-grid">
            {BUDGET_TIERS.map((tier) => {
              const linkTo = tier.maxPrice
                ? `/shop?maxPrice=${tier.maxPrice}`
                : `/shop?sort=${tier.sort}`;

              return (
                <Link
                  key={tier.label}
                  to={linkTo}
                  className="budget-card"
                  style={{
                    '--budget-bg': tier.bg,
                    '--budget-border': tier.border,
                    '--budget-gradient': tier.gradient
                  }}
                >
                  <div className="budget-card-header">
                    <span className="budget-icon-emoji">{tier.icon}</span>
                    <span className="budget-tag">{tier.tag}</span>
                  </div>
                  <h3 className="budget-price-title">{tier.label}</h3>
                  <h4 className="budget-name">{tier.title}</h4>
                  <p className="budget-desc">{tier.desc}</p>
                  <div className="budget-cta">
                    <span>Shop Collection</span>
                    <ChevronRight size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECTION 5: TRENDING TOYS ================= */}
      <section className="home-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">🔥 Kids love these</span>
              <h2 className="section-title">Trending Toys</h2>
            </div>
            <Link to="/shop?featured=true" className="section-link">View all <ArrowRight size={16} /></Link>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="product-skeleton" />)}
            </div>
          ) : (
            <div className="products-grid">
              {trending.map(toy => <ProductCard key={toy.id} toy={toy} />)}
            </div>
          )}
        </div>
      </section>

      {/* ================= SECTION 6: OFFICIAL BRANDS SHOWCASE ================= */}
      <section className="home-section brands-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">👑 100% LICENSED & AUTHENTIC</span>
              <h2 className="section-title">Shop by Official Brand</h2>
            </div>
            <Link to="/shop" className="section-link">All 40+ Brands <ArrowRight size={16} /></Link>
          </div>

          <div className="brands-grid">
            {BRAND_SHOWCASE.map((brand) => (
              <Link
                key={brand.name}
                to={`/shop?brand=${encodeURIComponent(brand.name)}`}
                className="brand-card"
              >
                <div className="brand-logo-badge" style={{ background: brand.gradient }}>
                  <span className="brand-initial">{brand.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="brand-content">
                  <div className="brand-top-row">
                    <h3 className="brand-name">{brand.name}</h3>
                    <span className="brand-pill">{brand.badge}</span>
                  </div>
                  <p className="brand-desc">{brand.desc}</p>
                  <span className="brand-count">{brand.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 7: SHOP BY AGE ================= */}
      <section className="home-section age-section">
        <div className="container">
          <div className="section-head center">
            <div>
              <span className="section-eyebrow">🎂 Perfect picks</span>
              <h2 className="section-title">Shop by Age</h2>
            </div>
          </div>
          <div className="age-row">
            {AGE_BUBBLES.map(age => (
              <Link
                key={age.id}
                to={`/shop?age=${encodeURIComponent(age.id)}`}
                className={`age-bubble bubble-${age.color}`}
              >
                <span className="age-emoji" aria-hidden="true">{age.emoji}</span>
                <span className="age-num">{age.label}</span>
                <span className="age-sub">{age.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 8: WHY BUYERS & PARENTS TRUST TOYVERSE ================= */}
      <section className="home-section why-trust-section">
        <div className="container">
          <div className="section-head center">
            <div>
              <span className="section-eyebrow">🛡️ PEACE OF MIND GUARANTEED</span>
              <h2 className="section-title">Why Parents & Collectors Choose ToyVerse</h2>
            </div>
          </div>

          <div className="reassurance-grid">
            <div className="reassurance-card">
              <div className="reassurance-icon ri-green">
                <ShieldCheck size={28} />
              </div>
              <h3>100% BIS Certified Safety</h3>
              <p>Every toy conforms strictly to Indian Safety Standard IS 9873 with non-toxic dyes and smooth, safe edges.</p>
              <span className="reassurance-check"><CheckCircle2 size={16} /> Certified Safe</span>
            </div>

            <div className="reassurance-card">
              <div className="reassurance-icon ri-blue">
                <Package size={28} />
              </div>
              <h3>Vault-Grade Bubble Packaging</h3>
              <p>Multi-layered bubble wraps and reinforced corners guarantee mint boxes for collector displays and birthday unwraps.</p>
              <span className="reassurance-check"><CheckCircle2 size={16} /> Mint Condition Guarantee</span>
            </div>

            <div className="reassurance-card">
              <div className="reassurance-icon ri-orange">
                <Truck size={28} />
              </div>
              <h3>Express 24-Hour Dispatch</h3>
              <p>Direct courier dispatch via BlueDart & Delhivery across 19,000+ Indian PIN codes with live SMS/WhatsApp tracking.</p>
              <span className="reassurance-check"><CheckCircle2 size={16} /> Tracked & Insured</span>
            </div>

            <div className="reassurance-card">
              <div className="reassurance-icon ri-pink">
                <RotateCcw size={28} />
              </div>
              <h3>7-Day Hassle-Free Replacements</h3>
              <p>Zero-headache replacements or instant refunds if your order arrives damaged or isn't 100% as promised.</p>
              <span className="reassurance-check"><CheckCircle2 size={16} /> Risk-Free Shopping</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 9: VERIFIED PARENT & COLLECTOR REVIEWS ================= */}
      <section className="home-section reviews-section">
        <div className="container">
          <div className="reviews-header">
            <div>
              <span className="section-eyebrow">⭐ REAL COMMUNITY LOVE</span>
              <h2 className="section-title">Trusted by 50,000+ Indian Families</h2>
            </div>
            <div className="review-stat-pill">
              <div className="stars-cluster">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={16} fill="#FFC83D" color="#FFC83D" />
                ))}
              </div>
              <strong>4.9 / 5</strong>
              <span>(12,400+ Verified Reviews)</span>
            </div>
          </div>

          <div className="reviews-grid">
            {VERIFIED_REVIEWS.map(rev => (
              <div key={rev.id} className="review-card">
                <div className="review-card-top">
                  <div className="review-stars">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} size={16} fill="#FFC83D" color="#FFC83D" />
                    ))}
                  </div>
                  <span className="review-verified-badge">
                    <CheckCheck size={14} /> {rev.tag}
                  </span>
                </div>

                <h3 className="review-card-title">"{rev.title}"</h3>
                <p className="review-card-comment">{rev.comment}</p>

                <div className="review-card-author">
                  <div className="author-avatar">{rev.name.charAt(0)}</div>
                  <div>
                    <h4 className="author-name">{rev.name}</h4>
                    <span className="author-meta">{rev.role} • {rev.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROMO BANNERS ================= */}
      <section className="home-section">
        <div className="container promo-grid">
          <Link to="/shop?deals=true" className="promo-card promo-pink">
            <div>
              <span className="promo-tag">Festive Offer</span>
              <h3>Up to 40% OFF</h3>
              <p>On best-selling STEM kits & robots</p>
              <span className="promo-cta">Grab the deal <ArrowRight size={16} /></span>
            </div>
            <span className="promo-emoji" aria-hidden="true">🤖</span>
          </Link>
          <Link to={`/shop?category=${encodeURIComponent('Pop Vinyl Figures')}`} className="promo-card promo-blue">
            <div>
              <span className="promo-tag">Collector Spotlight</span>
              <h3>Funko Pop! from ₹999</h3>
              <p>Marvel, Anime, Disney & Retro vinyl grails</p>
              <span className="promo-cta">Explore Vinyl <ArrowRight size={16} /></span>
            </div>
            <span className="promo-emoji" aria-hidden="true">👑</span>
          </Link>
        </div>
      </section>

      {/* ================= SECTION 10: VIP KIDS CLUB / FIRST-ORDER VOUCHER ================= */}
      <section className="home-section vip-club-section">
        <div className="container">
          <div className="vip-banner-box">
            <div className="vip-content">
              <span className="vip-badge">
                <Sparkles size={16} /> INSTANT SIGNUP REWARD
              </span>
              <h2>Get ₹250 OFF Your First Order</h2>
              <p>
                Join 50,000+ smart parents and toy collectors. Receive secret restock alerts,
                free collector sleeves, and an instant ₹250 discount voucher.
              </p>

              {!vipClaimed ? (
                <form className="vip-form" onSubmit={handleVipSubmit}>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={vipEmail}
                    onChange={(e) => setVipEmail(e.target.value)}
                    className="vip-input"
                    aria-label="Email address for ₹250 voucher"
                  />
                  <button type="submit" className="btn btn-yellow vip-submit-btn" id="claim-vip-voucher-btn">
                    <Gift size={18} /> Claim ₹250 Voucher
                  </button>
                </form>
              ) : (
                <div className="vip-reward-card animate-fade-in">
                  <div className="reward-congrats">
                    <CheckCircle2 size={24} className="text-success" />
                    <strong>Awesome! Your VIP Welcome Voucher is Ready:</strong>
                  </div>
                  <div className="reward-coupon-display">
                    <span className="reward-code">WELCOME250</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="btn btn-sm btn-outline reward-copy-btn"
                    >
                      {copiedCode ? (
                        <>
                          <Check size={14} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <p className="reward-note">
                    Valid on all orders above ₹999. Apply code at checkout!
                  </p>
                </div>
              )}
            </div>

            <div className="vip-illustration">
              <span className="vip-gift-emoji">🎁</span>
              <div className="vip-pill-strip">
                <span>⚡ Instant Code</span>
                <span>✨ ₹250 Discount</span>
                <span>📦 Free Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BEST SELLERS ================= */}
      {bestSellers.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="section-eyebrow">🏆 Top rated</span>
                <h2 className="section-title">Best Sellers</h2>
              </div>
              <Link to="/shop?sort=bestseller" className="section-link">View all <ArrowRight size={16} /></Link>
            </div>
            <div className="products-grid">
              {bestSellers.map(toy => <ProductCard key={toy.id} toy={toy} />)}
            </div>
          </div>
        </section>
      )}

      {/* ================= NEW ARRIVALS ================= */}
      {newArrivals.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="section-eyebrow">✨ Just landed</span>
                <h2 className="section-title">New Arrivals</h2>
              </div>
              <Link to="/shop?sort=newest" className="section-link">View all <ArrowRight size={16} /></Link>
            </div>
            <div className="products-grid">
              {newArrivals.map(toy => <ProductCard key={toy.id} toy={toy} />)}
            </div>
          </div>
        </section>
      )}

      {/* ================= PARENT PROMISE ================= */}
      <section className="home-section">
        <div className="container">
          <div className="promise-card">
            <div className="promise-copy">
              <span className="section-eyebrow light">💛 The ToyVerse Promise</span>
              <h2>Toys that are safe, smart & made to last</h2>
              <p>
                Every toy is BIS-certified, tested for non-toxic paints and sturdy build —
                including handcrafted Channapatna wooden toys from Indian artisans.
              </p>
              <Link to="/shop" className="btn btn-yellow btn-lg">Start Shopping <ArrowRight size={18} /></Link>
            </div>
            <div className="promise-stats">
              <div><strong>1,150+</strong><span>Toys</span></div>
              <div><strong>19,000+</strong><span>PIN codes</span></div>
              <div><strong>50K+</strong><span>Happy kids</span></div>
              <div><strong>4.8★</strong><span>Avg. rating</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
