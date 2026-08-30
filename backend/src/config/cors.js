const config = require('./env');

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://chaudharykiranastore.com',
  'https://chaudharykiranastore.vercel.app',
  'https://chaudhary-kirana-store.vercel.app',
  config.frontendUrl,
  config.publicAppUrl
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.some(o => o && (o === origin || origin.endsWith('.vercel.app')));

    if (isAllowed) {
      return callback(null, true);
    }

    if (config.env === 'production') {
      return callback(new Error(`CORS policy rejection: Origin '${origin}' is not in production allowlist`));
    }

    // Allow local development origins
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy rejection: Origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Store-Id', 'X-Request-Id']
};

module.exports = corsOptions;
