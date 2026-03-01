'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AlertEmailFormProps {
    projectId: string;
    initialEmail: string;
}

export function AlertEmailForm({ projectId, initialEmail }: AlertEmailFormProps) {
    const [email, setEmail] = useState(initialEmail);
    const [saving, setSaving] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alert-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }
            toast.success('Alert email saved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save alert email');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave}>
            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                <CardHeader>
                    <CardTitle className="text-white">Notifications</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Email address for all security alerts, scheduled scan reports, and threat detection notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="alertEmail" className="text-zinc-300">Alert Email</Label>
                            <Input
                                id="alertEmail"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50 max-w-sm"
                            />
                            <p className="text-xs text-zinc-600">
                                Leave empty to use your account email
                            </p>
                        </div>
                        <Button type="submit" size="sm" disabled={saving} className="bg-sky-500 hover:bg-sky-400 text-white border-0">
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Save className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
