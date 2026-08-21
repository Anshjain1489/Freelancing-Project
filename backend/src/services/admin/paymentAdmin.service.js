const supabase = require('../../config/supabase');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

const getAdminPayments = async (queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    let query = supabase.from('payments')
      .select('*, orders ( order_number, user_id, users ( full_name ) )', { count: 'exact' });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const formatted = (data || []).map(p => ({
      id: p.id,
      orderId: p.order_id,
      orderNumber: p.orders?.order_number,
      customerName: p.orders?.users?.full_name || 'Customer',
      razorpayOrderId: p.razorpay_order_id,
      razorpayPaymentId: p.razorpay_payment_id,
      amount: parseFloat(p.amount),
      status: p.status,
      paymentMethod: p.payment_method,
      createdAt: p.created_at
    }));

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  // Mock Fallback
  const mockPayments = [
    { id: 'pay-1', orderNumber: 'CKS-20260821-0001', customerName: 'Rahul Sharma', razorpayPaymentId: 'pay_mock_123', amount: 650, status: 'PAID', paymentMethod: 'RAZORPAY', createdAt: new Date().toISOString() }
  ];
  return formatPaginatedResponse(mockPayments, page, limit, mockPayments.length);
};

module.exports = { getAdminPayments };
