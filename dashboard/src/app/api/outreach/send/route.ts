import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';

/** Convert plain text body to a clean HTML email with footer */
function buildHtml(body: string, recipientEmail: string): string {
    // Convert bullet points (•) to styled list items
    const lines = body.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
            if (!inList) { html += '<ul style="padding-left:20px;margin:8px 0;">'; inList = true; }
            html += `<li style="margin:4px 0;color:#333;">${trimmed.slice(1).trim()}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (trimmed === '') {
                html += '<br/>';
            } else {
                html += `<p style="margin:6px 0;color:#333;line-height:1.5;">${trimmed}</p>`;
            }
        }
    }
    if (inList) html += '</ul>';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto;padding:20px;">
${html}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.4;">
  <p style="margin:0;">You're receiving this because we scanned your publicly accessible website and thought you'd find the results useful.</p>
  <p style="margin:4px 0 0;">Not interested? Just reply with "unsubscribe" and you won't hear from us again.</p>
</div>
</body>
</html>`;
}

/** Add unsubscribe footer to plain text version */
function buildPlainText(body: string): string {
    return `${body}

---
You're receiving this because we scanned your publicly accessible website and thought you'd find the results useful.
Not interested? Just reply with "unsubscribe" and you won't hear from us again.`;
}

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

    // Build email content with proper HTML + plain text
    const plainText = buildPlainText(body);

    // Send to FIRST recipient, check if it works before sending to others
    const first = validRecipients[0].trim();
    const htmlBody = buildHtml(body, first);
    try {
        await transporter.sendMail({
            from: `"Yves Romano" <${gmailUser}>`,
            replyTo: `"Yves Romano" <${gmailUser}>`,
            to: first,
            subject,
            text: plainText,
            html: htmlBody,
            headers: {
                'List-Unsubscribe': `<mailto:${gmailUser}?subject=unsubscribe>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'X-Entity-Ref-ID': `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
        });
        results.push({ email: first, success: true });
    } catch (err: any) {
        const msg = err?.message || '';
        console.error(`Email send error to ${first}:`, msg);
        results.push({ email: first, success: false, error: msg });

        // If first email failed, don't try the rest
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
        const recipientHtml = buildHtml(body, recipient);
        try {
            await transporter.sendMail({
                from: `"Yves Romano" <${gmailUser}>`,
                replyTo: `"Yves Romano" <${gmailUser}>`,
                to: recipient,
                subject,
                text: plainText,
                html: recipientHtml,
                headers: {
                    'List-Unsubscribe': `<mailto:${gmailUser}?subject=unsubscribe>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                    'X-Entity-Ref-ID': `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                },
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
