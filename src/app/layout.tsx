import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

import { publicEnv } from "@/lib/public-env";
import { Toaster } from "@/components/ui/sonner";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `${publicEnv.appName} | Recover missed accessorial revenue`,
  description:
    "DockClaim helps freight brokers import loads, review evidence, calculate accessorial claims, and recover detention, layover, TONU, and lumper revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} grain-overlay font-[family-name:var(--font-body)] antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
