import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReliefLensAI | Crisis Room",
  description:
    "Real-time multimodal disaster triage system powered by AMD MI300X",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
