import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/dashboard/settings-tabs';
import { PageHeader } from '@/components/dashboard/page-header';
import { formatDate } from '@/lib/format-date';

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
        <div>
            <PageHeader
                title="Settings"
                description="Manage your account settings"
            />
            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                <SettingsTabs
                    email={user?.email || ''}
                    userId={user?.id || ''}
                    createdAt={user?.created_at ? formatDate(user.created_at, 'short') : ''}
                    plan={plan}
                />
            </div>
        </div>
    );
}
