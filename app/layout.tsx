import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crow-GodMod3",
  description:
    "A CrowClaw-inspired multi-model chat workbench interface.",
  applicationName: "Crow-GodMod3",
  keywords: ["Crow-GodMod3", "CrowClaw", "AI workbench", "chat interface"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080b",
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
