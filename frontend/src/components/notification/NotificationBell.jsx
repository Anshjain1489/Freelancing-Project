import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const NotificationBell = ({ count = 2 }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)'
        }}
        title="Notifications"
      >
        <Bell size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: 'var(--color-secondary)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            borderRadius: '999px',
            padding: '1px 5px'
          }}>
            {count}
          </span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};
