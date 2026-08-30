import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function AIBusinessCopilotPage() {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "Why did profit fall this month?",
    "Which products are selling below WAC cost?",
    "Which products are predicted to run out of stock soon?",
    "Show Udhar credit risk summary and default alerts",
    "Show store revenue forecast for next 7 days"
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ai/copilot/history');
      if (res.data?.success && res.data?.data) {
        setMessages(res.data.data.reverse());
      }
    } catch (err) {
      console.error("Failed to load copilot history", err);
    }
  };

  const handleSend = async (queryText) => {
    const promptToSend = queryText || inputPrompt;
    if (!promptToSend.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender_type: 'USER',
      sanitized_prompt: promptToSend,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputPrompt('');
    setLoading(true);

    try {
      const res = await api.post('/ai/copilot/query', { prompt: promptToSend });
      if (res.data?.success && res.data?.data) {
        const aiMsg = {
          id: res.data.data.conversationId || `ai-${Date.now()}`,
          sender_type: 'AI',
          response_text: res.data.data.responseText,
          structured_data: res.data.data.structuredData,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender_type: 'AI',
        response_text: "Failed to process AI Copilot query. Statistical fallback engine active.",
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
            🤖 AI Business Copilot
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
            Ask natural language questions about store profit, inventory risks, credit defaults, and sales trends.
          </p>
        </div>
        <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
          Provider: Statistical & LLM Hybrid Engine
        </span>
      </div>

      {/* Quick Suggested Chips */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            💬 {q}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        height: '550px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '100px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💡</div>
              <p style={{ fontSize: '16px', fontWeight: '600' }}>How can AI Copilot help your store today?</p>
              <p style={{ fontSize: '14px' }}>Click one of the suggested prompts above or type your question below.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender_type === 'USER' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  backgroundColor: msg.sender_type === 'USER' ? '#2563EB' : '#F8FAFC',
                  color: msg.sender_type === 'USER' ? '#FFFFFF' : '#0F172A',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: msg.sender_type === 'USER' ? 'none' : '1px solid #E2E8F0',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', opacity: 0.8 }}>
                  {msg.sender_type === 'USER' ? 'Admin' : 'Store AI Copilot'}
                </div>
                <div>{msg.response_text || msg.sanitized_prompt}</div>

                {/* Structured Analytical Data Render */}
                {msg.structured_data && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                      📊 Structured Telemetry Insights:
                    </div>
                    {msg.structured_data.sampleLossItems && (
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {msg.structured_data.sampleLossItems.map((item, i) => (
                          <li key={i}>
                            <strong>{item.name}</strong>: Selling ₹{item.sellingPrice} vs WAC ₹{item.wacCost} (Loss: ₹{item.marginLossPerUnit}/unit)
                          </li>
                        ))}
                      </ul>
                    )}
                    {msg.structured_data.sampleLowStockItems && (
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {msg.structured_data.sampleLowStockItems.map((item, i) => (
                          <li key={i}>
                            <strong>{item.product}</strong>: Current stock {item.currentStock} units (Reorder at {item.reorderLevel})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: '#F8FAFC', padding: '12px 18px', borderRadius: '12px', color: '#64748B', fontSize: '14px' }}>
              🤖 AI Copilot is analyzing telemetry data...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Ask Copilot a question (e.g. Which products are hurting my profit?)..."
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputPrompt.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading || !inputPrompt.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !inputPrompt.trim() ? 0.6 : 1
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
