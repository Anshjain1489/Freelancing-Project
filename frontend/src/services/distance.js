export const calculateDeliveryFee = (
  distanceKm,
  freeRadiusKm = 1.0,
  extraKmRate = 10.0
) => {
  const distance = Math.max(0, Number(distanceKm) || 0);
  if (distance <= freeRadiusKm) {
    return {
      deliveryCharge: 0,
      isFree: true,
      message: `FREE delivery (Within ${freeRadiusKm} KM radius)`
    };
  }

  const extraDistance = Math.ceil(distance - freeRadiusKm);
  const deliveryCharge = extraDistance * extraKmRate;

  return {
    deliveryCharge,
    isFree: false,
    message: `₹${deliveryCharge} delivery charge applied (${extraDistance} KM beyond free ${freeRadiusKm} KM zone)`
  };
};
