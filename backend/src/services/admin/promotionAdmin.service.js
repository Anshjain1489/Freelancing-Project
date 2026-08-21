const supabase = require('../../config/supabase');
const { logAdminActivity } = require('../adminLog.service');
const eventBus = require('../../events/eventBus');
const EVENT_TYPES = require('../../events/eventTypes');

const getPromotions = async () => {
  if (supabase) {
    const { data: promotions } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    return { promotions: promotions || [] };
  }
  return {
    promotions: [
      { id: 'promo-1', title: 'Weekend Kirana Offer', description: 'Get 10% off on Atta & Oils', code: 'MAHRUNI50', discountPercent: 10, isActive: true }
    ]
  };
};

const createPromotion = async (userId, data, req = null) => {
  if (supabase) {
    const { data: newPromo } = await supabase.from('promotions').insert([{
      title: data.title,
      description: data.description,
      discount_type: 'PERCENTAGE',
      discount_value: data.discountValue || 10,
      is_active: true
    }]).select().single();

    await logAdminActivity(userId, 'PROMOTION_CREATED', 'promotion', newPromo?.id, { title: data.title }, req);
    eventBus.emit(EVENT_TYPES.PROMOTION_CREATED, { title: data.title });

    return newPromo;
  }

  return { id: `promo-${Date.now()}`, title: data.title, isActive: true };
};

const getBanners = async () => {
  if (supabase) {
    const { data: banners } = await supabase.from('banners').select('*').order('display_order', { ascending: true });
    return { banners: banners || [] };
  }
  return {
    banners: [
      { id: 'ban-1', title: 'Fresh Flour & Grains', imageUrl: '/banner1.jpg', isActive: true }
    ]
  };
};

const createBanner = async (userId, data, req = null) => {
  if (supabase) {
    const { data: newBanner } = await supabase.from('banners').insert([{
      title: data.title,
      image_url: data.imageUrl,
      link_url: data.linkUrl || '/products',
      display_order: data.displayOrder || 0,
      is_active: true
    }]).select().single();

    await logAdminActivity(userId, 'BANNER_CREATED', 'banner', newBanner?.id, { title: data.title }, req);
    return newBanner;
  }

  return { id: `ban-${Date.now()}`, title: data.title, imageUrl: data.imageUrl, isActive: true };
};

module.exports = {
  getPromotions,
  createPromotion,
  getBanners,
  createBanner
};
