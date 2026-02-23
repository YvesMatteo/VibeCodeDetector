import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

export const mdxComponents: MDXComponents = {
    h1: ({ children }) => (
        <h1 className="text-3xl font-bold tracking-tight text-white mt-10 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-2xl font-semibold tracking-tight text-white mt-10 mb-3 pb-2 border-b border-white/[0.06]">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-xl font-semibold text-white mt-8 mb-3">{children}</h3>
    ),
    h4: ({ children }) => (
        <h4 className="text-lg font-medium text-zinc-200 mt-6 mb-2">{children}</h4>
    ),
    p: ({ children }) => (
        <p className="text-[15px] leading-relaxed text-zinc-400 mb-4">{children}</p>
    ),
    a: ({ href, children }) => {
        const isExternal = href?.startsWith('http');
        if (isExternal) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
                    {children}
                </a>
            );
        }
        return (
            <Link href={href || '#'} className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
                {children}
            </Link>
        );
    },
    ul: ({ children }) => (
        <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5 text-[15px] text-zinc-400 marker:text-zinc-600">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-outside pl-5 mb-4 space-y-1.5 text-[15px] text-zinc-400 marker:text-zinc-500">{children}</ol>
    ),
    li: ({ children }) => (
        <li className="leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-sky-500/40 pl-4 my-4 text-zinc-400 italic">{children}</blockquote>
    ),
    code: ({ children, className }) => {
        // Inline code (no className means not a code block)
        if (!className) {
            return (
                <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-sky-300 text-sm font-mono">{children}</code>
            );
        }
        // Block code — rendered by pre
        return <code className={className}>{children}</code>;
    },
    pre: ({ children }) => (
        <pre className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 mb-4 overflow-x-auto text-sm font-mono leading-relaxed">
            {children}
        </pre>
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left text-zinc-400 border border-white/[0.06] rounded-lg overflow-hidden">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-white/[0.04] text-zinc-300 text-xs uppercase tracking-wider">{children}</thead>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 font-medium">{children}</th>
    ),
    td: ({ children }) => (
        <td className="px-4 py-3 border-t border-white/[0.04]">{children}</td>
    ),
    hr: () => (
        <hr className="my-8 border-white/[0.06]" />
    ),
    strong: ({ children }) => (
        <strong className="font-semibold text-zinc-200">{children}</strong>
    ),
    em: ({ children }) => (
        <em className="text-zinc-300">{children}</em>
    ),
};
