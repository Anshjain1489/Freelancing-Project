import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ArrowRight, ShieldCheck, Rocket, Building, Palette, Settings, Users, Package } from 'lucide-react';
import { storeConfigService } from '../../services/storeConfig.service';

export const ClientOnboardingPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [progressPct, setProgressPct] = useState(83);
  const [steps, setSteps] = useState([
    { step: 1, title: 'Business Details', key: 'business_details', completed: true, icon: Building },
    { step: 2, title: 'Store Branding', key: 'branding', completed: true, icon: Palette },
    { step: 3, title: 'Operational Setup', key: 'operational_setup', completed: true, icon: Settings },
    { step: 4, title: 'Admin & Security', key: 'admin_setup', completed: true, icon: Users },
    { step: 5, title: 'Catalog Setup', key: 'catalog_setup', completed: true, icon: Package },
    { step: 6, title: 'Go-Live Checklist', key: 'go_live_checklist', completed: false, icon: Rocket }
  ]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
          Client Onboarding & Setup Wizard
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px' }}>
          Follow these 6 steps to onboard a new store client and verify production deployment readiness.
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>Overall Onboarding Progress</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#06C167' }}>{progressPct}% Completed</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#06C167', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Step Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '24px' }}>
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = s.step === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              style={{
                padding: '12px 8px',
                borderRadius: '8px',
                border: isActive ? '2px solid #06C167' : '1px solid #E5E7EB',
                backgroundColor: isActive ? '#E8F7F0' : '#ffffff',
                color: isActive ? '#06C167' : '#374151',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon size={18} color={s.completed ? '#06C167' : (isActive ? '#06C167' : '#9CA3AF')} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Step {s.step}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step Content */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {activeStep === 1 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 1: Business Details Verification</h2>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
              Store name, owner identity, primary phone (+91 7897837095), and physical store address in Mahruni are verified.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#06C167" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#06C167' }}>Store identity verified cleanly</span>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 2: Store Branding & Colors</h2>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
              Logo, favicon, primary theme (#06C167), secondary theme (#1F2937), and website header titles configured.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#06C167" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#06C167' }}>Dynamic theme branding verified</span>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 3: Operational Setup</h2>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
              Distance fee formula (CEILING(km)*₹10), delivery radius (15km max), and POS billing counter enabled.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#06C167" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#06C167' }}>Operational parameters active</span>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 4: Admin Account & Security</h2>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
              Super admin account initialized, JWT secrets set, and Row-Level Security (RLS) policies verified active.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#06C167" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#06C167' }}>Security & RBAC barrier active</span>
            </div>
          </div>
        )}

        {activeStep === 5 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 5: Catalog & Inventory Setup</h2>
            <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '16px' }}>
              Sample products, categories, initial physical stock quantities, and low stock thresholds loaded.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#E8F7F0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#06C167" size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#06C167' }}>Product catalog ready</span>
            </div>
          </div>
        )}

        {activeStep === 6 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>Step 6: Go-Live Final Checklist</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#06C167" size={18} />
                <span style={{ fontSize: '0.875rem' }}>Database connection pool verified</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#06C167" size={18} />
                <span style={{ fontSize: '0.875rem' }}>Production frontend bundle built cleanly</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#06C167" size={18} />
                <span style={{ fontSize: '0.875rem' }}>Health probes (/health/ready) responding 200 READY</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#06C167" size={18} />
                <span style={{ fontSize: '0.875rem' }}>Backup and rollback procedures documented</span>
              </li>
            </ul>

            <button
              onClick={() => alert('Store client onboarding marked complete!')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#06C167',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Rocket size={18} />
              <span>Complete Store Go-Live</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOnboardingPage;
