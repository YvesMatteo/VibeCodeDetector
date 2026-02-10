import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckVibe - AI Website Scanner",
  description: "Scan your website for security vulnerabilities, exposed API keys, SQL injection, XSS, and 17 more checks.",
  metadataBase: new URL("https://checkvibe.online"),
  openGraph: {
    title: "CheckVibe - AI Website Scanner",
    description: "Scan your website for security vulnerabilities, exposed API keys, SQL injection, XSS, and more.",
    type: "website",
    siteName: "CheckVibe",
    url: "https://checkvibe.online",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
