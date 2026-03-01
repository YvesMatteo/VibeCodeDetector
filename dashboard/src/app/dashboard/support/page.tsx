import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { SupportForm } from './support-form';
import { formatDate } from '@/lib/format-date';

export const metadata: Metadata = {
    title: 'Support | CheckVibe',
    description: 'Submit feedback, ask questions, or report a bug.',
};

export default async function SupportPage() {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    // Fetch user's existing tickets
    const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white mb-2">
                    Support & Feedback
                </h1>
                <p className="text-zinc-400 text-sm max-w-2xl">
                    Need help, found a bug, or have a feature request? Let us know below and our team will get back to you as soon as possible.
                </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Form Column */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                    <h2 className="text-lg font-medium text-white mb-4">Submit a Ticket</h2>
                    <SupportForm />
                </div>

                {/* Tickets History Column */}
                <div className="space-y-6">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                        <h2 className="text-lg font-medium text-white mb-4">Your Tickets</h2>

                        {!tickets || tickets.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-zinc-500 text-sm">You haven&apos;t submitted any tickets yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map((ticket) => (
                                    <div key={ticket.id} className="p-4 rounded-lg bg-black/20 border border-white/[0.04]">
                                        <div className="flex items-center justify-between mb-2 gap-2">
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : ticket.status === 'resolved' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                                                {ticket.status}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                {formatDate(ticket.created_at, 'short')}
                                            </span>
                                        </div>
                                        <h3 className="font-medium text-sm text-zinc-200 mb-1">{ticket.subject}</h3>
                                        <p className="text-xs text-zinc-400 line-clamp-2">{ticket.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
