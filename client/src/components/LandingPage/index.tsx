// No state needed — static component

interface Props {
  onStart: () => void
}

export function LandingPage({ onStart }: Props) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#fafaf8', color: '#0a0a0a' }}>

      {/* Section 1 — Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px'
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#0a0a0a' }}>Baawa</span>
        <button onClick={onStart} style={{
          background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer',
          padding: '10px 24px', borderRadius: '6px', fontSize: '14px',
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600
        }}>Apply to work with us</button>
      </nav>

      {/* Section 2 — Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '64px', background: '#fafaf8',
        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '0 24px' }}>
          <div style={{
            fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '24px'
          }}>Marketing Intelligence for Founders</div>
          <h1 style={{ margin: '0 0 24px', lineHeight: 1.0 }}>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 400, color: '#0a0a0a', display: 'block'
            }}>The advisor</div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 700, fontStyle: 'italic', color: '#6366f1', display: 'block'
            }}>agencies fear.</div>
          </h1>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.7, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            We sit between you and every agency you'll ever hire — structuring mandates, writing airtight contracts, and holding them accountable for results.
          </p>
          <button onClick={onStart} style={{
            background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer',
            padding: '16px 36px', borderRadius: '8px', fontSize: '16px',
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: '16px', display: 'block', margin: '0 auto 16px'
          }}>Apply to work with us →</button>
          <div style={{ fontSize: '12px', color: '#999', fontFamily: 'Space Grotesk, sans-serif' }}>
            Selective intake · Assessment required
          </div>
        </div>
      </section>

      {/* Section 3 — Proof Bar */}
      <section style={{ background: '#0a0a0a', padding: '64px 48px' }}>
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
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: '#a5b4fc', marginBottom: '8px' }}>{num}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — The Problem */}
      <section style={{ background: '#f5f5f0', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>The Problem</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0a0a0a', marginBottom: '16px', margin: '0 0 16px' }}>Agencies aren't broken. The relationship is.</h2>
          <p style={{ fontSize: '18px', color: '#555', marginBottom: '48px', maxWidth: '620px' }}>You hired an agency. You got decks, calls, and vague metrics. Here's what actually went wrong.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { num: '01', title: 'No clear mandate', body: 'You told them what you wanted. They heard what they could sell you. Nobody wrote it down properly. Nobody was held to it.' },
              { num: '02', title: 'Wrong agency, wrong stage', body: "You were matched by a referral or a Google search. The agency was great — for someone else's business, at a different stage." },
              { num: '03', title: 'No accountability', body: "When results didn't come, they moved the goalposts. You didn't have the language, the contract, or the leverage to push back." },
            ].map(({ num, title, body }) => (
              <div key={num} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '40px' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '52px', fontWeight: 900, color: '#6366f1', lineHeight: 1, marginBottom: '16px' }}>{num}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0a0a0a', marginBottom: '12px', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</div>
                <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Two Ways We Work */}
      <section style={{ background: '#fafaf8', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>How We Work</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0a0a0a', marginBottom: '48px', margin: '0 0 48px' }}>One firm. Two tracks. One assessment.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>For founders who work with agencies</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#0a0a0a', marginBottom: '16px' }}>Agency Advisory</div>
              <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.7 }}>We structure your mandates, write airtight contracts, hold agencies accountable for results, and match you with the right partner for your stage.</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>For founders who need a trusted advisor</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#0a0a0a', marginBottom: '16px' }}>Business Consultancy</div>
              <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.7 }}>Before any agency enters the picture, we work directly with you — bringing clarity, strategy, and direction to your business challenges.</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '14px', color: '#999', fontFamily: 'Space Grotesk, sans-serif' }}>
            Not sure which applies to you? One assessment figures it out.
          </div>
        </div>
      </section>

      {/* Section 6 — What We Do */}
      <section style={{ background: '#fff', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>What We Do</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0a0a0a', marginBottom: '16px', margin: '0 0 16px' }}>We fix the relationship between founders and agencies.</h2>
          <p style={{ fontSize: '18px', color: '#555', marginBottom: '48px' }}>Four things. Done properly. For founders who are serious about growth.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { icon: '📋', title: 'Structure the mandate', body: "Before you hire anyone, we define exactly what success looks like — in writing, with metrics, with teeth. No more 'brand awareness' as a KPI." },
              { icon: '⚖️', title: 'Write airtight contracts', body: "Agency contracts are written by agencies, for agencies. We rewrite the power balance so you're protected from day one." },
              { icon: '🎯', title: 'Hold them accountable', body: 'Monthly reviews. Hard questions. We sit in the room with you and make sure the agency delivers — or you know exactly when to walk away.' },
              { icon: '🔍', title: 'Match you with the right agency', body: "We've seen hundreds of agencies. We know who's right for your stage, your industry, your budget. No more expensive trial and error." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '40px' }}>
                <div style={{ fontSize: '36px', marginBottom: '20px' }}>{icon}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0a0a0a', marginBottom: '12px', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</div>
                <div style={{ fontSize: '15px', color: '#555', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 — How It Works */}
      <section style={{ background: '#0a0a0a', padding: '96px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>How It Works</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#fff', marginBottom: '64px', margin: '0 0 64px' }}>Three steps. No fluff.</h2>
          <div>
            {[
              { num: '1', title: 'You apply', body: 'Every founder goes through our diagnostic assessment. Brutal, honest, illuminating.' },
              { num: '2', title: 'We assess', body: 'AI-powered questions that go deeper than any agency discovery call ever has.' },
              { num: '3', title: 'We go to work', body: 'Onboarded in 48 hours. Strategy first, agencies second.' },
            ].map(({ num, title, body }, i) => (
              <div key={num} style={{
                display: 'flex', gap: '32px', alignItems: 'flex-start',
                padding: i === 0 ? '0 0 48px' : i === 2 ? '48px 0 0' : '48px 0',
                borderBottom: i < 2 ? '1px solid #1a1a1a' : 'none'
              }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 900, color: '#6366f1', lineHeight: 0.85, flexShrink: 0, width: '80px' }}>{num}</div>
                <div style={{ paddingTop: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</div>
                  <div style={{ fontSize: '15px', color: '#888', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Who This Is For */}
      <section style={{ background: '#fafaf8', padding: '96px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '16px' }}>Who This Is For</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#0a0a0a', marginBottom: '48px', margin: '0 0 48px' }}>Founders who are done being disappointed.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', alignItems: 'start' }}>
            <div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                {[
                  "You've hired at least one agency and felt like you wasted money",
                  "You have a real business with real revenue — you're not experimenting",
                  "You want someone on your side who understands agencies from the inside",
                  "You're ready to be challenged, not just reassured",
                  "You want growth that's measurable, not just visible",
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '16px', color: '#333', lineHeight: 1.5 }}>
                    <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#999', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '12px' }}>Not for everyone</div>
                <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7, margin: 0 }}>If you're looking for someone to validate a bad strategy or just manage your social media, we're not the right fit. We work with founders who want the truth.</p>
              </div>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: '16px', padding: '56px 48px' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontStyle: 'italic', color: '#e0e7ff', lineHeight: 1.5, margin: '0 0 24px' }}>
                "The agency had great case studies. But nobody asked whether I was ready for what they were selling."
              </p>
              <div style={{ fontSize: '13px', color: '#555', fontFamily: 'Space Grotesk, sans-serif' }}>— The founder we built Baawa for</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9 — Final CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1040 100%)', padding: '120px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px', margin: '0 0 24px' }}>
            <span style={{ color: '#fff', display: 'block' }}>Ready to find out</span>
            <span style={{ color: '#fff', display: 'block' }}>
              where you{' '}
              <span style={{ color: '#6366f1', fontStyle: 'italic' }}>actually stand?</span>
            </span>
          </h2>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.7, marginBottom: '40px' }}>
            Take the assessment. 10–15 minutes. The most honest conversation you'll have about your business.
          </p>
          <button onClick={onStart} style={{
            background: '#fff', color: '#0a0a0a', border: 'none', cursor: 'pointer',
            padding: '18px 40px', borderRadius: '8px', fontSize: '16px',
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '20px', display: 'block', margin: '0 auto 20px'
          }}>Begin your assessment →</button>
          <div style={{ fontSize: '11px', color: '#333', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif' }}>
            Selective intake · Assessment required · No sales calls
          </div>
        </div>
      </section>

      {/* Section 10 — Footer */}
      <footer style={{ background: '#0a0a0a', borderTop: '1px solid #111', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#fff' }}>Baawa</span>
        <span style={{ fontSize: '12px', color: '#444', fontFamily: 'Space Grotesk, sans-serif' }}>© 2026 Baawa. All rights reserved.</span>
      </footer>

    </div>
  )
}
