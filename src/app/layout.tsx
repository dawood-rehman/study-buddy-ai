import type { Metadata, Viewport } from "next";
import { ClientProviders } from "@/components/ClientProviders";
import "@/index.css";

export const metadata: Metadata = {
  title: "Study Buddy AI",
  description: "AI-powered study helper, quiz generator, summaries, counseling, and ATS resume builder.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f8f7e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
