const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

let supabase = null;

// Polyfill WebSocket for Node.js environments < 22 where native WebSocket is absent
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    globalThis.WebSocket = require('ws');
  } catch (e) {
    // Lightweight fallback so createClient does not throw WebSocket missing error
    globalThis.WebSocket = class DummyWebSocket {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };
  }
}

const apiKey = config.supabase.serviceRoleKey || config.supabase.anonKey;

if (config.supabase.url && apiKey) {
  supabase = createClient(config.supabase.url, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  console.warn('[SUPABASE] Supabase credentials not provided in environment variables. Database calls will use local/mock fallback.');
}

module.exports = supabase;
