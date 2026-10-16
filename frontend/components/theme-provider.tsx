// "use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

type Theme = "light" | "dark"
type BorderRadius = "none" | "sm" | "md" | "lg" | "full"
type FontSize = "sm" | "md" | "lg"

interface ThemeConfig {
  theme: Theme
  primaryColor: string
  borderRadius: BorderRadius
  fontSize: FontSize
}

interface ThemeContextType {
  config: ThemeConfig
  theme: Theme
  updateConfig: (key: keyof ThemeConfig, value: string) => void
  resetConfig: () => void
  toggleTheme: () => void
}

const defaultConfig: ThemeConfig = {
  theme: "light",
  primaryColor: "#3B82F6",
  borderRadius: "lg",
  fontSize: "md",
}

const ThemeContext = createContext<ThemeContextType>({
  config: defaultConfig,
  theme: defaultConfig.theme,
  updateConfig: () => {},
  resetConfig: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig)
  const [mounted, setMounted] = useState(false)

  const applyConfig = useCallback((cfg: ThemeConfig) => {
    const root = document.documentElement
    
    root.classList.remove("light", "dark")
    root.classList.add(cfg.theme)
    
    root.style.setProperty("--primary", cfg.primaryColor)
    root.style.setProperty("--primary-foreground", "#ffffff")
    
    const radiusMap: Record<BorderRadius, string> = {
      none: "0",
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      full: "9999px",
    }
    root.style.setProperty("--radius", radiusMap[cfg.borderRadius])
    
    const fontSizeMap: Record<FontSize, string> = {
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
    }
    root.style.setProperty("--font-size-base", fontSizeMap[cfg.fontSize])
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    const savedConfig = localStorage.getItem("themeConfig")
    let t: number | undefined
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        t = window.setTimeout(() => {
          setConfig(parsed)
          applyConfig(parsed)
        }, 0)
      } catch (e) {
        console.error("Error parsing theme config:", e)
      }
    }
    return () => {
      cancelAnimationFrame(raf)
      if (t) clearTimeout(t)
    }
  }, [applyConfig])

  

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("themeConfig", JSON.stringify(config))
      applyConfig(config)
    }
  }, [config, mounted, applyConfig])

  const updateConfig = useCallback((key: keyof ThemeConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig)
  }, [])

  const toggleTheme = useCallback(() => {
    setConfig(prev => ({ ...prev, theme: prev.theme === "light" ? "dark" : "light" }))
  }, [])

  return (
    <ThemeContext.Provider value={{ config, theme: config.theme, updateConfig, resetConfig, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  return context
}