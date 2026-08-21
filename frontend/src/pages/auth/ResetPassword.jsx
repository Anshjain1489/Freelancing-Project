import React from 'react';

export const ResetPassword = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '24px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: '16px' }}>Reset Password</h2>
      <input
        type="password"
        placeholder="New password"
        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '12px' }}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '16px' }}
      />
      <button style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
        Save New Password
      </button>
    </div>
  );
};
