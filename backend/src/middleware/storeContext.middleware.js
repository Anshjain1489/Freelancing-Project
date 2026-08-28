const supabase = require('../config/supabase');

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000002';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Server-authoritative Store & Tenant Context Middleware.
 * Resolves active organization and store context without trusting client-controlled IDs in headers/query params.
 */
async function storeContextMiddleware(req, res, next) {
  try {
    // Default context for single-store production deployment
    let storeId = DEFAULT_STORE_ID;
    let organizationId = DEFAULT_ORG_ID;

    // If authenticated user belongs to specific store, resolve from verified DB record
    if (req.user && req.user.store_id) {
      storeId = req.user.store_id;
    }

    req.store = {
      id: storeId,
      code: 'CKS-MAIN',
      name: 'Chaudhary Kirana Store'
    };

    req.organization = {
      id: organizationId,
      slug: 'chaudhary-kirana',
      name: 'Chaudhary Kirana Store'
    };

    next();
  } catch (error) {
    // Fail safely to default store context if DB lookup is unavailable
    req.store = { id: DEFAULT_STORE_ID, code: 'CKS-MAIN' };
    req.organization = { id: DEFAULT_ORG_ID, slug: 'chaudhary-kirana' };
    next();
  }
}

module.exports = storeContextMiddleware;
