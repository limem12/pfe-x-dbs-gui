"use client"

// ============================================================
//  components/language-switcher.tsx  —  Bouton FR / EN navbar
// ============================================================

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check, Globe } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const btnRef = React.useRef<HTMLButtonElement>(null)

  const current = LANGUAGES.find((l) => l.code === locale)!

  function handleOpen() {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 6,
      right: window.innerWidth - r.right,
      zIndex: 99999,
      minWidth: 160,
    })
    setOpen(true)
  }

  function handleSelect(code: Locale) {
    setLocale(code)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:bg-violet-50 hover:border-violet-300 hover:shadow-md active:scale-95"
      >
        <Globe className="h-4 w-4 text-violet-500" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-violet-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown portal */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[99998]" onClick={() => setOpen(false)} />

          {/* Menu */}
          <div
            style={menuStyle}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-500">
                <Globe className="h-3 w-3" /> Langue / Language
              </p>
            </div>

            {/* Options */}
            <div className="p-1.5">
              {LANGUAGES.map((lang) => {
                const isActive = lang.code === locale
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <span className="text-xl leading-none">{lang.flag}</span>
                    <span className={`flex-1 text-sm font-semibold ${isActive ? "text-violet-700" : "text-slate-700"}`}>
                      {lang.label}
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-violet-600" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}