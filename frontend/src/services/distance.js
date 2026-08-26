export const calculateDeliveryFee = (
  distanceKm,
  ratePerKm = 10.0
) => {
  const distance = Math.max(0, Number(distanceKm) || 0);

  if (distance === 0) {
    return {
      deliveryCharge: 0,
      isFree: true,
      message: 'FREE delivery (0 KM)'
    };
  }

  const deliveryCharge = Math.round(distance * ratePerKm);

  return {
    deliveryCharge,
    isFree: deliveryCharge === 0,
    message: `₹${deliveryCharge} delivery charge applied (${distance.toFixed(1)} KM @ ₹${ratePerKm}/KM)`
  };
};
