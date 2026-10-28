import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Real User Monitoring (RUM) Core Web Vitals telemetry (Req 106-109)
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const lcpMs = lastEntry.startTime;
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: 'LCP',
            value: lcpMs,
            rating: lcpMs <= 2500 ? 'good' : lcpMs <= 4000 ? 'needs-improvement' : 'poor',
            url: window.location.pathname
          }),
          keepalive: true
        }).catch(() => {});
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      fetch('/api/analytics/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'CLS',
          value: clsValue,
          rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor',
          url: window.location.pathname
        }),
        keepalive: true
      }).catch(() => {});
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Interaction to Next Paint (INP) / First Input Delay (FID)
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const duration = entry.duration || (entry.processingStart - entry.startTime);
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: 'INP',
            value: duration,
            rating: duration <= 200 ? 'good' : duration <= 500 ? 'needs-improvement' : 'poor',
            url: window.location.pathname
          }),
          keepalive: true
        }).catch(() => {});
      }
    });
    inpObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // Observer types not supported in environment
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

