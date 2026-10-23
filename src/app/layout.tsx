import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Heebo from the brand kit (variable weight, OFL licence alongside it).
const heebo = localFont({
  src: "./fonts/Heebo.ttf",
  variable: "--font-heebo",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "כָּרבוֹל", template: "%s · כָּרבוֹל" },
  description: "כָּרבוֹל: לוח משפחתי לביטוחים, רישיונות, מנויים וכל דבר שצריך לחדש.",
  applicationName: "כָּרבוֹל",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/brand/app-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2451D1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
