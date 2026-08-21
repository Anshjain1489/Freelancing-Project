import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notification.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { showSuccess, showError } from '../../utils/toast';
import { Bell, CheckCheck, MessageSquare, Settings } from 'lucide-react';

export const NotificationsPage = () => {
  const { notifications, loading, fetchNotifications, markOneRead, markAllRead } = useNotifications();

  const [preferences, setPreferences] = useState({
    inAppOrders: true,
    whatsappOrders: true,
    whatsappPromotions: false
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    fetchNotifications();

    const fetchPrefs = async () => {
      try {
        const res = await notificationService.getPreferences();
        setPreferences(res.data?.preferences || preferences);
      } catch {} finally {
        setLoadingPrefs(false);
      }
    };
    fetchPrefs();
  }, [fetchNotifications]);

  const handlePrefChange = async (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      await notificationService.updatePreferences(updated);
      showSuccess('Notification preferences updated!');
    } catch {
      showError('Failed to update preferences');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'Notifications' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-h1">Notifications Center 🔔</h1>
        <Button variant="outline" size="sm" icon={CheckCheck} onClick={markAllRead}>
          Mark All Read
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Notification Preferences */}
        <Card padding="20px" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--color-primary)" /> WhatsApp & Alert Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Checkbox
              label="Receive Order Updates on WhatsApp 📲"
              checked={preferences.whatsappOrders}
              onChange={(e) => handlePrefChange('whatsappOrders', e.target.checked)}
            />
            <Checkbox
              label="Receive In-App Notifications"
              checked={preferences.inAppOrders}
              onChange={(e) => handlePrefChange('inAppOrders', e.target.checked)}
            />
            <Checkbox
              label="Receive Promotional Offers & Discount Coupons on WhatsApp"
              checked={preferences.whatsappPromotions}
              onChange={(e) => handlePrefChange('whatsappPromotions', e.target.checked)}
            />
          </div>
        </Card>

        {/* Notifications List */}
        <Card padding="24px">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>All Notifications</h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Bell size={40} color="var(--color-text-tertiary)" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              You have no notification alerts.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: item.isRead ? 'var(--color-surface)' : 'var(--color-mint-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: item.isRead ? 600 : 800, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                      {item.title}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {item.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {!item.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markOneRead(item.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
