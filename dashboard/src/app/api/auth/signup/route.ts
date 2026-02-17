import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/resend';
import { confirmEmailTemplate } from '@/lib/email-templates';
import { checkCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    let email: string;
    let password: string;
    try {
        const body = await req.json();
        email = body.email?.trim().toLowerCase();
        password = body.password;
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

    // Generate signup link (creates user + generates confirmation token)
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.checkvibe.dev';
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        // Normalize errors to prevent user enumeration
        console.error('Signup generateLink error:', error.message);
        return NextResponse.json(
            { message: 'If this email is available, a confirmation link has been sent.' },
            { status: 200 }
        );
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
        console.error('Signup: no action_link returned');
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
