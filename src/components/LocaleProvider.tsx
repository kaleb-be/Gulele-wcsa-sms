"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Locale = "en" | "am";

interface LocaleContextType {
  locale: Locale;
  t: (key: string) => string;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({
  children,
  initialLocale,
  initialMessages,
  allMessages,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialMessages: any;
  allMessages: { en: any; am: any };
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<any>(initialMessages);

  const t = (key: string) => {
    const keys = key.split(".");
    let value = messages;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return typeof value === "string" ? value : key;
  };

  const toggleLocale = () => {
    const newLocale = locale === "en" ? "am" : "en";
    setLocale(newLocale);
    setMessages(allMessages[newLocale]);
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
  };

  return (
    <LocaleContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
