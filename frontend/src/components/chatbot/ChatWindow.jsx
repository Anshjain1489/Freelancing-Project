import React, { useState, useRef, useEffect } from 'react';
import { chatbotService } from '../../services/chatbot.service';
import { ChatMessage } from './ChatMessage';
import { X, Send, Bot, Sparkles } from 'lucide-react';

const QUICK_CHIPS = [
  '🛒 Find Aashirvaad Atta',
  '🛢 Cooking Oils under ₹200',
  '🚚 What are delivery charges?',
  '🎉 Today\'s Store Offers',
  '📍 Store Contact & Address',
  '📦 Track My Order'
];

export const ChatWindow = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ASSISTANT',
      content: 'Namaste! 🙏 I am your Chaudhary Kirana Assistant. How can I help you find groceries, check delivery charges, or track your orders today? 🌾🛒'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'USER', content: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await chatbotService.sendMessage(query);
      const data = res.data || {};

      const botMsg = {
        id: `b-${Date.now()}`,
        role: 'ASSISTANT',
        content: data.message || 'Here is what I found for you!',
        products: data.products || [],
        actions: data.actions || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: err.response?.data?.message || 'Sorry, I am temporarily unavailable. Please try again in a moment. 🙏'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '84px',
      right: '20px',
      width: '380px',
      maxHeight: '560px',
      height: '80vh',
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Chat Window Header */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: 'var(--color-primary)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Kirana Assistant 🤖</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ADE80' }}></span>
              Chaudhary Kirana Store AI
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Quick Suggestions Horizontal Scroll Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '6px', overflowX: 'auto', backgroundColor: 'var(--color-background)' }}>
        {QUICK_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            style={{
              whiteSpace: 'nowrap',
              padding: '4px 10px',
              borderRadius: '14px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--color-text-secondary)'
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div ref={feedRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: 'var(--color-background)' }}>
        {messages.map(msg => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            <Sparkles size={16} className="animate-spin" color="var(--color-primary)" />
            Assistant is typing...
          </div>
        )}
      </div>

      {/* Input Field Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', backgroundColor: 'var(--color-surface)' }}
      >
        <input
          type="text"
          placeholder="Ask Kirana Assistant..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            fontSize: '0.85rem'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            opacity: input.trim() && !loading ? 1 : 0.5
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
