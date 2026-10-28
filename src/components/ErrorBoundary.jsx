import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ToyVerse React Error Boundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--font-sans, system-ui)',
          background: 'var(--color-bg, #FAFAFA)',
          color: 'var(--color-text, #18181B)'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            background: '#FFFFFF',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'floaty 3s ease-in-out infinite' }}>🧸</div>
            <h1 style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-family-display)',
              marginBottom: '0.75rem',
              color: 'var(--color-text-main)',
              letterSpacing: '-0.02em'
            }}>
              ToyVerse Display Notice
            </h1>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              marginBottom: '1.75rem',
              fontWeight: 600
            }}>
              A temporary display pause occurred. Your shopping cart and preferences remain safe and sound!
            </p>
            <button
              onClick={this.handleReload}
              className="btn btn-primary btn-md"
              style={{
                cursor: 'pointer'
              }}
            >
              Restart Playtime 🚀
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
