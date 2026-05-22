// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import AuthSessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "WCS Office - Support Management System",
  description: "Women, Children and Social Affairs Office — Gullele Sub-City",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <body className="bg-gray-50 min-h-screen">
    <AuthSessionProvider>
      <Toaster position="top-right" />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </AuthSessionProvider>
    </body>
    </html>
  );
}