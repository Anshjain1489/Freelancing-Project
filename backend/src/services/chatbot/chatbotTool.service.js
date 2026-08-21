const productService = require('../product.service');
const deliveryService = require('../delivery.service');
const orderService = require('../order.service');
const config = require('../../config/environment');

const searchProducts = async ({ search = '', maxPrice = null, categorySlug = null }) => {
  try {
    const res = await productService.getProducts({ search, category: categorySlug, limit: 6 });
    let items = res.items || [];
    if (maxPrice) {
      items = items.filter(p => p.sellingPrice <= maxPrice);
    }
    return items.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      mrp: p.mrp,
      sellingPrice: p.sellingPrice,
      discountPercent: p.discountPercent,
      unit: p.unit,
      inStock: p.inStock,
      stockStatus: p.stockStatus
    }));
  } catch {
    return [];
  }
};

const getDeliveryInfo = ({ distanceKm = 1.0 }) => {
  return deliveryService.calculateDeliveryFee(distanceKm);
};

const getStoreInfo = () => {
  return {
    name: config.store.name,
    owner: config.store.owner,
    phone1: config.store.phone1,
    phone2: config.store.phone2,
    address: config.store.address,
    freeRadiusKm: config.store.freeDeliveryRadiusKm,
    extraKmRate: config.store.deliveryChargePerExtraKm
  };
};

const getUserLatestOrder = async (userId) => {
  if (!userId) return null;
  try {
    const res = await orderService.getUserOrders(userId, { limit: 1 });
    const orders = res.items || [];
    return orders[0] || null;
  } catch {
    return null;
  }
};

module.exports = {
  searchProducts,
  getDeliveryInfo,
  getStoreInfo,
  getUserLatestOrder
};
