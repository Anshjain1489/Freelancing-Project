export const calculateDeliveryFee = (
  distanceKm,
  freeRadiusKm = 0.0,
  extraKmRate = 10.0
) => {
  const distance = Math.max(0, Number(distanceKm) || 0);

  if (freeRadiusKm > 0 && distance <= freeRadiusKm) {
    return {
      deliveryCharge: 0,
      isFree: true,
      message: `FREE delivery (Within ${freeRadiusKm} KM radius)`
    };
  }

  const chargeableKm = Math.max(1, Math.ceil(distance));
  const deliveryCharge = chargeableKm * extraKmRate;

  return {
    deliveryCharge,
    isFree: false,
    message: `₹${deliveryCharge} delivery charge applied (${chargeableKm} KM @ ₹${extraKmRate}/KM)`
  };
};
