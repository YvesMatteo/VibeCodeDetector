'use client';

import dynamic from 'next/dynamic';

const SilkBackground = dynamic(
  () => import('@/components/ui/silk-background').then((mod) => mod.SilkBackground),
  { ssr: false }
);

export function ThreeBackground() {
  return <SilkBackground />;
}
