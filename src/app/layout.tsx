import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["700", "900"] });

const title = "Nightjar: built for the hour after dusk";
const description = "A fictional naked streetfighter, modelled and lit entirely in code. A concept by Tiff.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nightjar-by-tiff.vercel.app"),
  title,
  description,
  applicationName: "Nightjar",
  authors: [{ name: "Tiff", url: "https://github.com/tiff-xt" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nightjar",
    title,
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#040405" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} antialiased`}>
      <body className="min-h-dvh overflow-x-clip">{children}</body>
    </html>
  );
}
