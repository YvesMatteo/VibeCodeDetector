import type { Metadata, Viewport } from "next";
import { Geist_Mono, DM_Sans, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  viewportFit: "cover",
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "CheckVibe - AI Website Scanner",
  description: "Scan your website with 30 automated security scanners. Detect exposed API keys, SQL injection, XSS, and more.",
  metadataBase: new URL("https://checkvibe.dev"),
  openGraph: {
    title: "CheckVibe - AI Website Scanner",
    description: "Scan your website for security vulnerabilities, exposed API keys, SQL injection, XSS, and more.",
    type: "website",
    siteName: "CheckVibe",
    url: "https://checkvibe.dev",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CheckVibe - AI Website Scanner",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckVibe - AI Website Scanner",
    description: "Scan your website for security vulnerabilities, exposed API keys, SQL injection, XSS, and more.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    types: {
      'application/rss+xml': 'https://checkvibe.dev/feed.xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'CheckVibe',
              applicationCategory: 'SecurityApplication',
              operatingSystem: 'Web',
              description: 'AI-powered website security scanner with 30 automated checks for vulnerabilities, exposed API keys, SQL injection, XSS, and more.',
              url: 'https://checkvibe.dev',
              offers: [
                { '@type': 'Offer', name: 'Starter', price: '19', priceCurrency: 'USD', url: 'https://checkvibe.dev/#pricing' },
                { '@type': 'Offer', name: 'Pro', price: '39', priceCurrency: 'USD', url: 'https://checkvibe.dev/#pricing' },
                { '@type': 'Offer', name: 'Max', price: '79', priceCurrency: 'USD', url: 'https://checkvibe.dev/#pricing' },
              ],
              featureList: '30 security scanners, SQL injection detection, XSS detection, API key scanning, SSL/TLS audit, CORS analysis, CSP analysis, dependency scanning',
            }),
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-center" theme="dark" richColors />
      </body>
    </html>
  );
}
