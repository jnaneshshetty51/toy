import React from 'react';
import './PageLoader.css';

export default function PageLoader() {
  return (
    <div className="page-loader-container" role="status" aria-label="Loading page">
      <div className="page-loader-box">
        <div className="page-loader-bounce-toys">
          <span className="bounce-item bounce-1">🧸</span>
          <span className="bounce-item bounce-2">🚀</span>
          <span className="bounce-item bounce-3">🎨</span>
        </div>
        <p className="page-loader-text">Loading ToyVerse...</p>
        <div className="page-loader-bar">
          <div className="page-loader-fill"></div>
        </div>
      </div>
    </div>
  );
}
