const crypto = require('crypto');
const logger = require('../utils/logger');

const validateStartupConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = [];

  // Check required environment variables
  if (!process.env.SUPABASE_URL) {
    missingVars.push('SUPABASE_URL');
  }

  const jwtSecretVal = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '').trim();
  if (!jwtSecretVal) {
    missingVars.push('JWT_SECRET');
  }

  if (missingVars.length > 0) {
    const errorMsg = `Startup Validation Failed: Missing required environment variables: [${missingVars.join(', ')}]. Configure JWT_SECRET or JWT_ACCESS_SECRET.`;
    if (isProduction) {
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      logger.warn(`[STARTUP_WARN] ${errorMsg}`);
    }
  }

  // Validate JWT secret strength and placeholder values in production mode
  const knownPlaceholders = [
    'changeme',
    'secret',
    'your-secret',
    'development-secret',
    'your-jwt-secret',
    'your-jwt-access-secret-key',
    'your-jwt-refresh-secret-key',
    'fallback_secret_key_chaudhary_kirana_2026',
    'fallback_secret_key',
    'fallback_refresh_secret_chaudhary_2026',
    'dev_jwt_access_secret_chaudhary_kirana_2026',
    'dev_jwt_refresh_secret_chaudhary_kirana_2026'
  ];

  if (isProduction) {
    if (knownPlaceholders.includes(jwtSecretVal.toLowerCase())) {
      const errorMsg = 'Startup Validation Failed: JWT_SECRET must not use insecure default placeholder values.';
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (jwtSecretVal.length < 32) {
      const errorMsg = 'Startup Validation Failed: JWT secret does not meet production security requirements (must be at least 32 characters).';
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  logger.info('[STARTUP_VALIDATION_SUCCESS] Production environment configuration verified successfully.');
  return {
    valid: true,
    isProduction,
    missingVars
  };
};

module.exports = {
  validateStartupConfig
};
