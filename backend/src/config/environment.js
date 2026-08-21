const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_secret_key_chaudhary_kirana_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_chaudhary_2026'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },
  store: {
    name: 'Chaudhary Kirana Store',
    owner: 'Akash Chaudhary',
    phone1: '7897837095',
    phone2: '7007550184',
    address: 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, India',
    latitude: parseFloat(process.env.STORE_LATITUDE) || 24.2381,
    longitude: parseFloat(process.env.STORE_LONGITUDE) || 78.7364,
    freeDeliveryRadiusKm: parseFloat(process.env.FREE_DELIVERY_RADIUS_KM) || 0.0,
    deliveryChargePerExtraKm: parseFloat(process.env.DELIVERY_CHARGE_PER_EXTRA_KM) || 10.0,
    maxDeliveryRadiusKm: parseFloat(process.env.MAX_DELIVERY_RADIUS_KM) || 15.0
  }
};

module.exports = config;
