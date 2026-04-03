import { useEffect, useState } from 'react';

export type ScrollTriggerState = 'hero' | 'problem' | 'howItWorks' | 'whoItFor' | 'cta';

export const useScrollSection = (refs: {
  hero: React.RefObject<HTMLDivElement>;
  problem: React.RefObject<HTMLDivElement>;
  howItWorks: React.RefObject<HTMLDivElement>;
  whoItFor: React.RefObject<HTMLDivElement>;
}): ScrollTriggerState => {
  const [section, setSection] = useState<ScrollTriggerState>('hero');

  useEffect(() => {
    const handleIntersection = (targetRef: React.RefObject<HTMLDivElement>, state: ScrollTriggerState) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setSection(state);
        },
        { threshold: 0.3 }
      );
      if (targetRef.current) observer.observe(targetRef.current);
      return observer;
    };

    const observers = [
      handleIntersection(refs.hero, 'hero'),
      handleIntersection(refs.problem, 'problem'),
      handleIntersection(refs.howItWorks, 'howItWorks'),
      handleIntersection(refs.whoItFor, 'whoItFor'),
    ];

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [refs]);

  return section;
};

export const useInViewport = (ref: React.RefObject<HTMLElement>): boolean => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return isInView;
};
