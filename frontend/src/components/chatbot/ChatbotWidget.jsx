import React, { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import { Bot, MessageSquare } from 'lucide-react';

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Shopping Assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 6px 20px rgba(6, 193, 103, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          cursor: 'pointer',
          zIndex: 999,
          transition: 'transform 0.2s ease, backgroundColor 0.2s ease'
        }}
      >
        <Bot size={28} />
      </button>

      {/* Floating Chat Modal */}
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
    </>
  );
};
