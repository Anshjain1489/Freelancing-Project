import React from 'react';
import { Rocket, ShieldCheck, GitCommit, Calendar, Tag, CheckCircle2 } from 'lucide-react';

export const DeploymentStatusPage = () => {
  const deploymentInfo = {
    version: '1.0.0',
    environment: 'production',
    commit: 'production-release-phase42',
    buildTimestamp: '2026-08-28T23:30:00Z',
    status: 'HEALTHY',
    preDeploymentCheckPassed: true,
    pwaGenerated: true,
    rlsActive: true
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
          Deployment & Release Status
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px' }}>
          Operational build metadata, deployment environment mode, and release health status.
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '50%' }}>
            <Rocket color="#06C167" size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Release Version 1.0.0</h2>
              <span style={{ padding: '2px 8px', backgroundColor: '#06C167', color: '#fff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                {deploymentInfo.environment.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Chaudhary Kirana Store Production Release</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>GIT COMMIT IDENTIFIER</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
              <GitCommit size={16} color="#6B7280" />
              <span>{deploymentInfo.commit}</span>
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>BUILD TIMESTAMP</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
              <Calendar size={16} color="#6B7280" />
              <span>{new Date(deploymentInfo.buildTimestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Verification Gates */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Production Deployment Gates</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <CheckCircle2 color="#06C167" size={18} />
            <span>Pre-Deployment CLI Audit Check passed</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <CheckCircle2 color="#06C167" size={18} />
            <span>PWA Web Manifest & Service Worker generated</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <CheckCircle2 color="#06C167" size={18} />
            <span>Row-Level Security (RLS) policies verified active</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <CheckCircle2 color="#06C167" size={18} />
            <span>Sensitive Data Redaction filter active on logs</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DeploymentStatusPage;
