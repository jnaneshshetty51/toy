import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register, quickDemoLogin, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer'
  });
  const [resetData, setResetData] = useState({
    email: '',
    code: '',
    newPassword: '',
    generatedCode: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(formData.email, formData.password);
        if (res.success) {
          if (res.user.role === 'admin') navigate('/admin');
          else navigate('/account');
        } else {
          setErrorMsg(res.error || 'Invalid credentials');
        }
      } else if (mode === 'register') {
        const res = await register(formData);
        if (res.success) {
          navigate('/account');
        } else {
          setErrorMsg(res.error || 'Failed to create account');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const emailToUse = resetData.email.trim() || formData.email.trim();
      if (!emailToUse) {
        setErrorMsg('Please enter your account email address.');
        setIsSubmitting(false);
        return;
      }
      const res = await api.auth.forgotPassword(emailToUse);
      setResetData(prev => ({ ...prev, email: emailToUse, generatedCode: '', code: '' }));
      setSuccessMsg('Verification OTP has been sent to your registered email address.');
      setMode('reset');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const res = await api.auth.resetPassword({
        email: resetData.email.trim(),
        code: resetData.code.trim(),
        newPassword: resetData.newPassword
      });
      setSuccessMsg(res.message || 'Password reset successfully! Please sign in.');
      setFormData(prev => ({ ...prev, email: resetData.email, password: resetData.newPassword }));
      setMode('login');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-root animate-fade-in">
      <div className="container auth-container">
        <div className="auth-card card">
          {/* Header */}
          <div className="auth-header">
            <Link to="/" className="auth-brand-logo">
              <span className="auth-brand-name">TOYVERSE // AUTHENTICATION</span>
            </Link>
            <h1 className="auth-title">
              {mode === 'login' ? 'System Sign In' : 'Account Registration'}
            </h1>
            <p className="auth-subtitle">
              {mode === 'login' 
                ? 'Authenticate to access order dispatches, manage saved addresses, and profile.'
                : 'Register your account for order tracking and priority delivery in India.'}
            </p>
          </div>

          {/* Tab Switcher (only for login & register) */}
          {(mode === 'login' || mode === 'register') ? (
            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="auth-tabs">
              <button 
                className="auth-tab-btn active"
              >
                <KeyRound size={14} className="inline mr-1" />
                {mode === 'forgot' ? 'Request Password Reset' : 'Set New Password'}
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="auth-success-banner animate-fade-in mb-4">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="auth-error-banner animate-fade-in mb-4">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form: Login or Register */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div className="auth-input-wrapper">
                    <User size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diya Sengupta"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. aarav.sharma@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="auth-input"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Mobile Number (for SMS Tracking) *</label>
                  <div className="auth-input-wrapper">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label mb-0">Password *</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                        setSuccessMsg('');
                        setResetData(prev => ({ ...prev, email: formData.email }));
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="auth-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg btn-block auth-submit-btn"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Verifying...' : mode === 'login' ? 'Sign In to ToyVerse' : 'Create Account'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* Form: Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="auth-form animate-fade-in">
              <div className="form-group">
                <label className="form-label">Account Email Address *</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. aarav.sharma@example.com"
                    value={resetData.email}
                    onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                    className="auth-input"
                  />
                </div>
                <p className="text-xs text-muted mt-1">
                  We'll generate a secure 6-digit recovery OTP for instant password reset.
                </p>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg btn-block auth-submit-btn"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Generating OTP...' : 'Send Recovery OTP'}</span>
                <ArrowRight size={18} />
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Form: Reset Password */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="auth-form animate-fade-in">
              <div className="form-group">
                <label className="form-label">6-Digit Verification Code *</label>
                <div className="auth-input-wrapper">
                  <KeyRound size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    value={resetData.code}
                    onChange={(e) => setResetData({ ...resetData, code: e.target.value })}
                    className="auth-input tracking-widest font-mono"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password *</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    className="auth-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg btn-block auth-submit-btn"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Updating...' : 'Set New Password & Sign In'}</span>
                <ArrowRight size={18} />
              </button>

              <div className="flex justify-between items-center text-xs mt-3">
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer Note */}
          <div className="auth-footer-note">
            <p>
              🔒 100% Secure authentication • Operating in India with BIS safety standards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
