"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import logo from "@/assets/gwcsa logo.png";
import LanguageToggle from "./LanguageToggle";
import { useLocale } from "./LocaleProvider";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const { t } = useLocale();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Hide navbar on login page or while session is loading
  if (pathname === "/login" || status === "loading") return null;

  // Hide navbar if not logged in
  if (!session) return null;

  const isAdmin = (session.user as any)?.role === "admin";

  const links = [
    { href: "/", label: t("nav.dashboard") },
    { href: "/beneficiaries", label: t("nav.beneficiaries") },
    { href: "/ngos", label: t("nav.ngos") },
    { href: "/assign", label: t("nav.enroll") },
    { href: "/import", label: t("nav.import") },
    // { href: "/budget", label: t("nav.budget") },
    // { href: "/quota-requests", label: t("nav.quotaRequests") },
    ...(isAdmin ? [{ href: "/users", label: t("nav.users") }] : []),
  ];

  return (
    <nav className="bg-blue-900 text-white no-print w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="font-bold text-sm lg:text-sm flex items-center gap-2"
          >
            <div className="w-10 h-10 overflow-hidden rounded-full flex items-center justify-center bg-white/10 sm:bg-transparent">
              <Image
                src={logo}
                alt={"GWCSA logo"}
                width={40}
                height={40}
                className="object-cover scale-[2.1]"
              />
            </div>
            <span className="hidden sm:inline">
              {t("login.title")} — {t("login.subtitle")}
            </span>
            <span className="text-lg sm:hidden">{t("nav.mobileTitle")}</span>
          </Link>

          <div className="hidden md:flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-blue-800 text-white"
                    : "hover:bg-blue-800 text-blue-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop: user name + sign out */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-blue-200">{session.user?.name}</span>
            <LanguageToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm bg-gray-50 hover:bg-blue-700 px-3 py-1.5 h-8 rounded-lg transition-colors text-blue-900 hover:text-gray-50 font-semibold"
            >
              {t("nav.signOut")}
            </button>
          </div>
          <div className="flex md:hidden justify-between items-center gap-3">
            <LanguageToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex justify-between items-center gap-1 md:hidden p-2 rounded font-semibold text-blue-900 bg-gray-50 hover:bg-blue-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>{" "}
              {t("nav.toggleMenu")}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        } md:hidden`}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-64 bg-blue-900 shadow-xl transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-14 px-4 border-b border-blue-800">
              <span className="font-bold text-md">{t("nav.toggleMenu")}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded text-blue-100 hover:bg-blue-800 focus:outline-none"
                aria-label="Close menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 px-2 py-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-gray-50 hover:bg-blue-100 text-blue-900 font-semibold"
                      : "text-blue-100 hover:bg-blue-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile: user name + sign out at bottom of drawer */}
            <div className="px-4 py-4 border-t border-blue-800 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-200">{session.user?.name}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-sm text-blue-900 active:text-blue-700 bg-gray-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors text-left"
              >
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
