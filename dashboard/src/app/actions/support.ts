'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

    revalidatePath('/dashboard/support');
    return { success: true };
}
