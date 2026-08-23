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
    addressObj.house_number || addressObj.houseNumber || addressObj.address_line1,
    addressObj.street || addressObj.streetAddress || addressObj.address_line2,
    addressObj.locality || addressObj.area || addressObj.landmark ? `Landmark: ${addressObj.landmark}` : null,
    addressObj.city || 'Mahruni',
    addressObj.state || 'Madhya Pradesh',
    addressObj.pincode || addressObj.postal_code || addressObj.postalCode || '284405'
  ].filter(Boolean);

  const fullAddressStr = parts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressStr)}`;
};

/**
 * 3. Centralized WhatsApp Delivery Assignment Message Formatter (Phase 20.7 Spec)
 */
const formatDeliveryAssignmentMessage = ({
  order,
  customer,
  address,
  items,
  deliveryPartner,
  estimatedDeliveryAt,
  deliveryNotes
}) => {
  const rawOrderNumber = order?.order_number || order?.orderNumber || (order?.id ? `CKS-${order.id.slice(-6)}` : 'N/A');
  const orderIdStr = String(rawOrderNumber).replace(/^#/, '');

  const customerName = customer?.name || customer?.full_name || order?.users?.full_name || address?.recipient_name || 'Valued Customer';
  const customerPhone = customer?.phone || order?.users?.phone || address?.phone || 'N/A';

  // Format full address
  let fullAddress = 'Address details unavailable';
  const rawAddrObj = Array.isArray(address) ? address[0] : address;
  if (typeof address === 'string') {
    fullAddress = address;
  } else if (rawAddrObj && typeof rawAddrObj === 'object') {
    const parts = [
      rawAddrObj.house_number || rawAddrObj.houseNumber || rawAddrObj.address_line1,
      rawAddrObj.street || rawAddrObj.streetAddress || rawAddrObj.address_line2,
      rawAddrObj.locality || rawAddrObj.area || (rawAddrObj.landmark ? `Landmark: ${rawAddrObj.landmark}` : null),
      rawAddrObj.city || 'Mahruni',
      rawAddrObj.state || 'Madhya Pradesh',
      rawAddrObj.pincode || rawAddrObj.postal_code || rawAddrObj.postalCode || '284405'
    ].filter(Boolean);
    fullAddress = parts.join(', ');
  }

  const googleMapsUrl = buildGoogleMapsUrl(rawAddrObj);

  // Format items
  let itemNames = 'N/A';
  let itemCount = 0;
  const rawItems = items || order?.order_items || order?.items || [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    itemCount = rawItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0);
    itemNames = rawItems.map(i => `${i.product_name || i.name || 'Item'} (x${i.quantity || 1})`).join(', ');
  } else if (typeof rawItems === 'number') {
    itemCount = rawItems;
    itemNames = `${rawItems} item(s)`;
  }

  const amount = order?.total_amount || order?.totalAmount || 0;
  const paymentStatus = order?.payment_status || order?.paymentStatus || 'PAID';

  let estimatedTime = 'Within 30-45 mins';
  if (estimatedDeliveryAt) {
    try {
      estimatedTime = new Date(estimatedDeliveryAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch (e) {
      estimatedTime = String(estimatedDeliveryAt);
    }
  }

  const notes = deliveryNotes || order?.delivery_notes || order?.notes || 'None';

  return `🚚 NEW DELIVERY ASSIGNED

Order ID: #${orderIdStr}

👤 Customer Details
Name: ${customerName}
Phone: ${customerPhone}

📍 Delivery Address
${fullAddress}

🗺️ Google Maps:
${googleMapsUrl}

📦 Order Details
Items: ${itemNames}
Total Items: ${itemCount}

💰 Order Amount: ₹${amount}
💳 Payment Status: ${paymentStatus}

⏰ Estimated Delivery:
${estimatedTime}

📝 Delivery Instructions:
${notes}

Please contact the customer before delivery.

Thank you.`;
};

// Alias formatAssignmentMessageText to formatDeliveryAssignmentMessage for backwards compatibility
const formatAssignmentMessageText = (data) => {
  if (data.orderNumber && !data.order) {
    data.order = { order_number: data.orderNumber, total_amount: data.orderAmount, payment_status: data.paymentStatus };
  }
  if (data.customerName && !data.customer) {
    data.customer = { name: data.customerName, phone: data.customerPhone };
  }
  return formatDeliveryAssignmentMessage(data);
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
          .neq('status', 'CANCELLED')
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

    const messageText = formatDeliveryAssignmentMessage({
      order: orderData,
      customer: orderData.users,
      address: rawAddr,
      items: orderData.order_items,
      deliveryPartner: partnerData,
      estimatedDeliveryAt,
      deliveryNotes: deliveryNotes || orderData.delivery_notes
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
 * Verifies that the order has an active assignment and matches target partner (if specified)
 */
const getWhatsAppClickToChatLink = async (adminId, orderId, reqPartnerId = null) => {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: assignment } = await supabase.from('delivery_assignments')
      .select('*, partner:users!delivery_assignments_delivery_partner_id_fkey(id, full_name, phone)')
      .eq('order_id', orderId)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    if (!assignment) {
      throw new AppError('This order is not currently assigned to any delivery partner.', HTTP_STATUS.FORBIDDEN);
    }

    if (reqPartnerId && String(reqPartnerId) !== String(assignment.delivery_partner_id)) {
      throw new AppError('The specified delivery partner is not assigned to this order.', HTTP_STATUS.FORBIDDEN);
    }

    const result = await generateDeliveryAssignmentWhatsAppUrl({
      orderId,
      deliveryPartnerId: assignment.delivery_partner_id,
      deliveryNotes: assignment.delivery_notes,
      estimatedDeliveryAt: assignment.estimated_delivery_at
    });

    if (!result.available || !result.url) {
      throw new AppError(result.error || 'Failed to generate WhatsApp Click-to-Chat URL', HTTP_STATUS.BAD_REQUEST);
    }

    return {
      success: true,
      whatsappUrl: result.url,
      whatsappMessage: result.message,
      phone: result.phone
    };
  }

  // Fallback for memory/mock mode
  const result = await generateDeliveryAssignmentWhatsAppUrl({ orderId, deliveryPartnerId: reqPartnerId });
  if (!result.available || !result.url) {
    throw new AppError(result.error || 'Failed to generate WhatsApp Click-to-Chat URL', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    success: true,
    whatsappUrl: result.url,
    whatsappMessage: result.message,
    phone: result.phone
  };
};

module.exports = {
  normalizePhone,
  buildGoogleMapsUrl,
  formatDeliveryAssignmentMessage,
  formatAssignmentMessageText,
  generateWhatsAppUrl,
  generateDeliveryAssignmentWhatsAppUrl,
  getWhatsAppClickToChatLink
};
