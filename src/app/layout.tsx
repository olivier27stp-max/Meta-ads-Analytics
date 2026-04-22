import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entiore Sales Dashboard",
  description:
    "Entiore — Meta Ads creative intelligence, AI coaching, attribution, and calendar for SaaS sales teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
