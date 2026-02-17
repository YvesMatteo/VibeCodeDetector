'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface SlideIndicatorProps {
  slideIds: string[];
  labels?: string[];
}

export function SlideIndicator({ slideIds, labels }: SlideIndicatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const entries = new Map<string, IntersectionObserverEntry>();

    observerRef.current = new IntersectionObserver(
      (obs) => {
        for (const entry of obs) {
          entries.set(entry.target.id, entry);
        }
        // Find the most visible slide
        let maxRatio = 0;
        let maxId = slideIds[0];
        for (const [id, entry] of entries) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxId = id;
          }
        }
        const idx = slideIds.indexOf(maxId);
        if (idx !== -1) setActiveIndex(idx);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const id of slideIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [slideIds]);

  const scrollTo = useCallback(
    (index: number) => {
      const el = document.getElementById(slideIds[index]);
      el?.scrollIntoView({ behavior: 'smooth' });
    },
    [slideIds],
  );

  return (
    <nav
      aria-label="Slide navigation"
      className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-3"
    >
      {slideIds.map((id, i) => (
        <button
          key={id}
          onClick={() => scrollTo(i)}
          aria-label={labels?.[i] ?? `Slide ${i + 1}`}
          className="group relative flex items-center justify-center"
        >
          {/* Tooltip */}
          <span className="absolute right-6 whitespace-nowrap text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
            {labels?.[i] ?? `Slide ${i + 1}`}
          </span>
          {/* Dot */}
          <span
            className={`block rounded-full transition-all duration-300 ${
              activeIndex === i
                ? 'w-2.5 h-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                : 'w-1.5 h-1.5 bg-zinc-600 hover:bg-zinc-400'
            }`}
          />
        </button>
      ))}
    </nav>
  );
}
