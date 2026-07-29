import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crow-GodMod3",
  description:
    "A CrowClaw-themed multi-model AI research interface.",
  applicationName: "Crow-GodMod3",
  keywords: ["Crow-GodMod3", "CrowClaw", "AI research", "multi-model chat"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07050d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
