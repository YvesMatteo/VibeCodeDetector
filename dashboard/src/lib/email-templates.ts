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
Always-on security monitoring for modern web apps.
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

export function scoreDropAlertTemplate(opts: {
    projectName: string;
    previousScore: number;
    currentScore: number;
    drop: number;
    dashboardUrl: string;
}): { subject: string; html: string } {
    return {
        subject: `Score drop alert: ${opts.projectName} (-${opts.drop} points)`,
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">
Security score dropped
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
Your project <strong style="color:${BRAND.color};">${opts.projectName}</strong> dropped from <strong style="color:${BRAND.color};">${opts.previousScore}</strong> to <strong style="color:#EF4444;">${opts.currentScore}</strong> (${opts.drop} point decrease).
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="background-color:rgba(239,68,68,0.1);border-radius:8px;padding:16px;text-align:center;">
<span style="font-size:32px;font-weight:700;color:#EF4444;">${opts.currentScore}</span>
<span style="font-size:14px;color:${BRAND.mutedText};display:block;margin-top:4px;">Current score</span>
</td>
</tr>
</table>

${button('View Dashboard', opts.dashboardUrl)}
`),
    };
}

export function newCriticalAlertTemplate(opts: {
    projectName: string;
    criticalCount: number;
    currentScore: number;
    dashboardUrl: string;
}): { subject: string; html: string } {
    return {
        subject: `Critical findings: ${opts.projectName} (${opts.criticalCount} new)`,
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">
New critical findings detected
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
Your project <strong style="color:${BRAND.color};">${opts.projectName}</strong> has <strong style="color:#EF4444;">${opts.criticalCount} critical</strong> security ${opts.criticalCount === 1 ? 'finding' : 'findings'} that need immediate attention.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="background-color:rgba(239,68,68,0.1);border-radius:8px;padding:16px;text-align:center;">
<span style="font-size:32px;font-weight:700;color:#EF4444;">${opts.criticalCount}</span>
<span style="font-size:14px;color:${BRAND.mutedText};display:block;margin-top:4px;">Critical findings</span>
</td>
</tr>
</table>

${button('Review Findings', opts.dashboardUrl)}
`),
    };
}

export function threatAlertTemplate(opts: {
    projectName: string;
    eventCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    topAttackType: string;
    uniqueIps: number;
    dashboardUrl: string;
}): { subject: string; html: string } {
    const severityLabel = opts.criticalCount > 0 ? 'critical' : opts.highCount > 0 ? 'high' : 'medium';
    const headerColor = opts.criticalCount > 0 ? '#EF4444' : opts.highCount > 0 ? '#F97316' : '#EAB308';

    return {
        subject: `Threat alert: ${opts.projectName} (${opts.eventCount} events detected)`,
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${headerColor};letter-spacing:-0.02em;">
Live threats detected
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
Your project <strong style="color:${BRAND.color};">${opts.projectName}</strong> recorded <strong style="color:${headerColor};">${opts.eventCount}</strong> threat ${opts.eventCount === 1 ? 'event' : 'events'}.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="background-color:rgba(239,68,68,0.1);border-radius:8px;padding:12px;text-align:center;width:33%;">
<span style="font-size:24px;font-weight:700;color:#EF4444;">${opts.criticalCount}</span>
<span style="font-size:12px;color:${BRAND.mutedText};display:block;margin-top:2px;">Critical</span>
</td>
<td style="background-color:rgba(249,115,22,0.1);border-radius:8px;padding:12px;text-align:center;width:33%;">
<span style="font-size:24px;font-weight:700;color:#F97316;">${opts.highCount}</span>
<span style="font-size:12px;color:${BRAND.mutedText};display:block;margin-top:2px;">High</span>
</td>
<td style="background-color:rgba(234,179,8,0.1);border-radius:8px;padding:12px;text-align:center;width:33%;">
<span style="font-size:24px;font-weight:700;color:#EAB308;">${opts.mediumCount}</span>
<span style="font-size:12px;color:${BRAND.mutedText};display:block;margin-top:2px;">Medium</span>
</td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="padding:8px 0;font-size:13px;color:${BRAND.mutedText};border-bottom:1px solid ${BRAND.borderColor};">
Top attack type
</td>
<td style="padding:8px 0;font-size:13px;color:${BRAND.color};text-align:right;border-bottom:1px solid ${BRAND.borderColor};text-transform:uppercase;">
${opts.topAttackType || 'N/A'}
</td>
</tr>
<tr>
<td style="padding:8px 0;font-size:13px;color:${BRAND.mutedText};">
Unique source IPs
</td>
<td style="padding:8px 0;font-size:13px;color:${BRAND.color};text-align:right;">
${opts.uniqueIps}
</td>
</tr>
</table>

${button('View Threats', opts.dashboardUrl)}
`),
    };
}

export function scoreBelowAlertTemplate(opts: {
    projectName: string;
    currentScore: number;
    threshold: number;
    dashboardUrl: string;
}): { subject: string; html: string } {
    return {
        subject: `Score below threshold: ${opts.projectName} (${opts.currentScore}/${opts.threshold})`,
        html: layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.color};letter-spacing:-0.02em;">
Score below threshold
</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.mutedText};">
Your project <strong style="color:${BRAND.color};">${opts.projectName}</strong> scored <strong style="color:#EF4444;">${opts.currentScore}</strong>, which is below your alert threshold of <strong style="color:${BRAND.color};">${opts.threshold}</strong>.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="background-color:rgba(239,68,68,0.1);border-radius:8px;padding:16px;text-align:center;">
<span style="font-size:32px;font-weight:700;color:#EF4444;">${opts.currentScore}</span>
<span style="font-size:14px;color:${BRAND.mutedText};display:block;margin-top:4px;">Current score (threshold: ${opts.threshold})</span>
</td>
</tr>
</table>

${button('View Dashboard', opts.dashboardUrl)}
`),
    };
}
