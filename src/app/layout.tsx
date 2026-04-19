import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meta Ads Creative Analytics",
  description:
    "AI-driven creative intelligence for paid social teams — classify, analyze, and act on Meta ad creatives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
