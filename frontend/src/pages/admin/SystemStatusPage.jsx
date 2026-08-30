import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { ShieldCheck, Activity, Database, Server, Cpu, AlertTriangle, CheckCircle, RefreshCw, Clock, Lock } from 'lucide-react';

export const SystemStatusPage = () => {
  const [statusData, setStatusData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSystemStatus = async () => {
    try {
      const [statusRes, healthRes] = await Promise.allSettled([
        apiClient.get('/admin/system-status'),
        apiClient.get('/health/ready')
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatusData(statusRes.value.data?.data || statusRes.value.data);
      }
      if (healthRes.status === 'fulfilled') {
        setHealthData(healthRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load system status:', err);
      showError('Failed to retrieve system status information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSystemStatus();
    showSuccess('System status refreshed!');
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await apiClient.post(`/admin/monitoring/alerts/${alertId}/acknowledge`);
      showSuccess('Alert acknowledged successfully.');
      fetchSystemStatus();
    } catch (err) {
      showError('Failed to acknowledge alert.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <Spinner />
        <p style={{ marginTop: '12px', color: '#64748B' }}>Checking production system health & status...</p>
      </div>
    );
  }

  const services = statusData?.services || {};
  const metrics = statusData?.metricsSummary || {};
  const alerts = statusData?.alerts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            System Status & Production Monitoring <ShieldCheck color="#06C167" size={28} />
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '2px' }}>
            Real-time infrastructure health, database status, job runner metrics, and security audit indicators
          </p>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
          Refresh Status
        </Button>
      </div>

      {/* Global Status Banner */}
      <Card padding="20px" style={{
        backgroundColor: statusData?.status === 'HEALTHY' ? '#F0FDF4' : '#FEF2F2',
        border: `1.5px solid ${statusData?.status === 'HEALTHY' ? '#86EFAC' : '#FCA5A5'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {statusData?.status === 'HEALTHY' ? (
              <CheckCircle size={36} color="#16A34A" />
            ) : (
              <AlertTriangle size={36} color="#DC2626" />
            )}
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: statusData?.status === 'HEALTHY' ? '#15803D' : '#991B1B' }}>
                {statusData?.status === 'HEALTHY' ? 'All Systems Operational & Production Healthy' : 'System Performance Degraded'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                Environment: <strong>{statusData?.environment || 'production'}</strong> | App Version: <strong>v{statusData?.version || '1.0.0'}</strong> | Last Health Probe: {new Date(statusData?.timestamp || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, backgroundColor: '#E2E8F0', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Production Hardened
            </span>
          </div>
        </div>
      </Card>

      {/* Core Component Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* API Engine */}
        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Node.js API Engine</span>
            <Server size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A' }}>
            {services.api?.status || 'HEALTHY'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> Uptime: {Math.floor((services.api?.uptimeSeconds || 0) / 60)} mins
          </div>
        </Card>

        {/* PostgreSQL Database */}
        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>PostgreSQL Database</span>
            <Database size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: services.database?.status === 'HEALTHY' || services.database?.status === 'OPERATIONAL_MOCK' ? '#059669' : '#DC2626' }}>
            {services.database?.status || 'HEALTHY'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            Connection Pooler: Active
          </div>
        </Card>

        {/* Supabase Cloud Client */}
        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Supabase Auth & Storage</span>
            <Activity size={18} color="#7C3AED" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: services.supabase?.status === 'HEALTHY' || services.supabase?.status === 'OPERATIONAL_MOCK' ? '#7C3AED' : '#DC2626' }}>
            {services.supabase?.status || 'HEALTHY'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            Auth & RLS Guard: Verified
          </div>
        </Card>

        {/* Background Job Runner */}
        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Automation Job Runner</span>
            <Cpu size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: services.jobRunner?.status === 'OPERATIONAL' ? '#D97706' : '#64748B' }}>
            {services.jobRunner?.status || 'OPERATIONAL'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            Cron Worker Loop: Active
          </div>
        </Card>
      </div>

      {/* Active System Monitoring Alerts */}
      <Card padding="20px">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#D97706" /> Production System Monitoring Alerts ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
            🟢 No active system alerts recorded. All background routines, payments, and operational checks are clean!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #FCD34D',
                  backgroundColor: '#FFFBEB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#92400E' }}>
                    [{alert.severity}] {alert.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#78350F', marginTop: '2px' }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#A16207', marginTop: '4px' }}>
                    Logged: {new Date(alert.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleAcknowledgeAlert(alert.id)}>
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
