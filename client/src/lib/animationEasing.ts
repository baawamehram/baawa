// client/src/lib/animationEasing.ts
export const easingConfig = {
  easeOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeIn: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  buttonSpring: {
    type: 'spring',
    damping: 20,
    stiffness: 300,
  },
};

export const useReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
