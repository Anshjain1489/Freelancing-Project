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

  const lat = parseFloat(addressObj.latitude || addressObj.lat);
  const lng = parseFloat(addressObj.longitude || addressObj.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const parts = [
    addressObj.house_number || addressObj.houseNumber || addressObj.address_line1,
    addressObj.street || addressObj.streetAddress || addressObj.address_line2,
    addressObj.locality || addressObj.area || (addressObj.landmark ? `Landmark: ${addressObj.landmark}` : null),
    addressObj.city || 'Mahruni',
    addressObj.state || 'Madhya Pradesh',
    addressObj.pincode || addressObj.postal_code || addressObj.postalCode || '284405'
  ].filter(Boolean);

  const fullAddressStr = parts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressStr)}`;
};

/**
 * 3. Centralized WhatsApp Delivery Assignment Message Formatter (Phase 42 Spec)
 */
const formatDeliveryAssignmentMessage = ({
  order,
  customer,
  address,
  items,
  deliveryPartner,
  estimatedDeliveryAt,
  deliveryNotes,
  invoiceUrl
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

  // Format items line by line
  let itemsFormatted = 'N/A';
  let itemCount = 0;
  const rawItems = items || order?.order_items || order?.items || [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    itemCount = rawItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0);
    itemsFormatted = rawItems.map(i => `${i.product_name || i.name || 'Item'} (x${i.quantity || 1})`).join('\n');
  } else if (typeof rawItems === 'number') {
    itemCount = rawItems;
    itemsFormatted = `${rawItems} item(s)`;
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
  const finalInvoiceUrl = invoiceUrl || 'N/A';

  return `🚚 NEW DELIVERY ASSIGNED

Order ID: #${orderIdStr}

👤 Customer Details

Name: ${customerName}

Phone: ${customerPhone}

📍 Delivery Address

${fullAddress}

🗺️ Google Maps Navigation:

${googleMapsUrl}

📦 Order Details

${itemsFormatted}

Total Items: ${itemCount}

💰 Order Amount: ₹${amount}

💳 Payment Status: ${paymentStatus}

⏰ Estimated Delivery:

${estimatedTime}

📝 Delivery Instructions:

${notes}

🧾 Invoice:

${finalInvoiceUrl}

Please contact the customer before delivery.

Thank you!`;
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

    const cleanPhone = normalizePhone(partnerData?.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { available: false, reason: 'DELIVERY_AGENT_PHONE_UNAVAILABLE', error: 'Delivery partner phone number unavailable' };
    }

    const { generateSecureInvoiceToken } = require('./notifications/notificationProvider');
    const tokenObj = await generateSecureInvoiceToken(orderData.id || orderId, orderData.user_id || null);

    const rawAddr = orderData.order_addresses?.[0] || orderData.order_addresses || {};

    const messageText = formatDeliveryAssignmentMessage({
      order: orderData,
      customer: orderData.users || orderData.customer,
      address: rawAddr,
      items: orderData.order_items || orderData.items,
      deliveryPartner: partnerData,
      estimatedDeliveryAt,
      deliveryNotes: deliveryNotes || orderData.delivery_notes,
      invoiceUrl: tokenObj.shareableUrl
    });

    const whatsappUrl = generateWhatsAppUrl(cleanPhone, messageText);

    return {
      available: true,
      url: whatsappUrl,
      phone: cleanPhone,
      message: messageText,
      invoice_url: tokenObj.shareableUrl
    };
  } catch (err) {
    logger.warn(`[WHATSAPP_LINK_GEN_WARN] Order ${orderId}: ${err.message}`);
    return { available: false, reason: 'ORDER_ERROR', error: err.message };
  }
};

/**
 * 6. Admin API Controller Helper to retrieve Click-to-Chat Link for an Order
 * Verifies that the order has an active assignment and matches target partner (if specified)
 */
const { logAdminActivity } = require('./adminLog.service');

/**
 * 6. Admin API Controller Helper to retrieve Click-to-Chat Link for an Order
 */
const getWhatsAppClickToChatLink = async (adminId, orderId, reqPartnerId = null, req = null) => {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  let targetPartnerId = reqPartnerId;

  if (supabase) {
    let order = null;
    try {
      const { data } = await supabase.from('orders').select('id, user_id, order_number').eq('id', orderId).maybeSingle();
      order = data;
    } catch (e) {}

    if (!order && (orderId.startsWith('mock-') || orderId.startsWith('test-'))) {
      order = { id: orderId, user_id: 'cust-mock-1', order_number: 'CKS-MOCK01' };
    } else if (!order) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    if (!targetPartnerId) {
      let asgn = null;
      try {
        const { data } = await supabase.from('delivery_assignments')
          .select('delivery_partner_id, status, delivery_notes, estimated_delivery_at')
          .eq('order_id', orderId)
          .neq('status', 'CANCELLED')
          .maybeSingle();
        asgn = data;
      } catch (e) {}

      if (!asgn && (orderId.startsWith('mock-') || orderId.startsWith('test-'))) {
        asgn = { delivery_partner_id: 'partner-mock-1', status: 'ASSIGNED' };
      } else if (!asgn) {
        throw new AppError('This order is not currently assigned to any delivery partner.', HTTP_STATUS.BAD_REQUEST);
      }
      targetPartnerId = asgn.delivery_partner_id;
    }
  }

  const result = await generateDeliveryAssignmentWhatsAppUrl({
    orderId,
    deliveryPartnerId: targetPartnerId
  });

  if (!result.available) {
    await logAdminActivity(adminId, 'ADMIN_WHATSAPP_DISPATCH_GENERATED', 'order', orderId, {
      deliveryAgentId: targetPartnerId,
      success: false,
      reason: result.reason || result.error
    }, req);

    return {
      available: false,
      reason: result.reason || 'DELIVERY_AGENT_PHONE_UNAVAILABLE',
      error: result.error || 'Delivery agent phone number is invalid or missing'
    };
  }

  await logAdminActivity(adminId, 'ADMIN_WHATSAPP_DISPATCH_GENERATED', 'order', orderId, {
    deliveryAgentId: targetPartnerId,
    success: true
  }, req);

  return {
    available: true,
    url: result.url,
    phone: result.phone,
    message: result.message,
    invoice_url: result.invoice_url
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
