'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

interface Testimonial {
    quote: string;
    name: string;
    title: string;
    initials: string;
    color: string;
}

const testimonials: Testimonial[] = [
    {
        quote: 'I shipped a Cursor-built SaaS in a weekend and CheckVibe immediately flagged an exposed Supabase service-role key in my client bundle. Saved me from a very bad Monday.',
        name: 'Patrick Scherrer',
        title: 'Indie Maker',
        initials: 'PS',
        color: 'bg-sky-500',
    },
    {
        quote: 'We run 35 checks on every deploy now. The SQL injection and XSS scanners alone have caught issues our team missed during code review twice this month.',
        name: 'Yves Romano',
        title: 'Software Engineer',
        initials: 'YR',
        color: 'bg-emerald-500',
    },
    {
        quote: 'As a solo founder using vibe coding, security was my blind spot. CheckVibe turned it into my strongest feature. Customers actually mention it in sales calls now.',
        name: 'Jamie Schärli',
        title: 'Founder',
        initials: 'JS',
        color: 'bg-violet-500',
    },
    {
        quote: 'The CORS and security header checks caught misconfigurations on three of our client projects within the first scan. Worth every penny of the Pro plan.',
        name: 'Julia Podany',
        title: 'Lead Engineer',
        initials: 'JP',
        color: 'bg-amber-500',
    },
    {
        quote: 'We integrated CheckVibe into our CI pipeline with the MCP server. Now no PR merges without a passing security scan. It took five minutes to set up.',
        name: 'Michael Stadler',
        title: 'DevOps',
        initials: 'MS',
        color: 'bg-rose-500',
    },
];

export function TestimonialsCarousel() {
    const [width, setWidth] = useState(0);
    const carousel = useRef<HTMLDivElement>(null);
    const controls = useAnimationControls();

    useEffect(() => {
        if (carousel.current) {
            setWidth(carousel.current.scrollWidth - carousel.current.offsetWidth);
        }
    }, []);

    // Duplicate items to let it loop seamlessly (basic infinite approach)
    const infiniteTestimonials = [...testimonials, ...testimonials, ...testimonials];

    return (
        <div className="w-full max-w-7xl mx-auto overflow-hidden relative">

            <motion.div
                ref={carousel}
                className="flex gap-4 sm:gap-6 cursor-grab active:cursor-grabbing w-max items-stretch py-4"
                animate={{
                    x: ['0%', '-33.333%']
                }}
                transition={{
                    ease: 'linear',
                    duration: 30, // seconds for full loop
                    repeat: Infinity,
                }}
            >
                {infiniteTestimonials.map((testimonial, i) => (
                    <div
                        key={`${testimonial.name}-${i}`}
                        className="w-[280px] sm:w-[380px] shrink-0 relative flex flex-col rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 [@media(hover:hover)]:hover:border-white/10 [@media(hover:hover)]:hover:bg-white/[0.04]"
                    >
                        {/* Quote mark */}
                        <span className="text-sky-400/20 text-4xl font-serif leading-none mb-2 select-none" aria-hidden="true">&ldquo;</span>
                        <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed flex-1 mb-6">
                            {testimonial.quote}
                        </p>
                        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5">
                            <div className={`w-9 h-9 rounded-full ${testimonial.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                                {testimonial.initials}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">{testimonial.name}</div>
                                <div className="text-xs text-zinc-300 truncate">{testimonial.title}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
