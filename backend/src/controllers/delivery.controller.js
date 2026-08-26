const asyncHandler = require('../utils/asyncHandler');
const deliveryDistanceService = require('../services/deliveryDistance.service');

/**
 * POST /api/v1/delivery/calculate
 * Calculates delivery road distance and delivery fee for given latitude and longitude.
 */
const calculateDeliveryFee = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  const result = await deliveryDistanceService.calculateRoadDistanceAndFee(latitude, longitude);

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  calculateDeliveryFee
};
