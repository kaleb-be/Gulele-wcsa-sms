import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import AuthSessionProvider from "@/components/SessionProvider";
import { Noto_Sans_Ethiopic } from "next/font/google";
import { cookies } from "next/headers";
import enMessages from "@/messages/en.json";
import amMessages from "@/messages/am.json";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Analytics } from "@vercel/analytics/next";

const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "500", "700"],
  variable: "--font-ethiopic",
});

export const viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "WCS Office - Support Management System",
  description: "Women, Children and Social Affairs Office — Gullele Sub-City",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WCSA Office",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as "en" | "am") || "en";
  const messages = locale === "en" ? enMessages : amMessages;
  const allMessages = { en: enMessages, am: amMessages };

  return (
    <html
      lang={locale}
      className={locale === "am" ? ethiopic.variable : ""}
      style={locale === "am" ? { fontFamily: "var(--font-ethiopic)" } : {}}
    >
      <body className="bg-gray-50 min-h-screen">
        <LocaleProvider
          initialLocale={locale}
          initialMessages={messages}
          allMessages={allMessages}
        >
          <AuthSessionProvider>
            <Toaster position="top-right" />
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
          </AuthSessionProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}