import React, { useState, useEffect } from 'react';

interface TechNews {
  title: string;
}

interface IndexData {
  name: string;
  value: string;
}

interface GeopoliticsData {
  headline: string;
}

interface OnboardingIntroProps {
  country: string | null;
  onComplete: (intakeData: IntakeData) => void;
}

export interface IntakeData {
  name: string;
  region: string;
  country: string;
  language: string;
}

// Placeholder data fetch functions (replace with real API calls later)
const fetchTechNews = async (): Promise<TechNews[]> => [{ title: 'Diagnostic: Analyzing global trade signals...' }];
const fetchMiningIndex = async (): Promise<IndexData[]> => [{ name: 'LME Copper', value: '$8,450.50' }];
const fetchShippingIndex = async (): Promise<IndexData[]> => [{ name: 'Baltic Dry', value: '1,245.00' }];
const fetchGeopolitics = async (): Promise<GeopoliticsData[]> => [{ headline: 'Stability Alert: Monitoring maritime chokepoints.' }];

export function OnboardingIntro({ country, onComplete }: OnboardingIntroProps) {
  const [step, setStep] = useState<'dashboard' | 'intake' | 'voice'>('dashboard');
  const [intake, setIntake] = useState<IntakeData>({
    name: '',
    region: '',
    country: country || '',
    language: ''
  });
  const [data, setData] = useState({
    tech: [] as TechNews[],
    mining: [] as IndexData[],
    shipping: [] as IndexData[],
    geopolitics: [] as GeopoliticsData[]
  });

  // Load data once when component mounts
  useEffect(() => {
    (async () => {
      try {
        const [tech, mining, shipping, geopolitics] = await Promise.all([
          fetchTechNews(),
          fetchMiningIndex(),
          fetchShippingIndex(),
          fetchGeopolitics(),
        ]);
        setData({ tech, mining, shipping, geopolitics });
      } catch (err) {
        console.error('Failed to fetch diagnostic data', err);
      }
    })();
  }, []);

  const handleIntakeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIntake((prev) => ({ ...prev, [name]: value }));
  };

  const renderDashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>BTC/USD</strong>
        <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>$67,432.12 <span style={{ color: '#0f0', fontSize: '12px' }}>+1.2%</span></p>
      </div>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Forex Index (DXY)</strong>
        <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>104.23 <span style={{ color: '#f00', fontSize: '12px' }}>-0.05%</span></p>
      </div>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Intelligence Stream</strong>
        <p style={{ color: '#fff', fontSize: '13px' }}>{data.tech[0]?.title ?? 'Loading system signals...'}</p>
      </div>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Mining Index</strong>
        <p style={{ color: '#fff', fontSize: '13px' }}>{data.mining[0]?.name}: {data.mining[0]?.value}</p>
      </div>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Logistics (Shipping)</strong>
        <p style={{ color: '#fff', fontSize: '13px' }}>{data.shipping[0]?.name}: {data.shipping[0]?.value}</p>
      </div>
      <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
        <strong style={{ display: 'block', fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Geopolitical Risk</strong>
        <p style={{ color: '#fff', fontSize: '13px' }}>{data.geopolitics[0]?.headline}</p>
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
          marginTop: '32px', width: '100%', padding: '14px', background: '#ff6b35', color: '#000',
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
      <div style={{ margin: '0 auto 24px', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ff6b35' }}>
        <svg fill="#ff6b35" width="24" height="24" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
      </div>
      <h3 style={{ fontSize: '20px', marginBottom: '16px', fontFamily: 'Cormorant Garamond, serif' }}>Optimization: Enable Voice Interface</h3>
      <p style={{ color: '#999', lineHeight: '1.6', marginBottom: '32px' }}>
        Our proprietary diagnostic engine delivers consultant-grade depth (valued at $5,000/hr)
        by analyzing non-verbal cues and nuanced intent. Voice input is highly recommended for maximum precision.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => onComplete(intake)}
          style={{ padding: '14px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          USE VOICE (RECOMMENDED)
        </button>
        <button
          onClick={() => onComplete(intake)}
          style={{ padding: '14px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}
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
          <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px', fontFamily: 'Cormorant Garamond, serif', fontWeight: '300' }}>Diagnostic Interface <span style={{ color: '#ff6b35' }}>v1.4</span></h1>
          {renderDashboard()}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button
              onClick={() => setStep('intake')}
              style={{ padding: '12px 32px', background: '#ff6b35', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
            >
              INITIALIZE INTAKE
            </button>
          </div>
        </div>
      )}
      {step === 'intake' && renderIntake()}
      {step === 'voice' && renderVoiceBanner()}
    </div>
  );
}
