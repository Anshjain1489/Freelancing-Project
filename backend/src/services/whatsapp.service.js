const supabase = require('../config/supabase');
const { sendWhatsAppMessage, getWhatsAppConfig } = require('../providers/whatsapp/whatsapp.client');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const logger = require('../utils/logger');

// In-memory fallback notification store for local testing
const mockNotifications = [];

/**
 * Format Google Maps Link from address object
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
 * Build WhatsApp Assignment Message Text
 */
const formatAssignmentMessageText = ({ partnerName, orderNumber, customerName, customerPhone, address, itemCount, paymentStatus, orderAmount, estimatedDeliveryAt, deliveryNotes, googleMapsUrl }) => {
  const addrLines = [
    address.house_number || address.houseNumber,
    address.street || address.streetAddress,
    address.locality || address.area,
    address.landmark ? `Landmark: ${address.landmark}` : null,
    `${address.city || 'Mahruni'}, ${address.state || 'UP'} - ${address.pincode || '284405'}`
  ].filter(Boolean).join('\n');

  return `🚚 *New Delivery Assigned*

Hello ${partnerName}! 👋

You have been assigned a new delivery.

📦 *Order:* #${orderNumber}

👤 *Customer:* ${customerName}
📞 *Phone:* ${customerPhone}

📍 *Delivery Address:*
${addrLines}

🛒 *Items:* ${itemCount}
💳 *Payment Status:* ${paymentStatus}
💰 *Order Amount:* ₹${orderAmount}

⏰ *Estimated Delivery:*
${estimatedDeliveryAt ? new Date(estimatedDeliveryAt).toLocaleString('en-IN') : 'Within 30-45 mins'}

📝 *Delivery Notes:*
${deliveryNotes || 'Standard delivery. Please verify items upon arrival.'}

🗺️ *Open Location:*
${googleMapsUrl}

Please accept and complete the delivery through your Delivery Partner dashboard.

Thank you! 🚚
Chaudhary Kirana Store`;
};

/**
 * 1. Send WhatsApp Notification on Delivery Partner Assignment / Reassignment
 */
const sendDeliveryAssignmentNotification = async ({ orderId, deliveryPartnerId, isReassignment = false, previousPartnerId = null, deliveryNotes = null, estimatedDeliveryAt = null }) => {
  if (!orderId || !deliveryPartnerId) {
    throw new AppError('Order ID and Delivery Partner ID are required for WhatsApp notification', HTTP_STATUS.BAD_REQUEST);
  }

  let orderData = null;
  let partnerData = null;
  let prevPartnerData = null;

  if (supabase) {
    // Fetch Order + Address Snapshot + Customer Details
    const { data: order } = await supabase.from('orders')
      .select('*, users!orders_user_id_fkey(full_name, phone), order_addresses(*), order_items(*)')
      .eq('id', orderId)
      .single();

    if (!order) throw new AppError('Order not found for WhatsApp notification', HTTP_STATUS.NOT_FOUND);
    orderData = order;

    // Fetch Assigned Delivery Partner Details
    const { data: partner } = await supabase.from('users')
      .select('id, full_name, phone')
      .eq('id', deliveryPartnerId)
      .single();

    if (!partner) throw new AppError('Delivery Partner account not found', HTTP_STATUS.NOT_FOUND);
    partnerData = partner;

    // Fetch Previous Partner for Reassignment Notice
    if (isReassignment && previousPartnerId && previousPartnerId !== deliveryPartnerId) {
      const { data: prevP } = await supabase.from('users')
        .select('id, full_name, phone')
        .eq('id', previousPartnerId)
        .maybeSingle();
      prevPartnerData = prevP;
    }
  } else {
    orderData = {
      id: orderId,
      order_number: `CKS-${orderId.slice(-6)}`,
      total_amount: 499.00,
      payment_status: 'PAID',
      users: { full_name: 'Customer Test', phone: '9876543210' },
      order_addresses: [{ house_number: '12', street: 'Main Market', locality: 'Mahruni', city: 'Lalitpur', state: 'UP', pincode: '284405' }],
      order_items: [{ id: '1' }]
    };
    partnerData = { id: deliveryPartnerId, full_name: 'Test Partner', phone: '9000000001' };
  }

  // Validate Partner Phone
  const rawPartnerPhone = partnerData.phone || '';
  const cleanPartnerPhone = rawPartnerPhone.replace(/\D/g, '').slice(-10);
  if (!cleanPartnerPhone || cleanPartnerPhone.length < 10) {
    throw new AppError('Cannot assign delivery notification because the Delivery Partner does not have a valid WhatsApp phone number.', HTTP_STATUS.BAD_REQUEST);
  }

  const rawAddr = orderData.order_addresses?.[0] || {};
  const googleMapsUrl = buildGoogleMapsUrl(rawAddr);

  const messageText = formatAssignmentMessageText({
    partnerName: partnerData.full_name,
    orderNumber: orderData.order_number,
    customerName: orderData.users?.full_name || 'Customer',
    customerPhone: orderData.users?.phone || '9876543210',
    address: rawAddr,
    itemCount: orderData.order_items?.length || 1,
    paymentStatus: orderData.payment_status || 'PAID',
    orderAmount: orderData.total_amount || 0,
    estimatedDeliveryAt,
    deliveryNotes,
    googleMapsUrl
  });

  // Attempt WhatsApp Dispatch via Provider Client
  let dispatchResult = { success: false, status: 'FAILED', messageId: null, errorMessage: null };
  try {
    dispatchResult = await sendWhatsAppMessage({
      to: cleanPartnerPhone,
      templateName: 'delivery_assignment',
      fallbackText: messageText
    });
  } catch (err) {
    logger.error(`[WHATSAPP_ASSIGNMENT_DISPATCH_FAIL] Order: ${orderId} | Error: ${err.message}`);
    dispatchResult = { success: false, status: 'FAILED', errorMessage: err.message };
  }

  const notificationStatus = dispatchResult.success ? 'SENT' : 'FAILED';
  const notificationType = isReassignment ? 'DELIVERY_REASSIGNED' : 'DELIVERY_ASSIGNED';

  // Audit Record Persistence
  if (supabase) {
    const auditPayload = {
      order_id: orderId,
      delivery_partner_id: deliveryPartnerId,
      notification_type: notificationType,
      recipient_phone: cleanPartnerPhone,
      provider: 'WHATSAPP_CLOUD_API',
      status: notificationStatus,
      attempt_count: 1,
      provider_message_id: dispatchResult.messageId || null,
      message_text: messageText,
      error_message: dispatchResult.errorMessage || null,
      sent_at: notificationStatus === 'SENT' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    await supabase.from('whatsapp_delivery_notifications').upsert([auditPayload], { onConflict: 'order_id, delivery_partner_id, notification_type' });
  } else {
    mockNotifications.push({
      id: `wa-notif-${Date.now()}`,
      order_id: orderId,
      delivery_partner_id: deliveryPartnerId,
      notification_type: notificationType,
      recipient_phone: cleanPartnerPhone,
      status: notificationStatus,
      message_text: messageText,
      sent_at: notificationStatus === 'SENT' ? new Date().toISOString() : null
    });
  }

  // Handle Privacy-Safe Previous Partner Notification on Reassignment
  if (isReassignment && prevPartnerData && prevPartnerData.phone) {
    const prevCleanPhone = prevPartnerData.phone.replace(/\D/g, '').slice(-10);
    if (prevCleanPhone && prevCleanPhone.length === 10) {
      const prevRemovalText = `ℹ️ *Delivery Update*\n\nOrder #${orderData.order_number} is no longer assigned to you.\nPlease do not attempt to access or contact the customer regarding this order.`;
      try {
        await sendWhatsAppMessage({
          to: prevCleanPhone,
          templateName: 'delivery_unassigned',
          fallbackText: prevRemovalText
        });
      } catch (prevErr) {
        logger.warn(`[WHATSAPP_PREV_PARTNER_REMOVAL_NOTICE_FAIL] ${prevErr.message}`);
      }
    }
  }

  return {
    success: notificationStatus === 'SENT',
    status: notificationStatus,
    recipientPhone: cleanPartnerPhone,
    messageId: dispatchResult.messageId,
    errorMessage: dispatchResult.errorMessage
  };
};

/**
 * 2. Admin: Resend WhatsApp Delivery Notification
 */
const resendDeliveryNotification = async (adminId, orderId) => {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  let assignment = null;
  if (supabase) {
    const { data: asgn } = await supabase.from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    assignment = asgn;
  } else {
    assignment = { delivery_partner_id: 'partner-1' };
  }

  if (!assignment || assignment.status === 'CANCELLED') {
    throw new AppError('No active delivery assignment found for this order', HTTP_STATUS.NOT_FOUND);
  }

  return await sendDeliveryAssignmentNotification({
    orderId,
    deliveryPartnerId: assignment.delivery_partner_id,
    isReassignment: false,
    deliveryNotes: assignment.notes,
    estimatedDeliveryAt: assignment.estimated_delivery_at
  });
};

/**
 * 3. Admin: Get WhatsApp Notification Status for an Order
 */
const getDeliveryNotifications = async (orderId) => {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: logs } = await supabase.from('whatsapp_delivery_notifications')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return logs || [];
  }

  return mockNotifications.filter(n => String(n.order_id) === String(orderId));
};

module.exports = {
  buildGoogleMapsUrl,
  formatAssignmentMessageText,
  sendDeliveryAssignmentNotification,
  resendDeliveryNotification,
  getDeliveryNotifications
};
