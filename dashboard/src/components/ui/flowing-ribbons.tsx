'use client';

import { useEffect, useRef } from 'react';

interface ControlPoint {
  baseX: number; baseY: number;
  freqX: number; freqY: number;
  phaseX: number; phaseY: number;
  ampX: number; ampY: number;
}

interface RibbonDef {
  color: string;
  widthFactor: number;   // fraction of canvas height
  peakAlpha: number;     // max opacity at ribbon center
  twistFreq: number;     // how many twist cycles along ribbon
  twistPhase: number;    // offset for twist animation
  speed: number;         // animation speed multiplier
  points: ControlPoint[];
}

const RIBBONS: RibbonDef[] = [
  {
    color: '73, 126, 233', // #497EE9 — wide slow blue
    widthFactor: 0.25,
    peakAlpha: 0.32,
    twistFreq: 2.2,
    twistPhase: 0,
    speed: 1.0,
    points: [
      { baseX: -0.1, baseY: 0.22, freqX: 0.4, freqY: 0.3, phaseX: 0, phaseY: 0.5, ampX: 0.05, ampY: 0.18 },
      { baseX: 0.15, baseY: 0.55, freqX: 0.3, freqY: 0.5, phaseX: 1.2, phaseY: 0.3, ampX: 0.08, ampY: 0.22 },
      { baseX: 0.38, baseY: 0.18, freqX: 0.5, freqY: 0.35, phaseX: 2.5, phaseY: 1.1, ampX: 0.1, ampY: 0.2 },
      { baseX: 0.62, baseY: 0.62, freqX: 0.35, freqY: 0.45, phaseX: 0.8, phaseY: 2.0, ampX: 0.08, ampY: 0.22 },
      { baseX: 0.85, baseY: 0.28, freqX: 0.45, freqY: 0.4, phaseX: 1.5, phaseY: 0.7, ampX: 0.06, ampY: 0.15 },
      { baseX: 1.1, baseY: 0.48, freqX: 0.4, freqY: 0.35, phaseX: 2.0, phaseY: 1.5, ampX: 0.05, ampY: 0.12 },
    ],
  },
  {
    color: '116, 156, 255', // #749CFF — medium light blue
    widthFactor: 0.2,
    peakAlpha: 0.28,
    twistFreq: 2.8,
    twistPhase: 1.8,
    speed: 1.2,
    points: [
      { baseX: -0.1, baseY: 0.65, freqX: 0.5, freqY: 0.4, phaseX: 1.0, phaseY: 0, ampX: 0.06, ampY: 0.15 },
      { baseX: 0.18, baseY: 0.35, freqX: 0.4, freqY: 0.6, phaseX: 0.3, phaseY: 1.8, ampX: 0.1, ampY: 0.2 },
      { baseX: 0.42, baseY: 0.72, freqX: 0.55, freqY: 0.35, phaseX: 2.0, phaseY: 0.5, ampX: 0.08, ampY: 0.18 },
      { baseX: 0.6, baseY: 0.3, freqX: 0.35, freqY: 0.55, phaseX: 1.5, phaseY: 2.3, ampX: 0.1, ampY: 0.22 },
      { baseX: 0.8, baseY: 0.68, freqX: 0.45, freqY: 0.4, phaseX: 0.5, phaseY: 1.0, ampX: 0.06, ampY: 0.15 },
      { baseX: 1.1, baseY: 0.4, freqX: 0.4, freqY: 0.5, phaseX: 1.8, phaseY: 0.8, ampX: 0.05, ampY: 0.12 },
    ],
  },
  {
    color: '124, 58, 237', // #7C3AED — purple
    widthFactor: 0.18,
    peakAlpha: 0.25,
    twistFreq: 3.0,
    twistPhase: 3.5,
    speed: 0.9,
    points: [
      { baseX: -0.1, baseY: 0.48, freqX: 0.45, freqY: 0.5, phaseX: 2.0, phaseY: 1.5, ampX: 0.06, ampY: 0.2 },
      { baseX: 0.2, baseY: 0.78, freqX: 0.55, freqY: 0.35, phaseX: 0.8, phaseY: 0.2, ampX: 0.1, ampY: 0.15 },
      { baseX: 0.45, baseY: 0.38, freqX: 0.4, freqY: 0.6, phaseX: 1.5, phaseY: 2.5, ampX: 0.08, ampY: 0.2 },
      { baseX: 0.68, baseY: 0.72, freqX: 0.5, freqY: 0.4, phaseX: 2.8, phaseY: 0.8, ampX: 0.1, ampY: 0.18 },
      { baseX: 0.88, baseY: 0.35, freqX: 0.4, freqY: 0.55, phaseX: 1.0, phaseY: 1.5, ampX: 0.06, ampY: 0.15 },
      { baseX: 1.1, baseY: 0.55, freqX: 0.45, freqY: 0.4, phaseX: 0.5, phaseY: 2.0, ampX: 0.05, ampY: 0.1 },
    ],
  },
];

// Number of samples along each ribbon curve
const CURVE_SAMPLES = 80;
// Number of strips across ribbon width (more = smoother gradient)
const STRIPS = 20;

/** Evaluate cubic bezier at parameter t */
function cubicBez(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

/** Sample the full Catmull-Rom spline at `n` evenly-spaced parameter values */
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

    // Catmull-Rom → cubic bezier control points
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

/** Draw a single silk ribbon as a mesh of filled strips */
function drawSilkRibbon(
  ctx: CanvasRenderingContext2D,
  ribbon: RibbonDef,
  time: number,
  w: number,
  h: number,
) {
  const center = samplePath(ribbon.points, time, w, h, ribbon.speed, CURVE_SAMPLES);
  const maxWidth = ribbon.widthFactor * h;

  // Pre-compute normals and per-point width
  const data = center.map((p, i) => {
    const prev = center[Math.max(i - 1, 0)];
    const next = center[Math.min(i + 1, CURVE_SAMPLES)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;

    // Normal = perpendicular to tangent
    const nx = -dy / len;
    const ny = dx / len;

    // Width varies along ribbon — simulates 3D twist
    const u = i / CURVE_SAMPLES;
    const twist = Math.sin(u * Math.PI * ribbon.twistFreq + time * 0.6 + ribbon.twistPhase);
    const ribbonW = maxWidth * (0.25 + 0.75 * Math.abs(twist));

    return { x: p.x, y: p.y, nx, ny, w: ribbonW };
  });

  // Draw filled strips from edge to center with gaussian-like alpha falloff
  for (let s = 0; s < STRIPS; s++) {
    const frac0 = s / STRIPS;
    const frac1 = (s + 1) / STRIPS;

    // Distance from center: 0 at frac=0.5, 1 at edges
    const d = Math.max(Math.abs(frac0 * 2 - 1), Math.abs(frac1 * 2 - 1));

    // Gaussian-ish falloff: bright center, soft edges
    const alpha = ribbon.peakAlpha * Math.exp(-d * d * 3.5);
    if (alpha < 0.002) continue;

    ctx.beginPath();

    // Forward edge (top)
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const pt = data[i];
      const offset = (frac0 - 0.5) * pt.w;
      const x = pt.x + pt.nx * offset;
      const y = pt.y + pt.ny * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Backward edge (bottom)
    for (let i = CURVE_SAMPLES; i >= 0; i--) {
      const pt = data[i];
      const offset = (frac1 - 0.5) * pt.w;
      const x = pt.x + pt.nx * offset;
      const y = pt.y + pt.ny * offset;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = `rgba(${ribbon.color}, ${alpha})`;
    ctx.fill();
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
        drawSilkRibbon(ctx!, ribbon, time, w, h);
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
