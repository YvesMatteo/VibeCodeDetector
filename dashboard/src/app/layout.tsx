import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "CheckVibe - AI Website Scanner",
  description: "Scan your website for security vulnerabilities, exposed API keys, SQL injection, XSS, and 17 more checks.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-center" theme="dark" richColors />
      </body>
    </html>
  );
}
