import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/animationEasing';

interface Props {
  isVisible: boolean;
}

export const DataFlowVisualization: React.FC<Props> = ({ isVisible }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isVisible || reducedMotion) return;

    const svg = svgRef.current;
    if (!svg) return;

    // Animate data flow along path
    const path = svg.querySelector('path');
    if (!path) return;

    const length = path.getTotalLength();
    let offset = 0;

    const animate = () => {
      offset = (offset + 2) % length;
      // Visual indicator can be added here
      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [isVisible, reducedMotion]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100"
      viewBox="0 0 1200 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', top: -50, left: 0, opacity: isVisible ? 0.6 : 0 }}
    >
      {/* Connect 4 steps with animated path */}
      <path d="M 100 50 Q 350 20 600 50 T 1100 50" stroke="#34D399" strokeWidth="2" fill="none" />
      <circle cx="100" cy="50" r="4" fill="#34D399" />
      <circle cx="400" cy="50" r="4" fill="#34D399" />
      <circle cx="700" cy="50" r="4" fill="#34D399" />
      <circle cx="1100" cy="50" r="4" fill="#34D399" />
    </svg>
  );
};
