'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getResend } from '@/lib/resend';

export async function submitSupportTicket(formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to submit a support ticket.' };
    }

    const subject = formData.get('subject') as string;
    const type = formData.get('type') as string;
    const message = formData.get('message') as string;

    if (!subject || !type || !message) {
        return { error: 'Please fill out all required fields.' };
    }

    // Rate limit: max 1 ticket per 2 minutes per user
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', twoMinutesAgo)
        .limit(1);

    if (recentTickets && recentTickets.length > 0) {
        return { error: 'Please wait a couple of minutes before submitting another ticket.' };
    }

    const { error } = await supabase
        .from('support_tickets')
        .insert({
            user_id: user.id,
            subject,
            type,
            message,
            status: 'open',
        });

    if (error) {
        console.error('Error submitting ticket:', error);
        return { error: 'Failed to submit ticket. Please try again or contact us via email.' };
    }

    // Send email notification to support team (fire-and-forget)
    try {
        const resend = getResend();
        await resend.emails.send({
            from: 'CheckVibe <notifications@checkvibe.dev>',
            to: 'support@checkvibe.dev',
            replyTo: user.email ?? undefined,
            subject: `[Support] ${type}: ${subject}`,
            text: `New support ticket from ${user.email}\n\nType: ${type}\nSubject: ${subject}\n\n${message}`,
            html: `<h3>New Support Ticket</h3>
<p><strong>From:</strong> ${user.email}</p>
<p><strong>Type:</strong> ${type}</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr/>
<p>${message.replace(/\n/g, '<br/>')}</p>`,
        });
    } catch (emailErr) {
        console.error('Failed to send support ticket notification email:', emailErr);
    }

    revalidatePath('/dashboard/support');
    return { success: true };
}
