import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';
import { PostCard } from '@/components/blog/post-card';

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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24">
                    <Link
                        href="/"
                        className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
                    >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Home
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                        Blog
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl">
                        Security insights, vulnerability guides, and best practices for developers who ship fast and want to stay safe.
                    </p>
                </div>
            </div>

            {/* Posts grid */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
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
