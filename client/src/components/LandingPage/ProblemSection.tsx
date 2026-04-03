// client/src/components/LandingPage/ProblemSection.tsx
import React, { useRef } from 'react';
import { ScrollLatticeBackground } from './ScrollLatticeBackground';

export const ProblemSection = React.forwardRef<HTMLDivElement>((_, ref) => (
  <section
    ref={ref}
    className="py-20 px-6 bg-saturn-charcoal relative overflow-hidden"
  >
    <ScrollLatticeBackground state="problem" className="opacity-40" />

    <div className="relative z-10 max-w-4xl mx-auto text-center">
      <h2
        className="text-5xl md:text-6xl font-bold mb-12 leading-tight"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        The internet sold you 47 tools. None of them talk to each other. And you're still doing everything manually.
      </h2>

      <div className="space-y-6 text-lg text-saturn-muted">
        <div className="flex items-start gap-4">
          <span className="text-saturn-emerald-light font-bold mt-1">✓</span>
          <p>Every tool requires manual data entry. Copy-paste. No workflows.</p>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-saturn-emerald-light font-bold mt-1">✓</span>
          <p>Your tools don't talk to each other. You're the glue.</p>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-saturn-emerald-light font-bold mt-1">✓</span>
          <p>You're drowning in admin work that a £50 tool could solve — if they integrated.</p>
        </div>
      </div>
    </div>
  </section>
));

ProblemSection.displayName = 'ProblemSection';
