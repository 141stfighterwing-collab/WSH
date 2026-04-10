import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = localFont({
  src: "../../public/fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const firaCode = localFont({
  src: "../../public/fonts/FiraCode-Variable.woff2",
  variable: "--font-fira-code",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WSH - WeaveNote Self-Hosted",
  description: "A self-hosted note-taking application with AI-powered synthesis. Built with Next.js, TypeScript, and Tailwind CSS.",
  keywords: ["WSH", "WeaveNote", "Self-Hosted", "Notes", "AI", "Next.js"],
  authors: [{ name: "WSH Team" }],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${firaCode.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}