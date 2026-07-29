import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crow-godmod3.vercel.app"),
  title: "Crow-GodMod3",
  description:
    "Open-source, privacy-respecting multi-model AI in the complete Crow Theme.",
  applicationName: "Crow-GodMod3",
  keywords: ["Crow-GodMod3", "CrowClaw", "AI research", "multi-model chat"],
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/crow-theme/assets/icons/png/crow-signal-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/crow-theme/assets/icons/favicon.ico",
        sizes: "any",
      },
    ],
    apple: "/crow-theme/assets/icons/png/crow-signal-180.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Crow-GodMod3",
    title: "Crow-GodMod3",
    description:
      "Open-source, privacy-respecting multi-model AI in the complete Crow Theme.",
    images: [
      {
        url: "/crow-theme/assets/product-variants/exports/crow-godmod3-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Crow-GodMod3 — Glitch Ascendant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crow-GodMod3",
    description:
      "Open-source, privacy-respecting multi-model AI in the complete Crow Theme.",
    images: [
      "/crow-theme/assets/product-variants/exports/crow-godmod3-1200x630.png",
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#03040a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body data-crow-theme data-crow-product="crow-godmod3">
        {children}
      </body>
    </html>
  );
}
