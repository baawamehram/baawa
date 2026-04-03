// client/src/components/LandingPage/ProofBar.tsx
import React from 'react';

export const ProofBar: React.FC = () => (
  <div className="bg-saturn-charcoal border-y border-saturn-gray py-6">
    <div className="max-w-7xl mx-auto px-6 flex justify-center gap-8 text-center">
      <div>
        <p className="text-sm font-semibold text-saturn-emerald-light">Solo founders only</p>
      </div>
      <div className="w-px bg-saturn-gray" />
      <div>
        <p className="text-sm font-semibold text-saturn-emerald-light">Selective intake</p>
      </div>
      <div className="w-px bg-saturn-gray" />
      <div>
        <p className="text-sm font-semibold text-saturn-emerald-light">Results in 48hrs</p>
      </div>
    </div>
  </div>
);
