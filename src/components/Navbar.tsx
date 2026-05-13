"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "@/assets/gwcsa logo.png";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/beneficiaries", label: "Beneficiaries" },
    { href: "/ngos", label: "NGOs" },
    { href: "/assign", label: "Assign Support" },
    { href: "/services", label: "Services" },
  ];

  return (
    <nav className="bg-blue-900 text-white no-print w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          <Link href="/" className="font-bold text-sm lg:text-sm flex items-center gap-2">
            <div className="w-10 h-10 overflow-hidden rounded-full flex items-center justify-center bg-white/10 sm:bg-transparent">
              <Image 
                src={logo} 
                alt={"GWCSA logo"} 
                width={40}
                height={40}
                className="object-cover scale-[2.1]"
              />
            </div>
            <span className="hidden sm:inline">GWCSA Office — Gullele</span>
            <span className="sm:hidden">GWCSA</span>
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

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded text-blue-100 hover:bg-blue-800 focus:outline-none"
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
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        } md:hidden`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
        <div
          className={`absolute right-0 top-0 h-full w-64 bg-blue-900 shadow-xl transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-14 px-4 border-b border-blue-800">
              <span className="font-bold text-sm">Menu</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded text-blue-100 hover:bg-blue-800 focus:outline-none"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                      ? "bg-blue-800 text-white"
                      : "text-blue-100 hover:bg-blue-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
