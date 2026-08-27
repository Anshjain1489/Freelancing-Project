import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { useCart } from '../../hooks/useCart';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError, showInfo } from '../../utils/toast';
import { ShoppingBag, ArrowRight, RotateCcw } from 'lucide-react';

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState(null);

  const handleReorder = async (order) => {
    setReorderingId(order.id);
    try {
      // Fetch full order details to get item list
      const detailsRes = await orderService.getOrderById(order.id);
      const fullOrder = detailsRes.data?.order || detailsRes.data || order;
      const itemsToReorder = fullOrder.items || [];

      if (!itemsToReorder || itemsToReorder.length === 0) {
        showError('No items found in this order to reorder.');
        return;
      }

      let addedCount = 0;
      let unavailableCount = 0;

      for (const item of itemsToReorder) {
        // Construct product object using current prices and stock
        const prodPayload = {
          id: item.product_id || item.productId || item.id,
          name: item.product_name || item.name,
          sellingPrice: item.sellingPrice || item.unit_price || item.unitPrice,
          imageUrl: item.imageUrl || item.image_url,
          unit: item.unit,
          unitValue: item.unitValue || item.unit_value
        };

        if (prodPayload.id) {
          addItem(prodPayload, item.quantity || 1);
          addedCount += 1;
        } else {
          unavailableCount += 1;
        }
      }

      if (addedCount > 0) {
        showSuccess(`🔄 ${addedCount} item(s) added to cart.${unavailableCount > 0 ? ` ${unavailableCount} item(s) unavailable.` : ''}`);
        navigate('/cart');
      } else {
        showInfo('Items from this order are currently unavailable.');
      }
    } catch (err) {
      console.error('Reorder error:', err);
      showError('Failed to reorder items');
    } finally {
      setReorderingId(null);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await orderService.getUserOrders();
        setOrders(res.data?.items || []);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const handleRealtimeStatus = (e) => {
      const data = e.detail;
      if (!data) return;
      const targetId = String(data.orderId || data.id || '');
      const newStatus = data.newStatus || data.status;
      if (!newStatus || !targetId) return;

      setOrders(prev => prev.map(o => {
        if (String(o.id) === targetId || String(o.orderNumber) === targetId) {
          return { ...o, status: newStatus };
        }
        return o;
      }));
    };

    window.addEventListener('cks_order_status_updated', handleRealtimeStatus);
    return () => window.removeEventListener('cks_order_status_updated', handleRealtimeStatus);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'My Orders' }]} />

      <h1 className="text-h1">My Order History 📦</h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders placed yet"
          description="Your completed and active Kirana orders will appear here."
          actionLabel="Start Shopping"
          onAction={() => navigate('/products')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <Card key={order.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>Order #{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Placed on: {new Date(order.createdAt).toLocaleDateString()} • {order.itemCount} items
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                    {formatCurrency(order.totalAmount)}
                  </span>
                  {['DELIVERED', 'COMPLETED'].includes(order.status) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      loading={reorderingId === order.id}
                      onClick={() => handleReorder(order)}
                    >
                      🔄 Reorder Items
                    </Button>
                  )}
                  <Button variant="outline" size="sm" icon={ArrowRight} onClick={() => navigate(`/orders/${order.id}`)}>
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
