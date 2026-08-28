import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, AlertTriangle, CheckCircle2, Clock, Cpu, HardDrive } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const SystemHealthPage = () => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHealthData(res.data?.data || null);
    } catch (err) {
      toast.error('Failed to fetch system health diagnostics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading System Health...</div>;
  }

  const app = healthData?.application || {};
  const db = healthData?.database || {};
  const auto = healthData?.automation || {};
  const alerts = healthData?.alerts || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
            System Health & Operational Observability
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px' }}>
            Real-time diagnostics for API server, database connection, automation job runner, and system alerts.
          </p>
        </div>
        <button
          onClick={fetchHealthData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>API SERVER</span>
            <Server color="#06C167" size={20} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06C167', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} />
            <span>ONLINE</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '6px' }}>
            Uptime: {Math.floor((app.uptimeSeconds || 0) / 60)} mins | Memory: {app.memoryUsageMb || 0} MB
          </p>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>DATABASE POOL</span>
            <Database color="#06C167" size={20} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: db.status === 'CONNECTED' ? '#06C167' : '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} />
            <span>{db.status || 'CONNECTED'}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '6px' }}>
            Supabase PostgreSQL Engine
          </p>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>AUTOMATION RUNNER</span>
            <Activity color="#06C167" size={20} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06C167', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} />
            <span>{auto.jobRunnerActive ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '6px' }}>
            Active System Alerts: {auto.activeAlertsCount || 0}
          </p>
        </div>
      </div>

      {/* Recent Automation Job History Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Recent Automation & Cron Job Runs</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', color: '#6B7280' }}>
              <th style={{ padding: '8px 12px' }}>Job Name</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Duration</th>
              <th style={{ padding: '8px 12px' }}>Records Processed</th>
              <th style={{ padding: '8px 12px' }}>Executed At</th>
            </tr>
          </thead>
          <tbody>
            {(auto.recentJobRuns || []).map((job) => (
              <tr key={job.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{job.job_name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: job.status === 'SUCCESS' ? '#E8F7F0' : '#FEE2E2',
                    color: job.status === 'SUCCESS' ? '#06C167' : '#DC2626'
                  }}>
                    {job.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>{job.duration_ms} ms</td>
                <td style={{ padding: '10px 12px' }}>{job.records_processed}</td>
                <td style={{ padding: '10px 12px', color: '#6B7280' }}>{new Date(job.started_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemHealthPage;
