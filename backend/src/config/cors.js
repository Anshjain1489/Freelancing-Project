const config = require('./environment');

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://chaudharykiranastore.vercel.app',
  'https://chaudhary-kirana-store.vercel.app',
  config.frontendUrl
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allow whitelisted origins or any Vercel preview/production domain
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    return callback(null, true); // Fallback allow to prevent CORS block on production web endpoints
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = corsOptions;
