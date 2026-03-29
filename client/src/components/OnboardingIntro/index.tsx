import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface IntakeData {
  name: string;
  region: string;
  country: string;
  language: string;
}

interface OnboardingIntroProps {
  country: string | null;
  onComplete: (intakeData: IntakeData) => void;
}

export function OnboardingIntro({ country, onComplete }: OnboardingIntroProps) {
  const [step, setStep] = useState<'dashboard' | 'intake' | 'voice'>('dashboard');
  const [intake, setIntake] = useState<IntakeData>({
    name: '',
    region: '',
    country: country || '',
    language: ''
  });

  const handleIntakeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIntake((prev: IntakeData) => ({ ...prev, [name]: value }));
  };

  const bootLines = [
    { text: "INITIALIZING DIAGNOSTIC INTERFACE V1.4...", delay: 100 },
    { text: "Kicking off intelligence servers..........[OK]", delay: 600 },
    { text: "Calibrating strategy models...............[OK]", delay: 1200 },
    { text: "Diagnostic Nodes..........................[READY]", delay: 1800 },
    { text: "Connecting to Global Market Sync..........[SYNCED]", delay: 2400 },
    { text: "Scanning correlation metrics..............[OK]", delay: 2900 },
    { text: "All nodes active. Ingestion ready.", delay: 3500 }
  ];

  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    if (step === 'dashboard') {
      const timers = bootLines.map((line, index) => {
        return setTimeout(() => {
          setVisibleLines(index + 1);
        }, line.delay);
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [step]);

  const renderDashboard = () => (
    <div style={{ 
      background: '#0a0a0a', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '24px', 
      maxWidth: '600px', 
      margin: '0 auto', 
      fontFamily: 'monospace',
      fontSize: '14px',
      minHeight: '300px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 0 20px rgba(0,0,0,0.8) inset'
    }}>
      {/* Scanline Overlay */}
      <motion.div
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'rgba(52,211,153,0.1)', zIndex: 5, pointerEvents: 'none' }}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10, position: 'relative' }}>
        {bootLines.slice(0, visibleLines).map((line, i) => {
          const isOK = line.text.includes('[OK]');
          const isReady = line.text.includes('[READY]');
          const isSynced = line.text.includes('[SYNCED]');
          
          let color = '#ccc';
          if (isOK) color = '#fff';
          if (isReady) color = '#34D399';
          if (isSynced) color = '#0f0';

          return (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -5 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.1 }}
              style={{ color }}
            >
              <span style={{ color: '#34D399', marginRight: '8px' }}>&gt;</span>
              {line.text}
            </motion.div>
          );
        })}
        {visibleLines < bootLines.length && (
          <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '10px', height: '16px', background: '#34D399', marginTop: '4px' }} />
        )}
      </div>
    </div>
  );

  const renderIntake = () => (
    <div style={{ padding: '40px 24px', color: '#fff', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontFamily: 'Cormorant Garamond, serif' }}>Diagnostic Initialization</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>PRINCIPAL NAME</span>
          <input
            name="name"
            placeholder="e.g. Alexander Vance"
            value={intake.name}
            onChange={handleIntakeChange}
            style={{ background: '#1a1a1a', border: '1px solid #333', padding: '12px', borderRadius: '6px', color: '#fff', outline: 'none' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>REGION OF OPERATIONS</span>
          <select
            name="region"
            value={intake.region}
            onChange={handleIntakeChange}
            style={{ background: '#1a1a1a', border: '1px solid #333', padding: '12px', borderRadius: '6px', color: '#fff', outline: 'none' }}
          >
            <option value="">Select Region...</option>
            <option value="Asia-Pacific">Asia-Pacific</option>
            <option value="EMEA">Europe, Middle East, Africa</option>
            <option value="North America">North America</option>
            <option value="LATAM">Latin America</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>COUNTRY</span>
          <input
            name="country"
            placeholder="e.g. Singapore"
            value={intake.country}
            onChange={handleIntakeChange}
            style={{ background: '#1a1a1a', border: '1px solid #333', padding: '12px', borderRadius: '6px', color: '#fff', outline: 'none' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>PRIMARY LANGUAGE</span>
          <select
            name="language"
            value={intake.language}
            onChange={handleIntakeChange}
            style={{ background: '#1a1a1a', border: '1px solid #333', padding: '12px', borderRadius: '6px', color: '#fff', outline: 'none' }}
          >
            <option value="">Select Language...</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="Mandarin">Mandarin</option>
            <option value="Arabic">Arabic</option>
            <option value="French">French</option>
          </select>
        </label>
      </div>
      <button
        onClick={() => setStep('voice')}
        disabled={!intake.name || !intake.region}
        style={{
          marginTop: '32px', width: '100%', padding: '14px', background: '#064E3B', color: '#F9FAFB',
          border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
          opacity: (!intake.name || !intake.region) ? 0.5 : 1
        }}
      >
        VALIDATE & CONTINUE
      </button>
    </div>
  );

  const renderVoiceBanner = () => (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#fff', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ margin: '0 auto 24px', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #34D399' }}>
        <svg fill="#34D399" width="24" height="24" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
      </div>
      <h3 style={{ fontSize: '20px', marginBottom: '16px', fontFamily: 'Cormorant Garamond, serif' }}>Optimization: Enable Voice Interface</h3>
      <p style={{ color: '#999', lineHeight: '1.6', marginBottom: '32px', fontFamily: 'Outfit, sans-serif' }}>
        Our proprietary diagnostic engine delivers consultant-grade depth
        by analyzing non-verbal cues and nuanced intent. Voice input is highly recommended for maximum precision.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => onComplete(intake)}
          style={{ padding: '14px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
        >
          USE VOICE (RECOMMENDED)
        </button>
        <button
          onClick={() => onComplete(intake)}
          style={{ padding: '14px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
        >
          CONTINUE WITH TEXT
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#040404', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {step === 'dashboard' && (
        <div style={{ padding: '20px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px', fontFamily: 'Cormorant Garamond, serif', fontWeight: '300' }}>Diagnostic Interface <span style={{ color: '#34D399' }}>v1.4</span></h1>
          {renderDashboard()}
          {visibleLines === bootLines.length && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginTop: '48px' }}>
              <button
                onClick={() => setStep('intake')}
                style={{ padding: '14px 40px', background: '#064E3B', color: '#F9FAFB', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}
              >
                INITIALIZE INTAKE
              </button>
            </motion.div>
          )}
        </div>
      )}
      {step === 'intake' && renderIntake()}
      {step === 'voice' && renderVoiceBanner()}
    </div>
  );
}
