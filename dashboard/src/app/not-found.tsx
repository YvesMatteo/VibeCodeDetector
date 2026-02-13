import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter text-zinc-700">404</h1>
      <p className="mt-4 text-xl sm:text-2xl font-medium text-zinc-300">Page not found</p>
      <p className="mt-2 text-sm text-zinc-500 max-w-md text-center">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Button
          asChild
          className="bg-white text-zinc-900 hover:bg-zinc-200 border-0"
        >
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
