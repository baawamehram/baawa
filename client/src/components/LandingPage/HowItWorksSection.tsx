// client/src/components/LandingPage/HowItWorksSection.tsx
import React from 'react';
import { ScrollLatticeBackground } from './ScrollLatticeBackground';
import { DataFlowVisualization } from './DataFlowVisualization';

const STEPS = [
  { num: '01', title: 'You answer 12 smart questions', desc: 'Quick assessment of your business.' },
  { num: '02', title: 'We read every answer personally', desc: 'No algorithms. Real humans.' },
  { num: '03', title: 'You get a clear report + call', desc: 'What\'s broken. What\'s next.' },
  { num: '04', title: 'We build, train, hand over, exit', desc: 'Systems built. You\'re independent.' },
];

export const HowItWorksSection = React.forwardRef<HTMLDivElement>((_, ref) => (
  <section ref={ref} className="py-20 px-6 bg-saturn-gray relative overflow-hidden">
    <ScrollLatticeBackground state="howItWorks" className="opacity-50" />
    <DataFlowVisualization isVisible={true} />

    <div className="relative z-10 max-w-6xl mx-auto">
      <h2
        className="text-5xl md:text-6xl font-bold text-center mb-16"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        How It Works
      </h2>

      <div className="grid md:grid-cols-4 gap-6">
        {STEPS.map((step) => (
          <div key={step.num} className="bg-saturn-charcoal p-8 rounded">
            <p
              className="text-4xl font-bold text-saturn-emerald-light mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {step.num}
            </p>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-saturn-muted text-sm">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
));

HowItWorksSection.displayName = 'HowItWorksSection';
