const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const logger = require('../utils/logger');

/**
 * 1. Phone Normalizer Utility
 * Strips non-digits, formats Indian 10-digit mobile numbers with country code 91
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits.length >= 10 ? `91${digits.slice(-10)}` : digits;
};

/**
 * 2. Format Google Maps Link from Address Snapshot
 */
const buildGoogleMapsUrl = (addressObj) => {
  if (!addressObj) return 'https://maps.google.com';
  const parts = [
    addressObj.house_number || addressObj.houseNumber,
    addressObj.street || addressObj.streetAddress,
    addressObj.locality || addressObj.area,
    addressObj.landmark ? `Near ${addressObj.landmark}` : null,
    addressObj.city || 'Mahruni',
    addressObj.state || 'Uttar Pradesh',
    addressObj.pincode || '284405'
  ].filter(Boolean);

  const fullAddressStr = parts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressStr)}`;
};

/**
 * 3. Format Delivery Assignment WhatsApp Message Text
 */
const formatAssignmentMessageText = ({
  partnerName,
  orderNumber,
  customerName,
  customerPhone,
  address,
  items,
  paymentStatus,
  orderAmount,
  estimatedDeliveryAt,
  deliveryNotes,
  googleMapsUrl
}) => {
  let addressStr = 'Address details unavailable';
  if (typeof address === 'string') {
    addressStr = address;
  } else if (address && typeof address === 'object') {
    const parts = [
      address.house_number || address.houseNumber,
      address.street || address.streetAddress,
      address.locality || address.area,
      address.landmark ? `Landmark: ${address.landmark}` : null,
      `${address.city || 'Mahruni'}, ${address.state || 'UP'} - ${address.pincode || '284405'}`
    ].filter(Boolean);
    addressStr = parts.join('\n');
  }

  let itemsListStr = 'Items details unavailable';
  if (Array.isArray(items) && items.length > 0) {
    itemsListStr = items.map(i => `- ${i.product_name || i.name || 'Item'} (Qty: ${i.quantity || 1})`).join('\n');
  } else if (typeof items === 'number') {
    itemsListStr = `${items} item(s)`;
  }

  const estDeliveryStr = estimatedDeliveryAt
    ? new Date(estimatedDeliveryAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : 'Within 30-45 mins';

  return `🚚 *New Delivery Assignment*

Hello ${partnerName || 'Delivery Partner'},

You have been assigned a new delivery.

📦 Order: #${orderNumber}

👤 Customer: ${customerName || 'Valued Customer'}
📞 Phone: ${customerPhone || 'N/A'}

📍 Delivery Address:
${addressStr}

🛒 Items:
${itemsListStr}

💰 Order Amount: ₹${orderAmount || 0}
💳 Payment Status: ${paymentStatus || 'PAID'}

📍 Navigate using Google Maps:
${googleMapsUrl}

⏰ Estimated Delivery:
${estDeliveryStr}

Please accept and complete the delivery through the Delivery Partner dashboard.`;
};

/**
 * 4. Generate Raw WhatsApp Click-to-Chat URL
 */
const generateWhatsAppUrl = (phone, message) => {
  const normalizedPhone = normalizePhone(phone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * 5. Generate Complete WhatsApp Click-to-Chat Link for an Assigned Order
 */
const generateDeliveryAssignmentWhatsAppUrl = async ({ orderId, deliveryPartnerId = null, deliveryNotes = null, estimatedDeliveryAt = null }) => {
  if (!orderId) {
    return { available: false, url: null, error: 'Order ID is required' };
  }

  try {
    let orderData = null;
    let partnerData = null;

    if (supabase) {
      const { data: order } = await supabase.from('orders')
        .select('*, users!orders_user_id_fkey(full_name, phone), order_addresses(*), order_items(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (!order) return { available: false, url: null, error: 'Order not found' };
      orderData = order;

      let targetPartnerId = deliveryPartnerId;
      if (!targetPartnerId) {
        const { data: asgn } = await supabase.from('delivery_assignments')
          .select('delivery_partner_id')
          .eq('order_id', orderId)
          .maybeSingle();
        targetPartnerId = asgn?.delivery_partner_id;
      }

      if (targetPartnerId) {
        const { data: partner } = await supabase.from('users')
          .select('id, full_name, phone')
          .eq('id', targetPartnerId)
          .maybeSingle();
        partnerData = partner;
      }
    } else {
      orderData = {
        id: orderId,
        order_number: `CKS-${orderId.slice(-6)}`,
        total_amount: 499.00,
        payment_status: 'PAID',
        users: { full_name: 'Customer Test', phone: '9876543210' },
        order_addresses: [{ house_number: '12', street: 'Main Market', city: 'Mahruni', pincode: '284405' }],
        order_items: [{ name: 'Rice 5kg', quantity: 1 }]
      };
      partnerData = { id: deliveryPartnerId || 'partner-1', full_name: 'Test Partner', phone: '9876543210' };
    }

    if (!partnerData || !partnerData.phone) {
      return { available: false, url: null, error: 'Delivery partner phone number not found' };
    }

    const rawAddr = orderData.order_addresses?.[0] || {};
    const googleMapsUrl = buildGoogleMapsUrl(rawAddr);

    const messageText = formatAssignmentMessageText({
      partnerName: partnerData.full_name,
      orderNumber: orderData.order_number || `CKS-${orderId.slice(-6)}`,
      customerName: orderData.users?.full_name || 'Customer',
      customerPhone: orderData.users?.phone || 'N/A',
      address: rawAddr,
      items: orderData.order_items || 1,
      paymentStatus: orderData.payment_status || 'PAID',
      orderAmount: orderData.total_amount || 0,
      estimatedDeliveryAt,
      deliveryNotes,
      googleMapsUrl
    });

    const whatsappUrl = generateWhatsAppUrl(partnerData.phone, messageText);

    return {
      available: true,
      url: whatsappUrl,
      phone: normalizePhone(partnerData.phone),
      message: messageText
    };
  } catch (err) {
    logger.warn(`[WHATSAPP_LINK_GEN_WARN] Order ${orderId}: ${err.message}`);
    return { available: false, url: null, error: err.message };
  }
};

/**
 * 6. Admin API Controller Helper to retrieve Click-to-Chat Link for an Order
 */
const getWhatsAppClickToChatLink = async (adminId, orderId) => {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await generateDeliveryAssignmentWhatsAppUrl({ orderId });
  if (!result.available || !result.url) {
    throw new AppError(result.error || 'Failed to generate WhatsApp Click-to-Chat URL', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    success: true,
    whatsappUrl: result.url,
    phone: result.phone,
    message: result.message
  };
};

module.exports = {
  normalizePhone,
  buildGoogleMapsUrl,
  formatAssignmentMessageText,
  generateWhatsAppUrl,
  generateDeliveryAssignmentWhatsAppUrl,
  getWhatsAppClickToChatLink
};
