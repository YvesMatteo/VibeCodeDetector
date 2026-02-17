'use client';

import { useEffect, useRef } from 'react';

interface Ribbon {
  color: string;
  points: { baseX: number; baseY: number; freqX: number; freqY: number; phaseX: number; phaseY: number; ampX: number; ampY: number }[];
  passes: { width: number; alpha: number }[];
}

const RIBBONS: Ribbon[] = [
  {
    color: '73, 126, 233', // #497EE9
    points: [
      { baseX: -0.05, baseY: 0.3, freqX: 0.7, freqY: 0.5, phaseX: 0, phaseY: 0.5, ampX: 0.08, ampY: 0.12 },
      { baseX: 0.2, baseY: 0.5, freqX: 0.5, freqY: 0.8, phaseX: 1.2, phaseY: 0.3, ampX: 0.1, ampY: 0.15 },
      { baseX: 0.45, baseY: 0.25, freqX: 0.6, freqY: 0.4, phaseX: 2.5, phaseY: 1.1, ampX: 0.12, ampY: 0.1 },
      { baseX: 0.7, baseY: 0.55, freqX: 0.4, freqY: 0.7, phaseX: 0.8, phaseY: 2.0, ampX: 0.1, ampY: 0.12 },
      { baseX: 1.05, baseY: 0.35, freqX: 0.55, freqY: 0.6, phaseX: 1.5, phaseY: 0.7, ampX: 0.08, ampY: 0.1 },
    ],
    passes: [
      { width: 28, alpha: 0.04 },
      { width: 14, alpha: 0.08 },
      { width: 5, alpha: 0.2 },
      { width: 1.5, alpha: 0.6 },
    ],
  },
  {
    color: '116, 156, 255', // #749CFF
    points: [
      { baseX: -0.05, baseY: 0.65, freqX: 0.6, freqY: 0.7, phaseX: 1.0, phaseY: 0, ampX: 0.1, ampY: 0.1 },
      { baseX: 0.25, baseY: 0.4, freqX: 0.8, freqY: 0.5, phaseX: 0.3, phaseY: 1.8, ampX: 0.12, ampY: 0.14 },
      { baseX: 0.5, baseY: 0.7, freqX: 0.5, freqY: 0.9, phaseX: 2.0, phaseY: 0.5, ampX: 0.1, ampY: 0.12 },
      { baseX: 0.75, baseY: 0.35, freqX: 0.7, freqY: 0.6, phaseX: 1.5, phaseY: 2.3, ampX: 0.12, ampY: 0.1 },
      { baseX: 1.05, baseY: 0.6, freqX: 0.6, freqY: 0.5, phaseX: 0.5, phaseY: 1.0, ampX: 0.08, ampY: 0.12 },
    ],
    passes: [
      { width: 22, alpha: 0.04 },
      { width: 10, alpha: 0.08 },
      { width: 4, alpha: 0.18 },
      { width: 1.2, alpha: 0.5 },
    ],
  },
  {
    color: '124, 58, 237', // #7C3AED
    points: [
      { baseX: -0.05, baseY: 0.5, freqX: 0.5, freqY: 0.6, phaseX: 2.0, phaseY: 1.5, ampX: 0.1, ampY: 0.15 },
      { baseX: 0.22, baseY: 0.75, freqX: 0.7, freqY: 0.4, phaseX: 0.8, phaseY: 0.2, ampX: 0.12, ampY: 0.1 },
      { baseX: 0.48, baseY: 0.45, freqX: 0.6, freqY: 0.8, phaseX: 1.5, phaseY: 2.5, ampX: 0.1, ampY: 0.14 },
      { baseX: 0.73, baseY: 0.7, freqX: 0.8, freqY: 0.5, phaseX: 2.8, phaseY: 0.8, ampX: 0.12, ampY: 0.12 },
      { baseX: 1.05, baseY: 0.45, freqX: 0.5, freqY: 0.7, phaseX: 1.0, phaseY: 1.5, ampX: 0.08, ampY: 0.1 },
    ],
    passes: [
      { width: 24, alpha: 0.03 },
      { width: 12, alpha: 0.07 },
      { width: 4.5, alpha: 0.16 },
      { width: 1.3, alpha: 0.45 },
    ],
  },
];

function getPoint(p: Ribbon['points'][number], t: number, w: number, h: number) {
  return {
    x: (p.baseX + Math.sin(t * p.freqX + p.phaseX) * p.ampX) * w,
    y: (p.baseY + Math.sin(t * p.freqY + p.phaseY) * p.ampY) * h,
  };
}

function drawRibbon(ctx: CanvasRenderingContext2D, ribbon: Ribbon, t: number, w: number, h: number) {
  const pts = ribbon.points.map((p) => getPoint(p, t, w, h));

  for (const pass of ribbon.passes) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${ribbon.color}, ${pass.alpha})`;
    ctx.lineWidth = pass.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Move to first point
    ctx.moveTo(pts[0].x, pts[0].y);

    // Catmull-Rom through all points → cubic bezier segments
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.stroke();
  }
}

export function FlowingRibbons({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId = 0;
    let time = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx!.clearRect(0, 0, w, h);

      for (const ribbon of RIBBONS) {
        drawRibbon(ctx!, ribbon, time, w, h);
      }
    }

    function loop() {
      time += 0.003;
      draw();
      animId = requestAnimationFrame(loop);
    }

    resize();

    if (prefersReducedMotion) {
      // Draw single static frame
      draw();
    } else {
      loop();
    }

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
