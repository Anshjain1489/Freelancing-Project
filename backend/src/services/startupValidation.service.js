const crypto = require('crypto');
const logger = require('../utils/logger');

const validateStartupConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = [];

  // Check required environment variables
  if (!process.env.SUPABASE_URL) {
    missingVars.push('SUPABASE_URL');
  }

  const hasJwtSecret = Boolean((process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '').trim());
  if (!hasJwtSecret) {
    missingVars.push('JWT_SECRET');
  }

  if (missingVars.length > 0) {
    const errorMsg = `Startup Validation Failed: Missing required environment variables: [${missingVars.join(', ')}]`;
    if (isProduction) {
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      logger.warn(`[STARTUP_WARN] ${errorMsg}`);
    }
  }

  // Validate JWT_SECRET placeholder values in production mode
  const jwtSecretVal = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '';
  const knownPlaceholders = ['changeme', 'secret', 'your-secret', 'development-secret', 'your-jwt-access-secret-key', 'your-jwt-refresh-secret-key', 'fallback_secret_key_chaudhary_kirana_2026'];
  if (isProduction && knownPlaceholders.includes(jwtSecretVal.trim().toLowerCase())) {
    const errorMsg = 'Startup Validation Failed: JWT_SECRET must not use insecure default placeholder values.';
    logger.error(`[STARTUP_FATAL] ${errorMsg}`);
    throw new Error(errorMsg);
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
