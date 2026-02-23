import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, User } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug, getPostSlugs } from '@/lib/blog';
import { mdxComponents } from '@/components/blog/mdx-components';
import { PostCard } from '@/components/blog/post-card';

export function generateStaticParams() {
    return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) return {};

    return {
        title: `${post.title} | CheckVibe Blog`,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: post.date,
            authors: [post.author],
            tags: post.tags,
            url: `https://checkvibe.dev/blog/${slug}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
        },
        alternates: {
            canonical: `https://checkvibe.dev/blog/${slug}`,
        },
    };
}

export default async function BlogPost({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) return notFound();

    const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Get related posts (same tags, different post)
    const allPosts = getAllPosts();
    const related = allPosts
        .filter((p) => p.slug !== slug && p.tags.some((t) => post.tags.includes(t)))
        .slice(0, 2);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        author: { '@type': 'Organization', name: post.author },
        publisher: {
            '@type': 'Organization',
            name: 'CheckVibe',
            url: 'https://checkvibe.dev',
        },
        mainEntityOfPage: `https://checkvibe.dev/blog/${slug}`,
    };

    return (
        <div className="min-h-screen bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Article header */}
            <div className="border-b border-white/[0.06]">
                <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-20">
                    <Link
                        href="/blog"
                        className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
                    >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Blog
                    </Link>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.map((tag) => (
                            <span key={tag} className="text-[11px] font-medium text-sky-400/80 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {post.author}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={post.date}>{formattedDate}</time>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readingTime}
                        </div>
                    </div>
                </div>
            </div>

            {/* Article body */}
            <article className="max-w-3xl mx-auto px-4 md:px-8 py-12">
                <MDXRemote source={post.content} components={mdxComponents} />
            </article>

            {/* CTA banner */}
            <div className="max-w-3xl mx-auto px-4 md:px-8 pb-12">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-8 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Scan your site for free
                    </h3>
                    <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                        30 automated security checks in under 60 seconds. No credit card required.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
                    >
                        Try CheckVibe Free
                    </Link>
                </div>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
                <div className="border-t border-white/[0.06]">
                    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
                        <h2 className="text-lg font-semibold text-white mb-6">Related articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {related.map((p) => (
                                <PostCard
                                    key={p.slug}
                                    slug={p.slug}
                                    title={p.title}
                                    description={p.description}
                                    date={p.date}
                                    tags={p.tags}
                                    readingTime={p.readingTime}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
