import React, { useEffect, useRef } from 'react';
import type { ScrollTriggerState } from '../../lib/scrollTriggers';
import { useReducedMotion } from '../../lib/animationEasing';

interface Props {
  state: ScrollTriggerState;
  className?: string;
}

export const ScrollLatticeBackground: React.FC<Props> = ({ state, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);
  const reducedMotion = useReducedMotion();

  const getColors = (s: ScrollTriggerState) => {
    switch (s) {
      case 'problem':
        return { node: '#FB7185', conn: '#FB7185' };
      case 'howItWorks':
      case 'whoItFor':
      case 'cta':
        return { node: '#34D399', conn: '#34D399' };
      default:
        return { node: '#F9FAFB', conn: '#F9FAFB' };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize nodes
    if (nodesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    }

    let frameCount = 0;

    const animate = () => {
      frameCount++;

      ctx.fillStyle = 'rgba(9, 9, 15, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const colors = getColors(state);

      nodesRef.current.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Clamp (fix drift)
        if (node.x < 0) {
          node.x = 0;
          node.vx = Math.abs(node.vx);
        } else if (node.x > canvas.width) {
          node.x = canvas.width;
          node.vx = -Math.abs(node.vx);
        }
        if (node.y < 0) {
          node.y = 0;
          node.vy = Math.abs(node.vy);
        } else if (node.y > canvas.height) {
          node.y = canvas.height;
          node.vy = -Math.abs(node.vy);
        }

        ctx.fillStyle = colors.node;
        ctx.globalAlpha = reducedMotion ? 0.4 : 0.6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = reducedMotion ? 0.1 : 0.2;
      ctx.strokeStyle = colors.conn;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const dx = nodesRef.current[i].x - nodesRef.current[j].x;
          const dy = nodesRef.current[i].y - nodesRef.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(nodesRef.current[i].x, nodesRef.current[i].y);
            ctx.lineTo(nodesRef.current[j].x, nodesRef.current[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full pointer-events-none z-0 ${className}`}
    />
  );
};
