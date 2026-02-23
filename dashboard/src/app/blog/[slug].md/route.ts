import { NextRequest, NextResponse } from 'next/server';
import { getRawMarkdown, getPostBySlug } from '@/lib/blog';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    // Strip .md extension if present in the slug
    const cleanSlug = slug.replace(/\.md$/, '');
    const post = getPostBySlug(cleanSlug);
    const markdown = getRawMarkdown(cleanSlug);

    if (!post || !markdown) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const fullMarkdown = `# ${post.title}\n\n*${post.description}*\n\nBy ${post.author} | ${post.date} | ${post.readingTime}\n\n---\n\n${markdown}`;

    return new NextResponse(fullMarkdown, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
