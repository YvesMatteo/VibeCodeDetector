import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/dashboard/settings-tabs';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let plan = 'none';
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
        if (profile) {
            plan = profile.plan || 'none';
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white mb-2">Settings</h1>
                <p className="text-zinc-500">
                    Manage your account settings
                </p>
            </div>

            <SettingsTabs
                email={user?.email || ''}
                userId={user?.id || ''}
                createdAt={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                plan={plan}
            />
        </div>
    );
}
