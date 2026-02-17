'use client';

import { useEffect, useRef } from 'react';

interface ControlPoint {
  baseX: number; baseY: number;
  freqX: number; freqY: number;
  phaseX: number; phaseY: number;
  ampX: number; ampY: number;
}

interface StrokePass {
  color: string;
  width: number;
  alpha: number;
}

interface RibbonDef {
  speed: number;
  passes: StrokePass[];
  points: ControlPoint[];
}

// Blue glow → white-blue bright center
const BLUE_PASSES: StrokePass[] = [
  { color: '60, 110, 220', width: 55, alpha: 0.035 },
  { color: '70, 120, 230', width: 28, alpha: 0.08 },
  { color: '90, 145, 255', width: 14, alpha: 0.18 },
  { color: '130, 175, 255', width: 6, alpha: 0.38 },
  { color: '195, 210, 255', width: 2.5, alpha: 0.7 },
  { color: '230, 238, 255', width: 1, alpha: 0.95 },
];

// Light-blue glow → near-white center
const LIGHT_BLUE_PASSES: StrokePass[] = [
  { color: '100, 150, 255', width: 45, alpha: 0.03 },
  { color: '115, 160, 255', width: 22, alpha: 0.07 },
  { color: '140, 180, 255', width: 11, alpha: 0.16 },
  { color: '170, 200, 255', width: 5, alpha: 0.35 },
  { color: '210, 225, 255', width: 2, alpha: 0.65 },
  { color: '240, 245, 255', width: 0.8, alpha: 0.9 },
];

// White-blue subtle accent
const WHITE_PASSES: StrokePass[] = [
  { color: '150, 175, 230', width: 38, alpha: 0.025 },
  { color: '170, 195, 245', width: 18, alpha: 0.06 },
  { color: '195, 210, 255', width: 9, alpha: 0.14 },
  { color: '215, 225, 255', width: 4, alpha: 0.3 },
  { color: '235, 240, 255', width: 1.8, alpha: 0.6 },
  { color: '248, 250, 255', width: 0.7, alpha: 0.85 },
];

const RIBBONS: RibbonDef[] = [
  // ── Bundle 1: main blue sweep (top-left → center-right) ──
  {
    speed: 1.0,
    passes: BLUE_PASSES,
    points: [
      { baseX: -0.15, baseY: -0.05, freqX: 0.35, freqY: 0.25, phaseX: 0, phaseY: 0.5, ampX: 0.04, ampY: 0.12 },
      { baseX: 0.1, baseY: 0.30, freqX: 0.3, freqY: 0.4, phaseX: 1.2, phaseY: 0.3, ampX: 0.06, ampY: 0.14 },
      { baseX: 0.35, baseY: 0.05, freqX: 0.45, freqY: 0.3, phaseX: 2.5, phaseY: 1.1, ampX: 0.08, ampY: 0.12 },
      { baseX: 0.6, baseY: 0.32, freqX: 0.3, freqY: 0.4, phaseX: 0.8, phaseY: 2.0, ampX: 0.06, ampY: 0.14 },
      { baseX: 0.82, baseY: 0.08, freqX: 0.4, freqY: 0.35, phaseX: 1.5, phaseY: 0.7, ampX: 0.05, ampY: 0.10 },
      { baseX: 1.1, baseY: 0.22, freqX: 0.35, freqY: 0.3, phaseX: 2.0, phaseY: 1.5, ampX: 0.04, ampY: 0.08 },
    ],
  },
  // Parallel companion to Bundle 1 (slightly offset)
  {
    speed: 1.0,
    passes: LIGHT_BLUE_PASSES,
    points: [
      { baseX: -0.12, baseY: -0.02, freqX: 0.35, freqY: 0.25, phaseX: 0.15, phaseY: 0.65, ampX: 0.04, ampY: 0.11 },
      { baseX: 0.12, baseY: 0.34, freqX: 0.3, freqY: 0.4, phaseX: 1.35, phaseY: 0.45, ampX: 0.06, ampY: 0.13 },
      { baseX: 0.37, baseY: 0.09, freqX: 0.45, freqY: 0.3, phaseX: 2.65, phaseY: 1.25, ampX: 0.07, ampY: 0.11 },
      { baseX: 0.62, baseY: 0.36, freqX: 0.3, freqY: 0.4, phaseX: 0.95, phaseY: 2.15, ampX: 0.06, ampY: 0.13 },
      { baseX: 0.84, baseY: 0.12, freqX: 0.4, freqY: 0.35, phaseX: 1.65, phaseY: 0.85, ampX: 0.05, ampY: 0.09 },
      { baseX: 1.12, baseY: 0.26, freqX: 0.35, freqY: 0.3, phaseX: 2.15, phaseY: 1.65, ampX: 0.04, ampY: 0.07 },
    ],
  },
  // ── Bundle 2: light blue arc (upper-center → right) ──
  {
    speed: 1.15,
    passes: LIGHT_BLUE_PASSES,
    points: [
      { baseX: 0.2, baseY: -0.08, freqX: 0.4, freqY: 0.35, phaseX: 1.8, phaseY: 0, ampX: 0.05, ampY: 0.10 },
      { baseX: 0.42, baseY: 0.22, freqX: 0.35, freqY: 0.5, phaseX: 0.5, phaseY: 1.6, ampX: 0.07, ampY: 0.14 },
      { baseX: 0.65, baseY: -0.02, freqX: 0.5, freqY: 0.3, phaseX: 2.2, phaseY: 0.8, ampX: 0.06, ampY: 0.12 },
      { baseX: 0.85, baseY: 0.28, freqX: 0.35, freqY: 0.45, phaseX: 1.0, phaseY: 2.2, ampX: 0.07, ampY: 0.14 },
      { baseX: 1.05, baseY: 0.05, freqX: 0.4, freqY: 0.35, phaseX: 2.8, phaseY: 1.0, ampX: 0.05, ampY: 0.10 },
      { baseX: 1.2, baseY: 0.20, freqX: 0.35, freqY: 0.3, phaseX: 0.3, phaseY: 2.5, ampX: 0.03, ampY: 0.06 },
    ],
  },
  // ── Bundle 3: white-blue sweep (right → bottom-left) ──
  {
    speed: 0.9,
    passes: WHITE_PASSES,
    points: [
      { baseX: 1.15, baseY: -0.05, freqX: 0.4, freqY: 0.3, phaseX: 2.5, phaseY: 1.0, ampX: 0.04, ampY: 0.10 },
      { baseX: 0.88, baseY: 0.25, freqX: 0.35, freqY: 0.45, phaseX: 1.2, phaseY: 0.3, ampX: 0.06, ampY: 0.14 },
      { baseX: 0.62, baseY: 0.02, freqX: 0.45, freqY: 0.35, phaseX: 0.5, phaseY: 2.0, ampX: 0.07, ampY: 0.12 },
      { baseX: 0.38, baseY: 0.30, freqX: 0.3, freqY: 0.5, phaseX: 2.0, phaseY: 0.8, ampX: 0.06, ampY: 0.14 },
      { baseX: 0.12, baseY: 0.05, freqX: 0.4, freqY: 0.35, phaseX: 1.5, phaseY: 1.5, ampX: 0.05, ampY: 0.10 },
      { baseX: -0.1, baseY: 0.22, freqX: 0.35, freqY: 0.3, phaseX: 0.8, phaseY: 2.5, ampX: 0.04, ampY: 0.08 },
    ],
  },
  // Parallel companion to Bundle 3
  {
    speed: 0.9,
    passes: WHITE_PASSES,
    points: [
      { baseX: 1.18, baseY: -0.01, freqX: 0.4, freqY: 0.3, phaseX: 2.65, phaseY: 1.15, ampX: 0.04, ampY: 0.09 },
      { baseX: 0.9, baseY: 0.29, freqX: 0.35, freqY: 0.45, phaseX: 1.35, phaseY: 0.45, ampX: 0.06, ampY: 0.13 },
      { baseX: 0.64, baseY: 0.06, freqX: 0.45, freqY: 0.35, phaseX: 0.65, phaseY: 2.15, ampX: 0.07, ampY: 0.11 },
      { baseX: 0.4, baseY: 0.34, freqX: 0.3, freqY: 0.5, phaseX: 2.15, phaseY: 0.95, ampX: 0.06, ampY: 0.13 },
      { baseX: 0.14, baseY: 0.09, freqX: 0.4, freqY: 0.35, phaseX: 1.65, phaseY: 1.65, ampX: 0.05, ampY: 0.09 },
      { baseX: -0.08, baseY: 0.26, freqX: 0.35, freqY: 0.3, phaseX: 0.95, phaseY: 2.65, ampX: 0.04, ampY: 0.07 },
    ],
  },
];

const CURVE_SAMPLES = 80;

/** Evaluate cubic bezier at parameter t */
function cubicBez(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

/** Sample a Catmull-Rom spline at n evenly-spaced points */
function samplePath(
  points: ControlPoint[],
  time: number,
  w: number,
  h: number,
  speed: number,
  n: number,
): { x: number; y: number }[] {
  const t = time * speed;
  const pts = points.map((p) => ({
    x: (p.baseX + Math.sin(t * p.freqX + p.phaseX) * p.ampX) * w,
    y: (p.baseY + Math.sin(t * p.freqY + p.phaseY) * p.ampY) * h,
  }));

  const segs = pts.length - 1;
  const result: { x: number; y: number }[] = [];

  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const g = u * segs;
    const seg = Math.min(Math.floor(g), segs - 1);
    const lt = g - seg;

    const p0 = pts[Math.max(seg - 1, 0)];
    const p1 = pts[seg];
    const p2 = pts[seg + 1];
    const p3 = pts[Math.min(seg + 2, pts.length - 1)];

    const b1x = p1.x + (p2.x - p0.x) / 6;
    const b1y = p1.y + (p2.y - p0.y) / 6;
    const b2x = p2.x - (p3.x - p1.x) / 6;
    const b2y = p2.y - (p3.y - p1.y) / 6;

    result.push({
      x: cubicBez(p1.x, b1x, b2x, p2.x, lt),
      y: cubicBez(p1.y, b1y, b2y, p2.y, lt),
    });
  }

  return result;
}

/** Draw a ribbon as layered strokes: wide dim glow → narrow bright core */
function drawRibbon(
  ctx: CanvasRenderingContext2D,
  ribbon: RibbonDef,
  time: number,
  w: number,
  h: number,
) {
  const center = samplePath(ribbon.points, time, w, h, ribbon.speed, CURVE_SAMPLES);

  for (const pass of ribbon.passes) {
    ctx.beginPath();
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      if (i === 0) ctx.moveTo(center[i].x, center[i].y);
      else ctx.lineTo(center[i].x, center[i].y);
    }
    ctx.strokeStyle = `rgba(${pass.color}, ${pass.alpha})`;
    ctx.lineWidth = pass.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
