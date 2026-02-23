import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';

interface PostCardProps {
    slug: string;
    title: string;
    description: string;
    date: string;
    tags: string[];
    readingTime: string;
}

export function PostCard({ slug, title, description, date, tags, readingTime }: PostCardProps) {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <Link href={`/blog/${slug}`} className="group block h-full">
            <article className="relative h-full rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 flex flex-col transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.03]">
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[11px] font-medium text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors mb-2 leading-snug">
                    {title}
                    <ArrowUpRight className="inline-block ml-1 h-4 w-4 text-zinc-600 group-hover:text-sky-400 transition-colors" />
                </h3>

                {/* Description */}
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-6 line-clamp-3 flex-1">
                    {description}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-3 text-xs text-zinc-600 mt-auto pt-4 border-t border-white/[0.04]">
                    <time dateTime={date}>{formattedDate}</time>
                    <span className="text-zinc-700">·</span>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {readingTime}
                    </div>
                </div>
            </article>
        </Link>
    );
}
