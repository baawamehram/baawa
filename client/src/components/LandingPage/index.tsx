import { LogoLight, LogoDark } from '../Logo'

interface Props {
  onStart: () => void
}

export function LandingPage({ onStart }: Props) {
  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', background: '#FDFCFA', color: '#0A0A0A' }}>

      {/* Section 1 — Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(253,252,250,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px'
      }}>
        <LogoLight height={32} />
        <button onClick={onStart} style={{
          background: '#FF6B35', color: '#FAFAFA', border: 'none', cursor: 'pointer',
          padding: '10px 24px', borderRadius: '6px', fontSize: '14px',
          fontFamily: 'Outfit, sans-serif', fontWeight: 600
        }}>Apply to work with us</button>
      </nav>

      {/* Section 2 — Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '64px', background: '#FDFCFA',
        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(255,107,53,0.08) 0%, transparent 70%)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '0 24px' }}>
          <div style={{
            fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '24px'
          }}>Advisor · Consultant · Coach</div>
          <h1 style={{ margin: '0 0 24px', lineHeight: 1.1 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px, 7vw, 84px)',
              fontWeight: 400, color: '#0A0A0A', display: 'block'
            }}>Everyone has that one person</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px, 7vw, 84px)',
              fontWeight: 700, fontStyle: 'italic', color: '#FF6B35', display: 'block'
            }}>they call first.</div>
          </h1>
          <p style={{ fontSize: '18px', color: '#6B6460', lineHeight: 1.7, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Strategy, agencies, mindset, momentum — whatever's blocking you, we clear it.
          </p>
          <button onClick={onStart} style={{
            background: '#FF6B35', color: '#FAFAFA', border: 'none', cursor: 'pointer',
            padding: '16px 36px', borderRadius: '8px', fontSize: '16px',
            fontFamily: 'Outfit, sans-serif', fontWeight: 600, marginBottom: '16px', display: 'block', margin: '0 auto 16px'
          }}>Apply to work with us →</button>
          <div style={{ fontSize: '12px', color: 'rgba(107,100,96,0.7)', fontFamily: 'Outfit, sans-serif' }}>
            Selective intake · Assessment required
          </div>
        </div>
      </section>

      {/* Section 3 — Proof Bar */}
      <section style={{ background: '#1C1E26', padding: '64px 48px' }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'center', gap: '80px', flexWrap: 'wrap'
        }}>
          {[
            { num: '94%', label: 'of founders waste agency budget' },
            { num: '£0', label: 'hidden retainer fees' },
            { num: '48h', label: 'to your first strategic insight' },
            { num: '100%', label: 'founder-side, always' },
          ].map(({ num, label }) => (
            <div key={num} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 700, color: '#FDFCFA', marginBottom: '8px' }}>{num}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(253,252,250,0.5)', fontFamily: 'Outfit, sans-serif' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — The Problem */}
      <section style={{ background: '#F5F0EE', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>The Problem</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0A0A0A', marginBottom: '16px', margin: '0 0 16px' }}>Most founders have the vision. Everything else gets in the way.</h2>
          <p style={{ fontSize: '18px', color: '#6B6460', marginBottom: '48px', maxWidth: '620px' }}>The strategy felt generic. The agencies underdelivered. The momentum never came. Here's why.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { num: '01', title: 'No one actually on your side', body: "You have advisors, agencies, investors. But when something stalls, everyone points at someone else. Nobody is actually fighting for your outcomes." },
              { num: '02', title: 'Momentum keeps dying', body: "You know what needs to happen. But decisions drag, agencies underdeliver, and your energy gets eaten by the wrong things. Nothing moves at the pace it should." },
              { num: '03', title: "You're carrying it alone", body: "The business can only move as fast as you can think clearly and execute boldly. Nobody's helping you do that. And it shows." },
            ].map(({ num, title, body }) => (
              <div key={num} style={{ background: '#fff', border: '1px solid #EEDDD8', borderRadius: '12px', padding: '40px' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '52px', fontWeight: 900, color: '#FF6B35', lineHeight: 1, marginBottom: '16px' }}>{num}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0A0A0A', marginBottom: '12px', fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Two Ways We Work */}
      <section style={{ background: '#FDFCFA', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>How We Work</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0A0A0A', marginBottom: '48px', margin: '0 0 48px' }}>One firm. Three ways in. One assessment.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{ background: '#fff', border: '1px solid #EEDDD8', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>For founders who need clarity and direction</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#0A0A0A', marginBottom: '16px' }}>Business Consultancy</div>
              <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>Before anything else, we get clear on where you are, where you're going, and what's actually blocking you. Then we build the plan that gets you there.</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #EEDDD8', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>For founders who work with agencies</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#0A0A0A', marginBottom: '16px' }}>Agency Advisory</div>
              <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>We structure your mandates, write airtight contracts, hold agencies accountable for results, and match you with the right partner for your stage.</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #EEDDD8', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>For founders who need to unlock their own potential</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#0A0A0A', marginBottom: '16px' }}>Founder Coaching</div>
              <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>Strategy only works when the person behind it is at their best. We work directly with you — your thinking, your confidence, your ability to move when it matters.</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(107,100,96,0.7)', fontFamily: 'Outfit, sans-serif' }}>
            Not sure which applies to you? One assessment figures it out.
          </div>
        </div>
      </section>

      {/* Section 6 — What We Do */}
      <section style={{ background: '#fff', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>What We Do</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0A0A0A', marginBottom: '16px', margin: '0 0 16px' }}>We get founders moving.</h2>
          <p style={{ fontSize: '18px', color: '#6B6460', marginBottom: '48px' }}>Strategy, agencies, momentum — whatever's blocking you, we clear it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { icon: '🧭', title: 'Consulting & strategy', body: "We get clear on where you are, where you need to go, and what's in the way. Then we build the plan and move with you." },
              { icon: '🔥', title: 'Founder coaching', body: "We work on you. Your thinking, your confidence, your ability to make bold calls and execute. The business moves as fast as its founder." },
              { icon: '⚖️', title: 'Agency contracts', body: "Agency contracts are written by agencies, for agencies. We rewrite the power balance so you're protected from day one." },
              { icon: '🎯', title: 'Accountability & results', body: 'Monthly reviews. Hard questions. We make sure whoever you\'re working with delivers — or you know exactly when to walk.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #EEDDD8', borderRadius: '12px', padding: '40px' }}>
                <div style={{ fontSize: '36px', marginBottom: '20px' }}>{icon}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0A0A0A', marginBottom: '12px', fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 — How It Works */}
      <section style={{ background: '#0A0A0A', padding: '96px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>How It Works</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#fff', marginBottom: '64px', margin: '0 0 64px' }}>Three steps. No fluff.</h2>
          <div>
            {[
              { num: '1', title: 'You apply', body: 'Every founder goes through our diagnostic assessment. Brutal, honest, illuminating.' },
              { num: '2', title: 'We assess', body: 'AI-powered questions that go deeper than any agency discovery call ever has.' },
              { num: '3', title: 'We go to work', body: 'Onboarded in 48 hours. Strategy, agencies, coaching — whatever moves the needle first.' },
            ].map(({ num, title, body }, i) => (
              <div key={num} style={{
                display: 'flex', gap: '32px', alignItems: 'flex-start',
                padding: i === 0 ? '0 0 48px' : i === 2 ? '48px 0 0' : '48px 0',
                borderBottom: i < 2 ? '1px solid #111111' : 'none'
              }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 900, color: '#FF6B35', lineHeight: 0.85, flexShrink: 0, width: '80px' }}>{num}</div>
                <div style={{ paddingTop: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                  <div style={{ fontSize: '15px', color: '#6B6460', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Who This Is For */}
      <section style={{ background: '#FDFCFA', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>Who This Is For</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0A0A0A', marginBottom: '48px', margin: '0 0 48px' }}>Founders who are done waiting for things to move.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', alignItems: 'start' }}>
            <div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                {[
                  "You know what you want but can't get it off the ground",
                  "You've hired agencies, advisors, or coaches — and felt like nothing really moved",
                  "You want someone who'll tell you the truth, not reassure you",
                  "You're ready to be challenged — in your thinking, your decisions, your execution",
                  "You want growth that's measurable, not just visible",
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '16px', color: '#3A3530', lineHeight: 1.5 }}>
                    <span style={{ color: '#FF6B35', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: '1px solid #EEDDD8', paddingTop: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(107,100,96,0.7)', fontFamily: 'Outfit, sans-serif', marginBottom: '12px' }}>Not for everyone</div>
                <p style={{ fontSize: '14px', color: '#6B6460', lineHeight: 1.7, margin: 0 }}>If you're looking for someone to validate a bad strategy or just manage your social media, we're not the right fit. We work with founders who want the truth.</p>
              </div>
            </div>
            <div style={{ background: '#0A0A0A', borderRadius: '16px', padding: '56px 48px' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontStyle: 'italic', color: '#FFB09A', lineHeight: 1.5, margin: '0 0 24px' }}>
                "He asked me three questions in twenty minutes that none of my advisors had asked in six months."
              </p>
              <div style={{ fontSize: '13px', color: '#6B6460', fontFamily: 'Outfit, sans-serif' }}>— The founder we built Baawa for</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9 — Final CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 100%)', padding: '120px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px', margin: '0 0 24px' }}>
            <span style={{ color: '#fff', display: 'block' }}>Ready to find out</span>
            <span style={{ color: '#fff', display: 'block' }}>
              where you{' '}
              <span style={{ color: '#FF6B35', fontStyle: 'italic' }}>actually stand?</span>
            </span>
          </h2>
          <p style={{ fontSize: '18px', color: '#6B6460', lineHeight: 1.7, marginBottom: '40px' }}>
            Take the assessment. 10–15 minutes. The most honest conversation you'll have about your business.
          </p>
          <button onClick={onStart} style={{
            background: '#FF6B35', color: '#FAFAFA', border: 'none', cursor: 'pointer',
            padding: '18px 40px', borderRadius: '8px', fontSize: '16px',
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '20px', display: 'block', margin: '0 auto 20px'
          }}>Begin your assessment →</button>
          <div style={{ fontSize: '11px', color: '#3A3530', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
            Selective intake · Assessment required · No sales calls
          </div>
        </div>
      </section>

      {/* Section 10 — Footer */}
      <footer style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LogoDark height={28} />
        <span style={{ fontSize: '12px', color: '#4A4540', fontFamily: 'Outfit, sans-serif' }}>© 2026 Baawa. All rights reserved.</span>
      </footer>

    </div>
  )
}
