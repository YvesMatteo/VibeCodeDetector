import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/resend';
import { confirmEmailTemplate } from '@/lib/email-templates';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    // Rate limit: 5 signups per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
    const rl = await checkRateLimit(`signup:${ip}`, 5, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    let email: string;
    let password: string;
    let plan: string | undefined;
    try {
        const body = await req.json();
        email = body.email?.trim().toLowerCase();
        password = body.password;
        plan = body.plan;
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Validate origin against allowlist to prevent open redirect
    const ALLOWED_ORIGINS = [
        process.env.NEXT_PUBLIC_SITE_URL,
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    ].filter(Boolean) as string[];
    const rawOrigin = req.headers.get('origin');
    const origin = (rawOrigin && ALLOWED_ORIGINS.includes(rawOrigin)) ? rawOrigin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.checkvibe.dev');

    const VALID_PLANS = ['starter', 'pro', 'max'];
    const redirectPath = plan && VALID_PLANS.includes(plan)
        ? `/auth/callback?next=${encodeURIComponent(`/dashboard/credits?plan=${plan}`)}`
        : '/auth/callback';
    const redirectTo = `${origin}${redirectPath}`;

    // Try signup first
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: { redirectTo },
    });

    let actionLink = data?.properties?.action_link;

    // If user already exists (unconfirmed re-signup), generate a magic link instead
    if (error && (error.message?.includes('already been registered') || error.message?.includes('email_exists'))) {
        console.log('User already exists, sending magic link for:', email);
        const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo },
        });

        if (magicError || !magicData?.properties?.action_link) {
            console.error('Magic link generation failed:', magicError?.message);
            // Return 200 to prevent enumeration
            return NextResponse.json(
                { message: 'If this email is available, a confirmation link has been sent.' },
                { status: 200 }
            );
        }
        actionLink = magicData.properties.action_link;
    } else if (error || !actionLink) {
        console.error('Signup generateLink error:', error?.message);
        return NextResponse.json(
            { message: 'If this email is available, a confirmation link has been sent.' },
            { status: 200 }
        );
    }

    // Send branded confirmation email via Resend
    const template = confirmEmailTemplate(actionLink);
    try {
        const resend = getResend();
        await resend.emails.send({
            from: 'CheckVibe <support@checkvibe.dev>',
            to: email,
            subject: template.subject,
            html: template.html,
        });
    } catch (emailError) {
        console.error('Resend send error:', emailError);
        return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
    }

    return NextResponse.json(
        { message: 'If this email is available, a confirmation link has been sent.' },
        { status: 200 }
    );
}
