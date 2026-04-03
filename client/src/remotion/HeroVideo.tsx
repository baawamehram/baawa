// client/src/remotion/HeroVideo.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
} from 'remotion';

const ChaosLattice = ({ frame }: { frame: number }) => {
  // Render chaos lattice with erratic nodes and red flicker
  const nodes: Array<{ id: number; x: number; y: number }> = [];

  for (let i = 0; i < 80; i++) {
    const seed = i * 137.508;
    nodes.push({
      id: i,
      x: ((Math.sin(seed) + 1) / 2) * 100,
      y: ((Math.cos(seed) + 1) / 2) * 100,
    });
  }

  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
      {nodes.map((node) => {
        const flickerCycle = (frame * 2) % 120;
        const isRed = flickerCycle > 60;
        const opacity = 0.5 + Math.sin(frame / 15) * 0.2;

        return (
          <circle
            key={node.id}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r="3"
            fill={isRed ? '#FB7185' : '#F9FAFB'}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
};

export const HeroComposition = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: '#09090f', overflow: 'hidden' }}>
      <ChaosLattice frame={frame} />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, rgba(251, 113, 133, 0.08), transparent)`,
          filter: 'blur(100px)',
        }}
      />
    </AbsoluteFill>
  );
};
