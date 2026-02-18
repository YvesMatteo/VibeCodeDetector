'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return res.json();
  });

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
