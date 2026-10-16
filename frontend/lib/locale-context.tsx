"use client"

// ============================================================
//  lib/locale-context.tsx  —  Context + Hook pour la langue
// ============================================================

import React, { createContext, useContext, useEffect, useState } from "react"
import type { Locale } from "@/lib/i18n"

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "fr",
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = localStorage.getItem("dbs-locale") as Locale | null
      if (stored === "fr" || stored === "en") {
        setLocaleState(stored)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    if (typeof window !== "undefined") {
      localStorage.setItem("dbs-locale", l)
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
