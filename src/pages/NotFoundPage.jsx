import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="notfound-root animate-fade-in">
      <div className="container notfound-container">
        <div className="notfound-card">
          <div className="notfound-animation">
            <span className="toy-icon-float t1">🧸</span>
            <span className="toy-icon-float t2">🎈</span>
            <span className="toy-icon-float t3">🚀</span>
            <div className="notfound-404-number">404</div>
          </div>

          <h1 className="notfound-title">Oops! This toy rolled away...</h1>
          <p className="notfound-subtitle">
            We couldn't find the page you're looking for. It might have been moved,
            renamed, or is currently playing hide and seek in our toy wonderland!
          </p>

          {/* Quick Search */}
          <form className="notfound-search-form" onSubmit={handleSearch}>
            <div className="notfound-search-wrapper">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search for toys, LEGO, robots, dolls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="notfound-search-input"
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Search <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* Action Links */}
          <div className="notfound-actions">
            <Link to="/" className="btn btn-primary btn-md">
              <Home size={16} /> Return to Home
            </Link>
            <Link to="/shop" className="btn btn-outline btn-md">
              <ShoppingBag size={16} /> Browse All Toys
            </Link>
            <Link to="/shop?deals=true" className="btn btn-secondary btn-md">
              <Sparkles size={16} /> Festive Deals
            </Link>
          </div>

          <div className="notfound-pills-row">
            <span className="pills-label">Popular Categories:</span>
            <Link to="/shop?category=STEM%20%26%20Learning" className="quick-cat-pill">STEM Robotics</Link>
            <Link to="/shop?category=Wooden%20%26%20Heritage%20Toys" className="quick-cat-pill">Wooden Toys</Link>
            <Link to="/shop?category=Board%20Games%20%26%20Puzzles" className="quick-cat-pill">Puzzles & Games</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
