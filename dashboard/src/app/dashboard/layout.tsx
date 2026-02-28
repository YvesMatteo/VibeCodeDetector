import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SWRProvider } from '@/lib/swr-config';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch profile for plan info
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

    const userEmail = user.email || null;
    const userPlan = profile?.plan || 'none';

    return (
        <div className="min-h-screen bg-background">
            {/* Skip to content — accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
            >
                Skip to content
            </a>

            <DashboardShell userEmail={userEmail} userPlan={userPlan}>
                <main id="main-content" className="md:pl-[240px] pt-12 md:pt-0 relative min-h-dvh safe-bottom">
                    <SWRProvider>
                        <div className="animate-fade-in-up">
                            {children}
                        </div>
                    </SWRProvider>
                </main>
            </DashboardShell>
        </div>
    );
}
