'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { OWNER_EMAIL_CLIENT } from '@/lib/constants';

interface UserRow {
    id: string;
    email: string;
    displayName: string | null;
    emailConfirmed: boolean;
    emailConfirmedAt: string | null;
    providers: string[];
    plan: string;
    createdAt: string;
    lastSignInAt: string | null;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null);
        });
    }, []);

    useEffect(() => {
        if (userEmail === null) return;
        if (userEmail !== OWNER_EMAIL_CLIENT) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional early return
            setError('Forbidden');
            setLoading(false);
            return;
        }
        fetch('/api/admin/users')
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setUsers(data.users);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [userEmail]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-red-400 text-sm">{error}</div>
        );
    }

    const fmt = (iso: string | null) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Users className="h-5 w-5 text-zinc-400" />
                <h1 className="text-xl font-semibold text-white">Users</h1>
                <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                    {users.length} total
                </Badge>
            </div>

            <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Email</th>
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Name</th>
                                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Confirmed</th>
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Plan</th>
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Providers</th>
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Signed up</th>
                                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Last sign in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-white font-mono text-xs">{u.email}</td>
                                    <td className="px-4 py-3 text-zinc-400">{u.displayName || '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        {u.emailConfirmed ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                                                <XCircle className="h-3.5 w-3.5" />
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={`text-[10px] border-zinc-700 capitalize ${
                                            u.plan === 'max' ? 'text-amber-400 border-amber-500/30' :
                                            u.plan === 'pro' ? 'text-blue-400 border-blue-500/30' :
                                            u.plan === 'starter' ? 'text-emerald-400 border-emerald-500/30' :
                                            'text-zinc-500'
                                        }`}>
                                            {u.plan}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            {u.providers.map(p => (
                                                <Badge key={p} variant="outline" className="text-[10px] text-zinc-400 border-zinc-700 capitalize">
                                                    {p}
                                                </Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500 text-xs">{fmt(u.createdAt)}</td>
                                    <td className="px-4 py-3 text-zinc-500 text-xs">{fmt(u.lastSignInAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
