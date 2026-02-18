'use client';

import { useEffect, useRef } from 'react';

/**
 * Prismatic Flowing Ribbons — MONO AI–inspired
 *
 * Canvas-based animated ribbons that sweep diagonally with iridescent
 * gradient coloring (blue → teal → green → gold → purple). Each ribbon
 * is drawn with multiple stroked passes (wide dim glow → narrow bright core)
 * and a linear gradient along its length for the prismatic effect.
 *
 * GPU-friendly: uses requestAnimationFrame, capped DPR, reduced passes on mobile.
 */

interface ControlPoint {
  baseX: number; baseY: number;
  freqX: number; freqY: number;
  phaseX: number; phaseY: number;
  ampX: number; ampY: number;
}

interface RibbonDef {
  colorStops: [number, number, number][]; // RGB color stops along the ribbon
  widthFactor: number;
  peakAlpha: number;
  speed: number;
  points: ControlPoint[];
}

// White and blue color palette
const SPECTRUM_A: [number, number, number][] = [
  [220, 230, 255],  // ice white
  [60, 100, 220],   // deep blue
  [140, 170, 255],  // light blue
  [240, 245, 255],  // bright white
  [80, 130, 240],   // mid blue
  [200, 215, 255],  // pale blue
];

const SPECTRUM_B: [number, number, number][] = [
  [80, 130, 240],   // mid blue
  [240, 245, 255],  // bright white
  [50, 80, 200],    // royal blue
  [180, 200, 255],  // soft blue
  [255, 255, 255],  // pure white
  [100, 150, 245],  // sky blue
];

const SPECTRUM_C: [number, number, number][] = [
  [255, 255, 255],  // pure white
  [70, 110, 230],   // blue
  [200, 215, 255],  // pale blue
  [40, 80, 190],    // dark blue
  [220, 230, 255],  // ice white
  [120, 160, 250],  // periwinkle
];

const SPECTRUM_D: [number, number, number][] = [
  [140, 170, 255],  // light blue
  [255, 255, 255],  // pure white
  [60, 100, 220],   // deep blue
  [220, 230, 255],  // ice white
  [90, 140, 240],   // cornflower
  [240, 245, 255],  // bright white
];

const SPECTRUM_E: [number, number, number][] = [
  [50, 80, 200],    // royal blue
  [200, 215, 255],  // pale blue
  [255, 255, 255],  // pure white
  [80, 130, 240],   // mid blue
  [230, 240, 255],  // frosty white
  [60, 100, 220],   // deep blue
];

// 5 ribbons sweeping diagonally across the viewport
const RIBBONS: RibbonDef[] = [
  {
    // Wide dominant ribbon — bottom-left to upper-right
    colorStops: SPECTRUM_A,
    widthFactor: 0.18,
    peakAlpha: 0.7,
    speed: 0.8,
    points: [
      { baseX: -0.15, baseY: 0.90, freqX: 0.6, freqY: 0.5, phaseX: 0, phaseY: 0, ampX: 0.08, ampY: 0.12 },
      { baseX: 0.10, baseY: 0.60, freqX: 0.5, freqY: 0.7, phaseX: 1.0, phaseY: 0.5, ampX: 0.12, ampY: 0.18 },
      { baseX: 0.30, baseY: 0.35, freqX: 0.7, freqY: 0.6, phaseX: 2.0, phaseY: 1.2, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.55, baseY: 0.15, freqX: 0.6, freqY: 0.8, phaseX: 0.5, phaseY: 2.0, ampX: 0.12, ampY: 0.18 },
      { baseX: 0.80, baseY: 0.05, freqX: 0.8, freqY: 0.6, phaseX: 1.5, phaseY: 0.8, ampX: 0.10, ampY: 0.15 },
      { baseX: 1.15, baseY: -0.10, freqX: 0.6, freqY: 0.5, phaseX: 2.5, phaseY: 1.5, ampX: 0.06, ampY: 0.10 },
    ],
  },
  {
    // Second ribbon — arcs higher, more curves
    colorStops: SPECTRUM_B,
    widthFactor: 0.14,
    peakAlpha: 0.6,
    speed: 1.0,
    points: [
      { baseX: -0.10, baseY: 0.75, freqX: 0.7, freqY: 0.6, phaseX: 1.5, phaseY: 0.3, ampX: 0.10, ampY: 0.15 },
      { baseX: 0.12, baseY: 0.45, freqX: 0.6, freqY: 0.9, phaseX: 0.3, phaseY: 1.5, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.35, baseY: 0.55, freqX: 0.9, freqY: 0.7, phaseX: 2.2, phaseY: 0.7, ampX: 0.18, ampY: 0.18 },
      { baseX: 0.58, baseY: 0.25, freqX: 0.6, freqY: 1.0, phaseX: 1.0, phaseY: 2.5, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.82, baseY: 0.15, freqX: 0.8, freqY: 0.7, phaseX: 0.8, phaseY: 1.2, ampX: 0.10, ampY: 0.15 },
      { baseX: 1.12, baseY: 0.00, freqX: 0.7, freqY: 0.6, phaseX: 2.0, phaseY: 0.5, ampX: 0.06, ampY: 0.10 },
    ],
  },
  {
    // Third ribbon — thinner, faster, takes a different path
    colorStops: SPECTRUM_C,
    widthFactor: 0.11,
    peakAlpha: 0.55,
    speed: 1.2,
    points: [
      { baseX: -0.05, baseY: 1.05, freqX: 0.8, freqY: 0.7, phaseX: 2.0, phaseY: 1.0, ampX: 0.08, ampY: 0.12 },
      { baseX: 0.15, baseY: 0.70, freqX: 0.7, freqY: 1.0, phaseX: 0.8, phaseY: 2.0, ampX: 0.14, ampY: 0.20 },
      { baseX: 0.40, baseY: 0.45, freqX: 1.0, freqY: 0.8, phaseX: 1.5, phaseY: 0.3, ampX: 0.18, ampY: 0.18 },
      { baseX: 0.65, baseY: 0.30, freqX: 0.7, freqY: 1.1, phaseX: 2.5, phaseY: 1.8, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.90, baseY: 0.10, freqX: 0.9, freqY: 0.7, phaseX: 0.5, phaseY: 0.5, ampX: 0.10, ampY: 0.15 },
      { baseX: 1.15, baseY: -0.05, freqX: 0.7, freqY: 0.6, phaseX: 1.8, phaseY: 2.5, ampX: 0.06, ampY: 0.10 },
    ],
  },
  {
    // Fourth ribbon — crosses from upper-left
    colorStops: SPECTRUM_D,
    widthFactor: 0.12,
    peakAlpha: 0.5,
    speed: 0.9,
    points: [
      { baseX: -0.10, baseY: 0.20, freqX: 0.6, freqY: 0.8, phaseX: 0.5, phaseY: 1.8, ampX: 0.10, ampY: 0.18 },
      { baseX: 0.10, baseY: 0.40, freqX: 0.8, freqY: 0.6, phaseX: 1.8, phaseY: 0.2, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.35, baseY: 0.20, freqX: 0.7, freqY: 1.0, phaseX: 0.2, phaseY: 2.2, ampX: 0.18, ampY: 0.18 },
      { baseX: 0.60, baseY: 0.40, freqX: 0.9, freqY: 0.7, phaseX: 2.5, phaseY: 0.8, ampX: 0.15, ampY: 0.20 },
      { baseX: 0.85, baseY: 0.25, freqX: 0.6, freqY: 0.9, phaseX: 1.0, phaseY: 1.5, ampX: 0.10, ampY: 0.15 },
      { baseX: 1.12, baseY: 0.10, freqX: 0.7, freqY: 0.6, phaseX: 0.5, phaseY: 2.0, ampX: 0.06, ampY: 0.12 },
    ],
  },
  {
    // Fifth ribbon — tight, bright accent
    colorStops: SPECTRUM_E,
    widthFactor: 0.08,
    peakAlpha: 0.65,
    speed: 1.1,
    points: [
      { baseX: -0.05, baseY: 0.85, freqX: 0.9, freqY: 0.8, phaseX: 1.2, phaseY: 0.8, ampX: 0.08, ampY: 0.12 },
      { baseX: 0.18, baseY: 0.55, freqX: 0.7, freqY: 1.1, phaseX: 2.5, phaseY: 1.5, ampX: 0.15, ampY: 0.18 },
      { baseX: 0.42, baseY: 0.30, freqX: 1.0, freqY: 0.8, phaseX: 0.8, phaseY: 2.5, ampX: 0.18, ampY: 0.18 },
      { baseX: 0.68, baseY: 0.18, freqX: 0.7, freqY: 1.0, phaseX: 1.5, phaseY: 0.3, ampX: 0.12, ampY: 0.18 },
      { baseX: 0.92, baseY: 0.08, freqX: 0.8, freqY: 0.7, phaseX: 2.0, phaseY: 1.8, ampX: 0.08, ampY: 0.12 },
      { baseX: 1.15, baseY: -0.08, freqX: 0.6, freqY: 0.6, phaseX: 0.8, phaseY: 0.5, ampX: 0.06, ampY: 0.08 },
    ],
  },
];

const CURVE_SAMPLES_DESKTOP = 80;
const CURVE_SAMPLES_MOBILE = 40;
const PASSES_DESKTOP = 12;
const PASSES_MOBILE = 7;

function cubicBez(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

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

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function getSpectrumColor(
  stops: [number, number, number][],
  t: number,
  time: number,
): [number, number, number] {
  // Shift the spectrum over time for a visible flowing color effect
  const shift = (t + time * 0.12) % 1;
  const pos = shift * (stops.length - 1);
  const idx = Math.floor(pos);
  const frac = pos - idx;
  const a = stops[idx % stops.length];
  const b = stops[(idx + 1) % stops.length];
  return lerpColor(a, b, frac);
}

function drawPrismaticRibbon(
  ctx: CanvasRenderingContext2D,
  ribbon: RibbonDef,
  time: number,
  w: number,
  h: number,
  isMobile: boolean,
) {
  const samples = isMobile ? CURVE_SAMPLES_MOBILE : CURVE_SAMPLES_DESKTOP;
  const passes = isMobile ? PASSES_MOBILE : PASSES_DESKTOP;
  const widthScale = isMobile ? 0.55 : 1.0;
  const alphaScale = isMobile ? 0.45 : 1.0;

  const center = samplePath(ribbon.points, time, w, h, ribbon.speed, samples);
  const maxWidth = ribbon.widthFactor * h * widthScale;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let p = 0; p < passes; p++) {
    const t = p / (passes - 1); // 0 = outermost, 1 = innermost
    const lineWidth = maxWidth * (1 - t * 0.93);
    const alpha = ribbon.peakAlpha * alphaScale * (0.02 + t * 0.98) * (1 - t * 0.25);
    const adjustedAlpha = alpha * Math.pow(t, 0.25);

    if (adjustedAlpha < 0.002) continue;

    // Create gradient along the ribbon path (start → end)
    const start = center[0];
    const end = center[center.length - 1];
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);

    // Add prismatic color stops
    const numStops = 6;
    for (let s = 0; s <= numStops; s++) {
      const st = s / numStops;
      const [r, g, b] = getSpectrumColor(ribbon.colorStops, st, time);
      // Inner passes are brighter and more saturated
      const brightness = 0.7 + t * 0.3;
      grad.addColorStop(st, `rgba(${r * brightness}, ${g * brightness}, ${b * brightness}, ${adjustedAlpha})`);
    }

    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const pt = center[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
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
      const mobile = w < 640;

      ctx!.clearRect(0, 0, w, h);

      for (const ribbon of RIBBONS) {
        drawPrismaticRibbon(ctx!, ribbon, time, w, h, mobile);
      }
    }

    function loop() {
      time += 0.011;
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
