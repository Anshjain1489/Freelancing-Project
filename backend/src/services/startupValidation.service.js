const crypto = require('crypto');
const logger = require('../utils/logger');

const validateStartupConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = [];

  const requiredVars = [
    'SUPABASE_URL',
    'JWT_SECRET',
    'OTP_ENCRYPTION_KEY'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
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

  // Validate OTP_ENCRYPTION_KEY AES-256 key material
  const otpKey = process.env.OTP_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (otpKey.length < 32) {
    const errorMsg = 'OTP_ENCRYPTION_KEY must be at least 32 characters or 64 hex characters for AES-256-GCM.';
    if (isProduction) {
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      logger.warn(`[STARTUP_WARN] ${errorMsg}`);
    }
  }

  // Encryption self-test
  try {
    const key = crypto.createHash('sha256').update(String(otpKey)).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update('TEST_OTP_1234', 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');

    if (dec !== 'TEST_OTP_1234') {
      throw new Error('Encryption self-test produced mismatched plaintext.');
    }
  } catch (err) {
    const errorMsg = `OTP Encryption Self-Test Failed: ${err.message}`;
    if (isProduction) {
      logger.error(`[STARTUP_FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      logger.warn(`[STARTUP_WARN] ${errorMsg}`);
    }
  }

  logger.info('[STARTUP_VALIDATION_SUCCESS] Production environment configuration and encryption self-test verified successfully.');
  return {
    valid: true,
    isProduction,
    missingVars
  };
};

module.exports = {
  validateStartupConfig
};
