import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';
import { PostCard } from '@/components/blog/post-card';
import { SilkBackground } from '@/components/ui/silk-background';

export const metadata: Metadata = {
    title: 'Blog | CheckVibe',
    description: 'Security insights, vulnerability guides, and best practices for modern web developers. Learn how to find and fix security issues in your applications.',
    openGraph: {
        title: 'Blog | CheckVibe',
        description: 'Security insights and vulnerability guides for modern web developers.',
        type: 'website',
        url: 'https://checkvibe.dev/blog',
    },
    alternates: {
        canonical: 'https://checkvibe.dev/blog',
    },
};

export default function BlogIndex() {
    const posts = getAllPosts();

    return (
        <div className="min-h-screen bg-[#0E0E10] overflow-x-hidden relative">
            <SilkBackground />

            {/* Header */}
            <div className="relative z-10 border-b border-white/[0.06] bg-white/[0.01] backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-32">
                    <Link
                        href="/"
                        className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
                    >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Home
                    </Link>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-medium tracking-tight text-white mb-6">
                        Latest <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">Insights</span>
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
                        Security research, vulnerability guides, and best practices for developers who ship fast and want to stay secure.
                    </p>
                </div>
            </div>

            {/* Posts grid */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
                {posts.length === 0 ? (
                    <p className="text-zinc-500 text-center py-20">No posts yet. Check back soon.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.slug}
                                slug={post.slug}
                                title={post.title}
                                description={post.description}
                                date={post.date}
                                tags={post.tags}
                                readingTime={post.readingTime}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
