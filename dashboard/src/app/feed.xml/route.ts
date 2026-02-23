import { getAllPosts } from '@/lib/blog';

export async function GET() {
    const posts = getAllPosts();
    const baseUrl = 'https://checkvibe.dev';

    const items = posts
        .map(
            (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>team@checkvibe.dev (${post.author})</author>
      ${post.tags.map((t) => `<category>${t}</category>`).join('\n      ')}
    </item>`
        )
        .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CheckVibe Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Security insights, vulnerability guides, and best practices for modern web developers.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
