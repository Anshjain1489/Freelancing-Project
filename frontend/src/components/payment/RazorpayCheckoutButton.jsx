import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { paymentService } from '../../services/payment.service';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { CreditCard } from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const RazorpayCheckoutButton = ({ orderDetails, onSuccess, onError }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!orderDetails) {
      showError('Payment details missing');
      return;
    }

    setLoading(true);

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock';

    // If local mock order ID, handle instant simulated test payment
    if (orderDetails.razorpayOrderId?.startsWith('rzp_order_mock_') || razorpayKey === 'rzp_test_mock') {
      try {
        const verifyRes = await paymentService.verifyRazorpayPayment({
          orderId: orderDetails.orderId,
          razorpayOrderId: orderDetails.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: `mock_sig_${Date.now()}`
        });

        showSuccess('Payment verified successfully! 🎉');
        if (onSuccess) onSuccess(verifyRes);
        navigate(`/orders/${orderDetails.orderId}/confirmation`);
      } catch (err) {
        showError(err.response?.data?.message || 'Payment verification failed');
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showError('Unable to load Razorpay SDK. Please check internet connection.');
      setLoading(false);
      return;
    }

    const options = {
      key: razorpayKey,
      amount: orderDetails.amountInPaise,
      currency: orderDetails.currency || 'INR',
      name: 'Chaudhary Kirana Store',
      description: `Payment for Order #${orderDetails.orderNumber}`,
      image: '/logo.png',
      order_id: orderDetails.razorpayOrderId,
      handler: async (response) => {
        try {
          const verifyRes = await paymentService.verifyRazorpayPayment({
            orderId: orderDetails.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });

          showSuccess('Payment verified successfully! 🎉');
          if (onSuccess) onSuccess(verifyRes);
          navigate(`/orders/${orderDetails.orderId}/confirmation`);
        } catch (err) {
          showError('Payment verification failed.');
          if (onError) onError(err);
        } finally {
          setLoading(false);
        }
      },
      modal: {
        onondismiss: () => {
          setLoading(false);
          showWarning('Payment popup closed. You can retry payment from order details.');
        }
      },
      prefill: {
        name: orderDetails.address?.recipientName || '',
        contact: orderDetails.address?.phone || ''
      },
      theme: {
        color: '#06C167'
      }
    };

    try {
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      showError('Failed to initialize Razorpay checkout popup.');
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="lg"
      fullWidth
      loading={loading}
      icon={CreditCard}
      onClick={handlePayment}
    >
      Pay via Razorpay (₹{orderDetails?.totalAmount || '0'}) 💳
    </Button>
  );
};
