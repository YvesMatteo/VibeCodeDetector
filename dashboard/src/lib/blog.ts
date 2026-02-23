import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogPost {
    slug: string;
    title: string;
    description: string;
    date: string;
    author: string;
    tags: string[];
    image: string;
    readingTime: string;
    content: string;
}

export function getPostSlugs(): string[] {
    if (!fs.existsSync(BLOG_DIR)) return [];
    return fs
        .readdirSync(BLOG_DIR)
        .filter((f) => f.endsWith('.mdx'))
        .map((f) => f.replace(/\.mdx$/, ''));
}

export function getPostBySlug(slug: string): BlogPost | null {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const stats = readingTime(content);

    return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'CheckVibe Team',
        tags: data.tags || [],
        image: data.image || '',
        readingTime: stats.text,
        content,
    };
}

export function getAllPosts(): BlogPost[] {
    return getPostSlugs()
        .map((slug) => getPostBySlug(slug))
        .filter((p): p is BlogPost => p !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRawMarkdown(slug: string): string | null {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { content } = matter(raw);
    return content;
}
