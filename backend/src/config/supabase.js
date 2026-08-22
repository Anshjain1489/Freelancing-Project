const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

let supabase = null;

const apiKey = config.supabase.serviceRoleKey || config.supabase.anonKey;

if (config.supabase.url && apiKey) {
  supabase = createClient(config.supabase.url, apiKey);
} else {
  console.warn('[SUPABASE] Supabase credentials not provided in environment variables. Database calls will use local/mock fallback.');
}

module.exports = supabase;
