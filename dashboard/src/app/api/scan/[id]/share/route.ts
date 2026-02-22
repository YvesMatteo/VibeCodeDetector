import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/api-keys';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 share operations per minute per user
    const rl = await checkRateLimit(`share:${user.id}`, 10, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    // Only subscribers can share reports
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile || profile.plan === 'none') {
      return NextResponse.json({ error: 'Sharing requires a subscription' }, { status: 403 });
    }

    // Verify ownership
    const { data: scan, error } = await supabase
      .from('scans')
      .select('id, public_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // If already has a public_id, return it
    if (scan.public_id) {
      return NextResponse.json({ publicId: scan.public_id, url: `/report/${scan.public_id}` });
    }

    // Generate a unique ID with 128 bits of entropy (32 hex chars)
    const publicId = crypto.randomBytes(16).toString('hex');

    const svc = getServiceClient();
    const { error: updateError } = await svc
      .from('scans')
      .update({ public_id: publicId })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to create public link:', updateError);
      return NextResponse.json({ error: 'Failed to create public link' }, { status: 500 });
    }

    return NextResponse.json({ publicId, url: `/report/${publicId}` });
  } catch (error) {
    console.error('Share scan error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = getServiceClient();
    const { error } = await svc
      .from('scans')
      .update({ public_id: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove public link' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unshare scan error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
