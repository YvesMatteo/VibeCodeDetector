import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== OWNER_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER || 'yves.matro@gmail.com';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailAppPassword) {
        return NextResponse.json({ error: 'Gmail app password not configured. Set GMAIL_APP_PASSWORD in .env.local' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });

    try {
        await transporter.sendMail({
            from: `"Yves from CheckVibe" <${gmailUser}>`,
            to,
            subject,
            text: body,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Email send error:', err);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
