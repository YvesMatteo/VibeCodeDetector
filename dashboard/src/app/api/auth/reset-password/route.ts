import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/resend';
import { resetPasswordTemplate } from '@/lib/email-templates';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    // Rate limit: 5 reset attempts per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
    const rl = await checkRateLimit(`reset-pwd:${ip}`, 5, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    let email: string;
    try {
        const body = await req.json();
        email = body.email?.trim().toLowerCase();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Generate recovery link for the user
    // Validate origin against allowlist to prevent open redirect
    const ALLOWED_ORIGINS = [
        process.env.NEXT_PUBLIC_SITE_URL,
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    ].filter(Boolean) as string[];
    const rawOrigin = req.headers.get('origin');
    const origin = (rawOrigin && ALLOWED_ORIGINS.includes(rawOrigin)) ? rawOrigin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.checkvibe.dev');
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
            redirectTo: `${origin}/update-password`,
        },
    });

    if (error) {
        // Always return success to prevent user enumeration
        console.error('Recovery generateLink error:', error.message);
        return NextResponse.json(
            { message: 'If an account exists with this email, a reset link has been sent.' },
            { status: 200 }
        );
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
        console.error('Recovery: no action_link returned');
        return NextResponse.json(
            { message: 'If an account exists with this email, a reset link has been sent.' },
            { status: 200 }
        );
    }

    // Send branded reset email via Resend
    const template = resetPasswordTemplate(actionLink);
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
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }

    return NextResponse.json(
        { message: 'If an account exists with this email, a reset link has been sent.' },
        { status: 200 }
    );
}
