const BRAND = {
    name: 'CheckVibe',
    url: 'https://www.checkvibe.dev',
    logoUrl: 'https://www.checkvibe.dev/logo.png',
    color: '#FFFFFF',
    bg: '#09090B',
    cardBg: '#111113',
    borderColor: '#1F1F23',
    mutedText: '#71717A',
};

function layout(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
<tr><td align="center" style="padding:48px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

<!-- Logo -->
<tr><td align="center" style="padding-bottom:32px;">
<a href="${BRAND.url}" style="text-decoration:none;display:inline-flex;align-items:center;">
<img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="36" height="36" style="border-radius:8px;margin-right:10px;"/>
<span style="font-size:20px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">${BRAND.name}</span>
</a>
</td></tr>

<!-- Card -->
<tr><td style="background-color:${BRAND.cardBg};border:1px solid ${BRAND.borderColor};border-radius:12px;padding:40px 32px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding-top:32px;">
<p style="margin:0;font-size:12px;color:#3F3F46;">
&copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
</p>
<p style="margin:8px 0 0;font-size:12px;color:#3F3F46;">
Security scanning for modern web apps.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(text: string, href: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0 0;">
<a href="${href}" target="_blank" style="display:inline-block;background-color:${BRAND.color};color:#09090B;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;letter-spacing:-0.01em;">
${text}
</a>
</td></tr>
</table>`;
}

export function confirmEmailTemplate(confirmUrl: string): { subject: string; html: string } {
    return {
        subject: 'Confirm your CheckVibe account',
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">
Confirm your email
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
Thanks for signing up for CheckVibe. Click the button below to confirm your email address and activate your account.
</p>

${button('Confirm Email', confirmUrl)}

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#3F3F46;">
If you didn&rsquo;t create an account, you can safely ignore this email.
</p>

<hr style="border:none;border-top:1px solid ${BRAND.borderColor};margin:24px 0 16px;"/>
<p style="margin:0;font-size:12px;line-height:1.5;color:#3F3F46;word-break:break-all;">
Button not working? Copy and paste this link:<br/>
<a href="${confirmUrl}" style="color:#71717A;">${confirmUrl}</a>
</p>
`),
    };
}

export function resetPasswordTemplate(resetUrl: string): { subject: string; html: string } {
    return {
        subject: 'Reset your CheckVibe password',
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">
Reset your password
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
We received a request to reset the password for your CheckVibe account. Click the button below to choose a new password.
</p>

${button('Reset Password', resetUrl)}

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#3F3F46;">
This link will expire in 24 hours. If you didn&rsquo;t request a password reset, you can safely ignore this email.
</p>

<hr style="border:none;border-top:1px solid ${BRAND.borderColor};margin:24px 0 16px;"/>
<p style="margin:0;font-size:12px;line-height:1.5;color:#3F3F46;word-break:break-all;">
Button not working? Copy and paste this link:<br/>
<a href="${resetUrl}" style="color:#71717A;">${resetUrl}</a>
</p>
`),
    };
}
