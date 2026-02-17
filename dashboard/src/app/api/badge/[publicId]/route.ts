import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getColor(score: number): string {
  if (score >= 90) return '22c55e'; // green
  if (score >= 70) return 'eab308'; // yellow
  if (score >= 50) return 'f97316'; // orange
  return 'ef4444'; // red
}

function getLabel(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  if (!/^[0-9a-f]{6,16}$/i.test(publicId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data: scan } = await supabase
    .from('scans')
    .select('overall_score, url')
    .eq('public_id', publicId)
    .single();

  if (!scan) {
    return new NextResponse('Not found', { status: 404 });
  }

  const score = scan.overall_score ?? 0;
  const color = getColor(score);
  const label = getLabel(score);

  // SVG badge
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20" role="img" aria-label="CheckVibe: ${label} (${score}/100)">
  <title>CheckVibe: ${label} (${score}/100)</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="160" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="80" height="20" fill="#555"/>
    <rect x="80" width="80" height="20" fill="#${color}"/>
    <rect width="160" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="40" y="14" fill="#010101" fill-opacity=".3">CheckVibe</text>
    <text x="40" y="13">CheckVibe</text>
    <text x="120" y="14" fill="#010101" fill-opacity=".3">${label} (${score}/100)</text>
    <text x="120" y="13">${label} (${score}/100)</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
