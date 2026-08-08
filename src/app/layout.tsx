import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GlobalUXProvider } from "@/components/providers/global-ux";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life_OS — Your private life-management companion",
  description:
    "Life_OS unifies your journal, tasks, exercise, finances, vault, meditation, and an AI Counselor into one encrypted on-device PWA. Built for habit-building.",
  keywords: [
    "Life_OS", "habit tracker", "journal", "PWA", "AI counselor",
    "personal productivity", "encrypted", "on-device",
  ],
  authors: [{ name: "Adeshjeet_Official" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: ["/icons/favicon.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life_OS",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a09" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <GlobalUXProvider>
            {children}
          </GlobalUXProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
