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

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Send to FIRST recipient, check if it works before sending to others
    const first = validRecipients[0].trim();
    try {
        await transporter.sendMail({
            from: `"Yves from CheckVibe" <${gmailUser}>`,
            to: first,
            subject,
            text: body,
        });
        results.push({ email: first, success: true });
    } catch (err: any) {
        const msg = err?.message || '';
        console.error(`Email send error to ${first}:`, msg);
        results.push({ email: first, success: false, error: msg });

        // If first email failed, don't try the rest — the address is likely invalid
        return NextResponse.json({
            results,
            sent: 0,
            failed: 1,
            skipped: validRecipients.length - 1,
        });
    }

    // First succeeded — send to remaining recipients sequentially
    for (let i = 1; i < validRecipients.length; i++) {
        const recipient = validRecipients[i].trim();
        try {
            await transporter.sendMail({
                from: `"Yves from CheckVibe" <${gmailUser}>`,
                to: recipient,
                subject,
                text: body,
            });
            results.push({ email: recipient, success: true });
        } catch (err: any) {
            console.error(`Email send error to ${recipient}:`, err?.message);
            results.push({ email: recipient, success: false, error: err?.message });
        }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ results, sent, failed });
}
