const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../../middleware/auth.middleware');
const storeConfigurationService = require('../../services/storeConfiguration.service');
const featureFlagService = require('../../services/featureFlag.service');
const onboardingService = require('../../services/onboarding.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

/**
 * GET /api/v1/admin/store-config
 * Fetch complete store configuration for admin console.
 */
router.get('/', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const config = await storeConfigurationService.getAdminConfiguration(req.store?.id);
    const featureFlags = await featureFlagService.getStoreFeatures(req.store?.id);
    const onboarding = await onboardingService.getOnboardingStatus(req.store?.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...config,
        featureFlags,
        onboarding
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/store-config/branding
 * Update store identity branding (logo, colors, header, footer text).
 */
router.put('/branding', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const updated = await storeConfigurationService.updateBranding(req.store?.id, req.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Store branding updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/store-config/settings
 * Update individual store business setting.
 */
router.put('/settings', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { setting_key, setting_value, is_sensitive } = req.body;
    const updated = await storeConfigurationService.updateSetting(req.store?.id, setting_key, setting_value, is_sensitive, req.user?.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Store setting '${setting_key}' updated successfully`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/store-config/feature-flags
 * Toggle module feature flag.
 */
router.put('/feature-flags', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { feature_key, is_enabled } = req.body;
    const updated = await featureFlagService.setStoreFeature(req.store?.id, feature_key, is_enabled, req.user?.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Feature flag '${feature_key}' set to ${is_enabled}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
