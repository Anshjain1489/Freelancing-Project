const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

let supabase = null;

if (config.supabase.url && config.supabase.anonKey) {
  supabase = createClient(config.supabase.url, config.supabase.anonKey);
} else {
  console.warn('[SUPABASE] Supabase credentials not provided in environment variables. Database calls will use local/mock fallback.');
}

module.exports = supabase;
