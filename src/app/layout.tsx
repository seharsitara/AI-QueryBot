import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Top-level metadata. Tweaked per route via per-page `metadata` exports later.
export const metadata: Metadata = {
  title: "QueryBot",
  description: "AI document Q&A for PDF, Word, and text files.",
};

// Root layout — keep it minimal. Per-feature layouts (auth, dashboard)
// live under their own route groups in src/app/.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        {/* Global toast portal (shadcn-configured) — used for upload
            feedback, auth notices, errors, etc. */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
