const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const mockAddresses = {};

const getAddresses = async (userId) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw new AppError('Failed to fetch addresses', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    return data.map(a => ({
      id: a.id,
      recipientName: a.recipient_name,
      phone: a.phone,
      addressLine1: a.address_line1,
      addressLine2: a.address_line2,
      landmark: a.landmark,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      latitude: a.latitude ? parseFloat(a.latitude) : null,
      longitude: a.longitude ? parseFloat(a.longitude) : null,
      deliveryDistanceKm: a.delivery_distance_km ? parseFloat(a.delivery_distance_km) : null,
      estimatedDeliveryCharge: a.estimated_delivery_charge ? parseFloat(a.estimated_delivery_charge) : null,
      isDefault: a.is_default
    }));
  }

  return mockAddresses[userId] || [
    {
      id: 'addr-1',
      recipientName: 'Akash Chaudhary',
      phone: '7897837095',
      addressLine1: 'Near Bada Jain Mandir',
      addressLine2: 'Tikamgarh Road',
      landmark: 'Bada Jain Mandir',
      city: 'Mahruni',
      state: 'Uttar Pradesh',
      postalCode: '274702',
      latitude: 24.2381,
      longitude: 78.7364,
      deliveryDistanceKm: 0.0,
      estimatedDeliveryCharge: 0.0,
      isDefault: true
    }
  ];
};

const createAddress = async (userId, addressData) => {
  if (addressData.isDefault) {
    await clearDefaultAddress(userId);
  }

  if (supabase) {
    const insertPayload = {
      user_id: userId,
      recipient_name: addressData.recipientName,
      phone: addressData.phone,
      address_line1: addressData.addressLine1,
      address_line2: addressData.addressLine2 || null,
      landmark: addressData.landmark || null,
      city: addressData.city || 'Mahruni',
      state: addressData.state || 'Uttar Pradesh',
      postal_code: addressData.postalCode || '274702',
      latitude: addressData.latitude ? parseFloat(addressData.latitude) : null,
      longitude: addressData.longitude ? parseFloat(addressData.longitude) : null,
      is_default: addressData.isDefault || false
    };

    let { data, error } = await supabase.from('addresses').insert([{
      ...insertPayload,
      delivery_distance_km: addressData.deliveryDistanceKm ? parseFloat(addressData.deliveryDistanceKm) : null,
      estimated_delivery_charge: addressData.estimatedDeliveryCharge !== undefined ? parseFloat(addressData.estimatedDeliveryCharge) : null
    }]).select().single();

    if (error && (error.message.includes('delivery_distance_km') || error.message.includes('schema cache'))) {
      const retry = await supabase.from('addresses').insert([insertPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError('Failed to create address: ' + error.message, HTTP_STATUS.BAD_REQUEST);
    return data || { id: 'addr-created', ...addressData };
  }

  const newAddr = {
    id: `addr-${Date.now()}`,
    ...addressData,
    isDefault: addressData.isDefault || false
  };
  if (!mockAddresses[userId]) mockAddresses[userId] = [];
  mockAddresses[userId].push(newAddr);
  return newAddr;
};

const updateAddress = async (userId, addressId, addressData) => {
  if (addressData.isDefault) {
    await clearDefaultAddress(userId);
  }

  const payload = {};
  if (addressData.recipientName) payload.recipient_name = addressData.recipientName;
  if (addressData.phone) payload.phone = addressData.phone;
  if (addressData.addressLine1) payload.address_line1 = addressData.addressLine1;
  if (addressData.addressLine2 !== undefined) payload.address_line2 = addressData.addressLine2;
  if (addressData.landmark !== undefined) payload.landmark = addressData.landmark;
  if (addressData.latitude !== undefined) payload.latitude = addressData.latitude ? parseFloat(addressData.latitude) : null;
  if (addressData.longitude !== undefined) payload.longitude = addressData.longitude ? parseFloat(addressData.longitude) : null;
  if (addressData.deliveryDistanceKm !== undefined) payload.delivery_distance_km = addressData.deliveryDistanceKm ? parseFloat(addressData.deliveryDistanceKm) : null;
  if (addressData.estimatedDeliveryCharge !== undefined) payload.estimated_delivery_charge = addressData.estimatedDeliveryCharge !== undefined ? parseFloat(addressData.estimatedDeliveryCharge) : null;
  if (addressData.latitude && addressData.longitude) payload.distance_calculated_at = new Date().toISOString();
  if (addressData.isDefault !== undefined) payload.is_default = addressData.isDefault;

  if (supabase) {
    const { data, error } = await supabase.from('addresses').update(payload).eq('id', addressId).eq('user_id', userId).select().single();
    if (error) throw new AppError('Failed to update address', HTTP_STATUS.BAD_REQUEST);
    return data;
  }

  return { id: addressId, ...addressData };
};

const deleteAddress = async (userId, addressId) => {
  if (supabase) {
    const { error } = await supabase.from('addresses').delete().eq('id', addressId).eq('user_id', userId);
    if (error) throw new AppError('Failed to delete address', HTTP_STATUS.BAD_REQUEST);
    return { message: 'Address deleted successfully' };
  }

  if (mockAddresses[userId]) {
    mockAddresses[userId] = mockAddresses[userId].filter(a => a.id !== addressId);
  }
  return { message: 'Address deleted successfully' };
};

const clearDefaultAddress = async (userId) => {
  if (supabase) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};
