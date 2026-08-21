import React from 'react';
import { Link } from 'react-router-dom';

export const ForgotPassword = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '24px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: '12px' }}>Forgot Password</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
        Enter your mobile number to receive a password reset verification link.
      </p>
      <input
        type="text"
        placeholder="Registered mobile number"
        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '14px' }}
      />
      <button style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
        Send Reset OTP
      </button>
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
        <Link to="/login" style={{ color: 'var(--color-primary-dark)' }}>Back to Login</Link>
      </div>
    </div>
  );
};
