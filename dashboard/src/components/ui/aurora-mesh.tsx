'use client';

/**
 * Aurora Mesh Background
 *
 * 3 soft gradient blobs that slowly drift and rotate behind content.
 * Pure CSS animation — no canvas, no JS overhead.
 * Colors are muted indigo/blue/violet at low opacity with heavy blur.
 * GPU-accelerated via `will-change: transform` for smooth mobile perf.
 */
export function AuroraMesh({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="aurora-mesh">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>
    </div>
  );
}
