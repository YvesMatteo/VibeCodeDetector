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

    // Support single email string or array of emails
    const recipients: string[] = Array.isArray(to) ? to : [to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter(e => emailRegex.test(e.trim()));

    if (validRecipients.length === 0) {
        return NextResponse.json({ error: 'No valid email addresses' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER || 'yves.matro@gmail.com';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailAppPassword) {
        return NextResponse.json({ error: 'Gmail app password not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });

    // Send to each recipient individually (so one failure doesn't block others)
    const results: { email: string; success: boolean; error?: string }[] = [];

    await Promise.all(validRecipients.map(async (recipient) => {
        try {
            await transporter.sendMail({
                from: `"Yves from CheckVibe" <${gmailUser}>`,
                to: recipient.trim(),
                subject,
                text: body,
            });
            results.push({ email: recipient, success: true });
        } catch (err: any) {
            console.error(`Email send error to ${recipient}:`, err?.message);
            results.push({ email: recipient, success: false, error: err?.message });
        }
    }));

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ results, sent, failed });
}
