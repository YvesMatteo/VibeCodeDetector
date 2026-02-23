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
