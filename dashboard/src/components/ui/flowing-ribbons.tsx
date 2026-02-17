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
  widthFactor: number;
  peakAlpha: number;
  twistFreq: number;
  twistPhase: number;
  speed: number;
  points: ControlPoint[];
}

const RIBBONS: RibbonDef[] = [
  {
    color: '73, 126, 233', // #497EE9 — wide slow blue
    widthFactor: 0.20,
    peakAlpha: 0.75,
    twistFreq: 2.2,
    twistPhase: 0,
    speed: 1.0,
    points: [
      { baseX: -0.1, baseY: 0.05, freqX: 0.4, freqY: 0.3, phaseX: 0, phaseY: 0.5, ampX: 0.05, ampY: 0.14 },
      { baseX: 0.15, baseY: 0.30, freqX: 0.3, freqY: 0.5, phaseX: 1.2, phaseY: 0.3, ampX: 0.08, ampY: 0.16 },
      { baseX: 0.38, baseY: 0.02, freqX: 0.5, freqY: 0.35, phaseX: 2.5, phaseY: 1.1, ampX: 0.1, ampY: 0.14 },
      { baseX: 0.62, baseY: 0.35, freqX: 0.35, freqY: 0.45, phaseX: 0.8, phaseY: 2.0, ampX: 0.08, ampY: 0.16 },
      { baseX: 0.85, baseY: 0.08, freqX: 0.45, freqY: 0.4, phaseX: 1.5, phaseY: 0.7, ampX: 0.06, ampY: 0.12 },
      { baseX: 1.1, baseY: 0.25, freqX: 0.4, freqY: 0.35, phaseX: 2.0, phaseY: 1.5, ampX: 0.05, ampY: 0.10 },
    ],
  },
  {
    color: '116, 156, 255', // #749CFF — medium light blue
    widthFactor: 0.16,
    peakAlpha: 0.65,
    twistFreq: 2.8,
    twistPhase: 1.8,
    speed: 1.2,
    points: [
      { baseX: -0.1, baseY: 0.35, freqX: 0.5, freqY: 0.4, phaseX: 1.0, phaseY: 0, ampX: 0.06, ampY: 0.12 },
      { baseX: 0.18, baseY: 0.12, freqX: 0.4, freqY: 0.6, phaseX: 0.3, phaseY: 1.8, ampX: 0.1, ampY: 0.15 },
      { baseX: 0.42, baseY: 0.40, freqX: 0.55, freqY: 0.35, phaseX: 2.0, phaseY: 0.5, ampX: 0.08, ampY: 0.14 },
      { baseX: 0.6, baseY: 0.08, freqX: 0.35, freqY: 0.55, phaseX: 1.5, phaseY: 2.3, ampX: 0.1, ampY: 0.16 },
      { baseX: 0.8, baseY: 0.38, freqX: 0.45, freqY: 0.4, phaseX: 0.5, phaseY: 1.0, ampX: 0.06, ampY: 0.12 },
      { baseX: 1.1, baseY: 0.18, freqX: 0.4, freqY: 0.5, phaseX: 1.8, phaseY: 0.8, ampX: 0.05, ampY: 0.10 },
    ],
  },
  {
    color: '220, 225, 255', // white-blue tint
    widthFactor: 0.14,
    peakAlpha: 0.55,
    twistFreq: 3.0,
    twistPhase: 3.5,
    speed: 0.9,
    points: [
      { baseX: -0.1, baseY: 0.22, freqX: 0.45, freqY: 0.5, phaseX: 2.0, phaseY: 1.5, ampX: 0.06, ampY: 0.15 },
      { baseX: 0.2, baseY: 0.45, freqX: 0.55, freqY: 0.35, phaseX: 0.8, phaseY: 0.2, ampX: 0.1, ampY: 0.12 },
      { baseX: 0.45, baseY: 0.15, freqX: 0.4, freqY: 0.6, phaseX: 1.5, phaseY: 2.5, ampX: 0.08, ampY: 0.14 },
      { baseX: 0.68, baseY: 0.42, freqX: 0.5, freqY: 0.4, phaseX: 2.8, phaseY: 0.8, ampX: 0.1, ampY: 0.13 },
      { baseX: 0.88, baseY: 0.10, freqX: 0.4, freqY: 0.55, phaseX: 1.0, phaseY: 1.5, ampX: 0.06, ampY: 0.12 },
      { baseX: 1.1, baseY: 0.30, freqX: 0.45, freqY: 0.4, phaseX: 0.5, phaseY: 2.0, ampX: 0.05, ampY: 0.08 },
    ],
  },
];

const CURVE_SAMPLES_DESKTOP = 80;
const CURVE_SAMPLES_MOBILE = 40;
const STRIPS_DESKTOP = 20;
const STRIPS_MOBILE = 10;

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

function drawSilkRibbon(
  ctx: CanvasRenderingContext2D,
  ribbon: RibbonDef,
  time: number,
  w: number,
  h: number,
  isMobile: boolean,
) {
  const samples = isMobile ? CURVE_SAMPLES_MOBILE : CURVE_SAMPLES_DESKTOP;
  const strips = isMobile ? STRIPS_MOBILE : STRIPS_DESKTOP;
  // On mobile: narrower ribbons, lower opacity so text stays readable
  const widthScale = isMobile ? 0.55 : 1.0;
  const alphaScale = isMobile ? 0.45 : 1.0;

  const center = samplePath(ribbon.points, time, w, h, ribbon.speed, samples);
  const maxWidth = ribbon.widthFactor * h * widthScale;

  const data = center.map((p, i) => {
    const prev = center[Math.max(i - 1, 0)];
    const next = center[Math.min(i + 1, samples)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const u = i / samples;
    const twist = Math.sin(u * Math.PI * ribbon.twistFreq + time * 0.6 + ribbon.twistPhase);
    const ribbonW = maxWidth * (0.85 + 0.15 * Math.abs(twist));

    return { x: p.x, y: p.y, nx, ny, w: ribbonW };
  });

  for (let s = 0; s < strips; s++) {
    const frac0 = s / strips;
    const frac1 = (s + 1) / strips;

    const d = Math.max(Math.abs(frac0 * 2 - 1), Math.abs(frac1 * 2 - 1));

    const alpha = ribbon.peakAlpha * alphaScale * Math.exp(-d * d * 3.5);
    if (alpha < 0.002) continue;

    ctx.beginPath();

    for (let i = 0; i <= samples; i++) {
      const pt = data[i];
      const offset = (frac0 - 0.5) * pt.w;
      const x = pt.x + pt.nx * offset;
      const y = pt.y + pt.ny * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = samples; i >= 0; i--) {
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
      const mobile = w < 640;

      ctx!.clearRect(0, 0, w, h);

      for (const ribbon of RIBBONS) {
        drawSilkRibbon(ctx!, ribbon, time, w, h, mobile);
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
