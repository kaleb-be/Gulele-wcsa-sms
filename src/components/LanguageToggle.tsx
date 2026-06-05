"use client";

import { useLocale } from "./LocaleProvider";

export default function LanguageToggle() {
  const { locale, toggleLocale } = useLocale();

  return (
    <button
      onClick={toggleLocale}
      className="border border-gray-300 bg-gray-50 rounded-full px-3 py-1.5 h-8 text-sm flex items-center gap-1 hover:bg-blue-100 transition-colors"
    >
      <span className={locale === "en" ? "text-blue-900 font-bold" : "text-gray-400"}>
        EN
      </span>
      <span className="text-gray-300">|</span>
      <span className={locale === "am" ? "text-blue-900 font-bold" : "text-gray-400"}>
        አማ
      </span>
    </button>
  );
}
