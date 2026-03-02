import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateScanMarkdown } from '@/lib/export-markdown';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLAN_CONFIG } from '@/lib/plan-config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 exports per minute per user
    const rl = await checkRateLimit(`export:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Plan check: free users cannot export
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    const planKey = (profile?.plan || 'none') as string;
    if (!(planKey in PLAN_CONFIG)) {
      return NextResponse.json({ error: 'Export requires a paid plan. Please upgrade.' }, { status: 403 });
    }

    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Fetch previous completed scan for diffing (same project, same owner)
    let previousScan: typeof scan | null = null;
    if (scan.project_id) {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('project_id', scan.project_id)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .lt('completed_at', scan.completed_at)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      previousScan = data;
    }

    const markdown = generateScanMarkdown(scan, previousScan ?? undefined);
    const domain = (scan.url || 'unknown').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const date = new Date(scan.completed_at || scan.created_at).toISOString().slice(0, 10);

    const format = req.nextUrl.searchParams.get('format');

    if (format === 'pdf') {
      const pdfBytes = await markdownToPdf(markdown);
      return new NextResponse(pdfBytes as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="checkvibe-${domain}-${date}.pdf"`,
        },
      });
    }

    // Default: markdown
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="checkvibe-${domain}-${date}.md"`,
      },
    });
  } catch (error) {
    console.error('Export scan error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Minimal PDF generator — no external dependencies.
// Produces a clean, readable PDF from the markdown content.
// ---------------------------------------------------------------------------

async function markdownToPdf(markdown: string): Promise<Uint8Array> {
  const lines = markdown.split('\n');
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  function addObject(content: string): number {
    objectCount++;
    objects.push(content);
    return objectCount;
  }

  // Build page content as text operations
  const pageLines: { text: string; size: number; bold: boolean; y: number; indent: number; color?: string }[] = [];
  let y = 750; // Start position (top of page)
  const LEFT_MARGIN = 50;
  const PAGE_WIDTH = 495; // Usable width (595 - 50*2)
  const LINE_HEIGHT_BODY = 14;
  const LINE_HEIGHT_H1 = 28;
  const LINE_HEIGHT_H2 = 22;
  const LINE_HEIGHT_H3 = 18;

  function estimateTextWidth(text: string, fontSize: number): number {
    // Rough character width estimate for Helvetica
    return text.length * fontSize * 0.5;
  }

  function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
    if (estimateTextWidth(text, fontSize) <= maxWidth) return [text];
    const words = text.split(' ');
    const wrapped: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (estimateTextWidth(test, fontSize) > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) wrapped.push(current);
    return wrapped;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    // Skip table formatting lines
    if (/^\|[-|: ]+\|$/.test(line)) continue;

    // Horizontal rule
    if (/^---+$/.test(line)) {
      y -= 10;
      if (y < 60) { y = 750; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      y -= LINE_HEIGHT_H1;
      if (y < 60) { y = 750 - LINE_HEIGHT_H1; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      const text = cleanMarkdown(line.slice(2));
      pageLines.push({ text, size: 18, bold: true, y, indent: 0 });
      y -= 6;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      y -= LINE_HEIGHT_H2;
      if (y < 60) { y = 750 - LINE_HEIGHT_H2; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      const text = cleanMarkdown(line.slice(3));
      pageLines.push({ text, size: 14, bold: true, y, indent: 0 });
      y -= 4;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      y -= LINE_HEIGHT_H3;
      if (y < 60) { y = 750 - LINE_HEIGHT_H3; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      const text = cleanMarkdown(line.slice(4));
      pageLines.push({ text, size: 12, bold: true, y, indent: 0 });
      y -= 2;
      continue;
    }

    // H4
    if (line.startsWith('#### ')) {
      y -= LINE_HEIGHT_H3;
      if (y < 60) { y = 750 - LINE_HEIGHT_H3; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      const text = cleanMarkdown(line.slice(5));
      pageLines.push({ text, size: 11, bold: true, y, indent: 0 });
      y -= 2;
      continue;
    }

    // Table rows
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter(Boolean).map(c => cleanMarkdown(c.trim()));
      const text = cells.join('  |  ');
      const wrapped = wrapText(text, 9, PAGE_WIDTH);
      for (const wl of wrapped) {
        y -= LINE_HEIGHT_BODY;
        if (y < 60) { y = 750 - LINE_HEIGHT_BODY; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
        pageLines.push({ text: wl, size: 9, bold: false, y, indent: 0, color: '0.3 0.3 0.3' });
      }
      continue;
    }

    // Bullet points
    if (line.startsWith('- ')) {
      const text = cleanMarkdown(line.slice(2));
      const wrapped = wrapText(text, 10, PAGE_WIDTH - 15);
      for (let i = 0; i < wrapped.length; i++) {
        y -= LINE_HEIGHT_BODY;
        if (y < 60) { y = 750 - LINE_HEIGHT_BODY; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
        pageLines.push({ text: i === 0 ? `\u2022 ${wrapped[i]}` : wrapped[i], size: 10, bold: false, y, indent: i === 0 ? 0 : 15 });
      }
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      y -= 4;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      y -= 8;
      if (y < 60) { y = 750; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      continue;
    }

    // Regular text
    const text = cleanMarkdown(line);
    const wrapped = wrapText(text, 10, PAGE_WIDTH);
    for (const wl of wrapped) {
      y -= LINE_HEIGHT_BODY;
      if (y < 60) { y = 750 - LINE_HEIGHT_BODY; pageLines.push({ text: '---PAGE_BREAK---', size: 0, bold: false, y: 0, indent: 0 }); }
      pageLines.push({ text: wl, size: 10, bold: false, y, indent: 0 });
    }
  }

  // Split into pages
  const pages: typeof pageLines[] = [[]];
  for (const pl of pageLines) {
    if (pl.text === '---PAGE_BREAK---') {
      pages.push([]);
    } else {
      pages[pages.length - 1].push(pl);
    }
  }

  // Build PDF objects
  // 1. Catalog
  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // 2. Pages (placeholder — we'll fix the Kids array after)
  addObject(''); // placeholder

  // 3. Font - Helvetica
  addObject('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  // 4. Font - Helvetica Bold
  addObject('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  const pageObjectIds: number[] = [];

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    if (page.length === 0) continue;

    // Build content stream — dark theme background
    let stream = '';
    // Dark background rectangle covering the full page
    stream += '0.039 0.039 0.063 rg\n'; // #0A0A10
    stream += '0 0 595 842 re\nf\n';

    // Header accent line on first page
    if (pageIdx === 0) {
      stream += '0.231 0.510 0.965 rg\n'; // sky-500
      stream += '50 785 495 2 re\nf\n';
    }

    // Footer: page number
    stream += 'BT\n';
    stream += '0.4 0.4 0.4 rg\n';
    stream += '/F1 8 Tf\n';
    stream += `280 20 Td\n`;
    stream += `(Page ${pageIdx + 1}) Tj\n`;
    stream += 'ET\n';

    // Page content
    stream += 'BT\n';
    for (const pl of page) {
      const font = pl.bold ? '/F2' : '/F1';
      const escaped = pdfEscape(pl.text);
      if (pl.color) {
        stream += `${pl.color} rg\n`;
      } else if (pl.bold && pl.size >= 14) {
        // Headings: sky-blue accent
        stream += '0.337 0.651 0.969 rg\n'; // sky-400
      } else if (pl.bold) {
        // Sub-headings: white
        stream += '0.95 0.95 0.95 rg\n';
      } else {
        // Body text: light gray
        stream += '0.75 0.75 0.78 rg\n';
      }
      stream += `${font} ${pl.size} Tf\n`;
      stream += `${LEFT_MARGIN + pl.indent} ${pl.y} Td\n`;
      stream += `(${escaped}) Tj\n`;
    }
    stream += 'ET\n';

    // Content stream object
    const streamObjId = addObject(
      `${objectCount + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj`
    );

    // Page object
    const pageObjId = addObject(
      `${objectCount + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${streamObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`
    );
    pageObjectIds.push(pageObjId);
  }

  // Fix Pages object
  const kids = pageObjectIds.map(id => `${id} 0 R`).join(' ');
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>\nendobj`;

  // Serialize
  let pdf = '%PDF-1.4\n';
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += objects[i] + '\n';
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < objectCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return new TextEncoder().encode(pdf);
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // bold
    .replace(/\*([^*]+)\*/g, '$1')          // italic
    .replace(/`([^`]+)`/g, '$1')            // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[🔴🟠🟡🔵⚪]/g, '')          // emoji severity markers (not in PDF charset)
    .replace(/ℹ️/g, '(i)')
    .replace(/✅/g, '[OK]')
    .replace(/\s{2,}$/g, '')                // trailing spaces (md line breaks)
    .trim();
}

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Strip non-ASCII chars (basic PDF fonts only support Latin-1)
    .replace(/[^\x20-\x7E]/g, '');
}
