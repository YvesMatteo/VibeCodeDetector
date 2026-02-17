'use client';

/**
 * Concentric pulsing circles background — inspired by schlem.me.
 * Pure CSS animation, no canvas. Each ring slowly scales outward
 * and fades, creating a ripple-from-center effect.
 */
export function PulsingCircles({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="pulsing-circles-container">
        <div className="pulsing-circle pulsing-circle-1" />
        <div className="pulsing-circle pulsing-circle-2" />
        <div className="pulsing-circle pulsing-circle-3" />
        <div className="pulsing-circle pulsing-circle-4" />
        <div className="pulsing-circle pulsing-circle-5" />
      </div>
    </div>
  );
}
