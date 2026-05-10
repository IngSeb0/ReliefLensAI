import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReliefLens AI | Crisis Operations Dashboard",
  description:
    "Multimodal disaster triage dashboard powered by AMD Developer Cloud and human-in-the-loop review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
