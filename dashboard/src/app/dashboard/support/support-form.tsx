'use client';

import { useState } from 'react';
import { submitSupportTicket } from '@/app/actions/support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';

const ISSUE_OPTIONS = [
    { value: 'bug', label: 'Report a Bug' },
    { value: 'feedback', label: 'Feature Request / Feedback' },
    { value: 'question', label: 'General Question' },
];

export function SupportForm() {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [issueType, setIssueType] = useState<string>('');

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setMessage(null);

        const result = await submitSupportTicket(formData);

        if (result?.error) {
            setMessage({ type: 'error', text: result.error });
        } else if (result?.success) {
            setMessage({ type: 'success', text: 'Your ticket has been submitted successfully. We will get back to you soon.' });
            // Reset form
            const form = document.getElementById('support-form') as HTMLFormElement;
            if (form) form.reset();
        }

        setPending(false);
    }

    return (
        <form id="support-form" action={handleSubmit} className="space-y-4">
            {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="type" className="text-zinc-300">Issue Type</Label>
                <input type="hidden" name="type" value={issueType} required />
                <CustomSelect
                    id="type"
                    value={issueType}
                    onChange={setIssueType}
                    options={ISSUE_OPTIONS}
                    placeholder="Select an issue type..."
                    className="w-full"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject" className="text-zinc-300">Subject</Label>
                <Input
                    id="subject"
                    name="subject"
                    required
                    placeholder="Brief summary of your issue"
                    className="bg-[#1c1c1c] border-white/10 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-sky-500/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="message" className="text-zinc-300">Message</Label>
                <textarea
                    id="message"
                    name="message"
                    required
                    placeholder="Provide details about your issue, steps to reproduce, or feedback..."
                    className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-[#1c1c1c] px-3 py-2 text-sm text-zinc-200 ring-offset-background placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
            </div>

            <Button
                type="submit"
                disabled={pending}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white border-0"
            >
                {pending ? 'Submitting...' : 'Submit Ticket'}
            </Button>
        </form>
    );
}
