import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { History } from 'lucide-react';

export const ActivityPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await adminService.getActivityLogs();
        setLogs(res.data?.items || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="text-h1">Admin Activity Audit Trail 📜</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Secure audit logs of all store modifications performed by admins
        </p>
      </div>

      <Card padding="20px">
        {loading ? (
          <TableRowSkeleton />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Admin</th>
                  <th style={{ padding: '10px' }}>Action</th>
                  <th style={{ padding: '10px' }}>Resource</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800 }}>{log.adminName}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{log.action}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>{log.resourceType} ({log.resourceId})</td>
                    <td style={{ padding: '12px 10px', color: 'var(--color-text-tertiary)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
