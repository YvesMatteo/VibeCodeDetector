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
            <article className="relative h-full rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col transition-all duration-300 hover:border-sky-500/30 hover:bg-sky-500/5 hover:-translate-y-1 shadow-xl hover:shadow-sky-500/10">
                {/* Top decorative gradient line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* Subtle top glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-sky-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[11px] font-medium tracking-wide uppercase text-sky-200 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl md:text-2xl font-heading font-medium text-white mb-3 leading-snug group-hover:text-sky-300 transition-colors">
                        {title}
                        <ArrowUpRight className="inline-block ml-1.5 h-4 w-4 md:h-5 md:w-5 text-zinc-500 group-hover:text-sky-400 transition-colors" />
                    </h3>

                    {/* Description */}
                    <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-8 line-clamp-3 flex-1 font-light">
                        {description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-zinc-500 mt-auto pt-5 border-t border-white/5">
                        <time dateTime={date} className="text-zinc-400">{formattedDate}</time>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                            <Clock className="h-3.5 w-3.5" />
                            {readingTime}
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}
