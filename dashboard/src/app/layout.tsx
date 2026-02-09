import type { Metadata } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google"; // Import EB Garamond
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckVibe - AI Website Scanner",
  description: "Scan your website for security vulnerabilities, exposed API keys, SEO issues, legal compliance, and threat intelligence.",
  metadataBase: new URL("https://checkvibe.online"),
  openGraph: {
    title: "CheckVibe - AI Website Scanner",
    description: "Scan your website for security vulnerabilities, exposed API keys, SEO issues, and more.",
    type: "website",
    siteName: "CheckVibe",
    url: "https://checkvibe.online",
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckVibe - AI Website Scanner",
    description: "Scan your website for security vulnerabilities, exposed API keys, SEO issues, and more.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
