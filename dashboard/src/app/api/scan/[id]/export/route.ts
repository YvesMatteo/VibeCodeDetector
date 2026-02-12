import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateScanMarkdown } from '@/lib/export-markdown';

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

    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const markdown = generateScanMarkdown(scan);
    const domain = (scan.url || 'unknown').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const date = new Date(scan.completed_at || scan.created_at).toISOString().slice(0, 10);
    const filename = `checkvibe-${domain}-${date}.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export scan error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
