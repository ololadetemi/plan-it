import "./globals.css";
import "./planner.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Plan-it",
  description: "A small, personal daily planner.",
  applicationName: "Plan-it",
  appleWebApp: { capable: true, title: "Plan-it", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [120, 152, 167, 180].map((n) => ({ url: `/icons/apple-touch-icon-${n}.png`, sizes: `${n}x${n}`, type: "image/png" })),
  },
};
export const viewport: Viewport = { themeColor: "#c2467f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Quicksand:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
