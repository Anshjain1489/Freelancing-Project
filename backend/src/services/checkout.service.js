const cartService = require('./cart.service');
const addressService = require('./address.service');
const deliveryService = require('./delivery.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCheckoutPreview = async (userId, addressId) => {
  if (!addressId) {
    throw new AppError('Delivery address selection is required for checkout preview', HTTP_STATUS.BAD_REQUEST);
  }

  // 1. Fetch user cart
  const cart = await cartService.getUserCart(userId);
  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Please add items before checkout.', HTTP_STATUS.BAD_REQUEST);
  }

  // 2. Validate address ownership
  const addresses = await addressService.getAddresses(userId);
  const selectedAddress = addresses.find(a => a.id === addressId);
  if (!selectedAddress) {
    throw new AppError('Selected delivery address was not found in your saved addresses', HTTP_STATUS.NOT_FOUND);
  }

  // 3. Calculate exact distance and delivery fee
  const deliveryInfo = deliveryService.getDeliveryDetailsForAddress(selectedAddress);
  if (!deliveryInfo.isDeliverable) {
    throw new AppError(deliveryInfo.reason || 'Address is outside delivery zone', HTTP_STATUS.BAD_REQUEST);
  }

  // 4. Validate product availability & live prices
  let subtotal = 0;
  const validatedItems = [];

  for (const item of cart.items) {
    if (item.isAvailable === false || item.availableStock < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${item.name}". Requested: ${item.quantity}, Available: ${item.availableStock || 0}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const itemTotal = item.sellingPrice * item.quantity;
    subtotal += itemTotal;

    validatedItems.push({
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      unit: item.unit,
      unitValue: item.unitValue,
      sellingPrice: item.sellingPrice,
      quantity: item.quantity,
      itemTotal
    });
  }

  const deliveryCharge = deliveryInfo.deliveryCharge;
  const totalAmount = subtotal + deliveryCharge;

  return {
    address: selectedAddress,
    items: validatedItems,
    itemCount: validatedItems.reduce((acc, curr) => acc + curr.quantity, 0),
    subtotal,
    delivery: deliveryInfo,
    totalAmount
  };
};

module.exports = { getCheckoutPreview };
