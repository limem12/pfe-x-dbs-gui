"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  Lock,
  Moon,
  Sun,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"
import { useStore } from "@/lib/store-api"
import { useTranslation } from "@/lib/useTranslation"

export default function LoginPage() {
  const { login } = useStore()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password.trim()) {
      toast.error(t("login", "errorEmpty"), {
        description: t("login", "fillAllFields"),
        duration: 4000,
      })
      return
    }

    setIsLoading(true)

    try {
      const user = await login(username, password)

      if (user) {
        toast.success(t("login", "welcome").replace("{username}", username), {
          description: t("login", "connectedNow"),
          duration: 3000,
        })
      } else {
        toast.error(t("login", "errorInvalid"), {
          description: t("login", "checkCredentials"),
          duration: 4000,
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ""
      const normalizedMessage = message.toLowerCase()

      if (
        normalizedMessage.includes("desactive") ||
        normalizedMessage.includes("désactivé") ||
        normalizedMessage.includes("inactif")
      ) {
        toast.error(t("common", "disabledAccount"), {
          description:
            t("login", "contactAdmin"),
          duration: 5000,
        })
      } else if (
        normalizedMessage.includes("incorrect") ||
        normalizedMessage.includes("unauthorized")
      ) {
        toast.error(t("common", "authFailed"), {
          description: t("login", "errorInvalid"),
          duration: 4000,
        })
      } else {
        toast.error(t("common", "connectionError"), {
          description: message || t("login", "retryLater"),
          duration: 4000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 to-purple-900">
        <div className="text-white flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{t("login", "loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 dark:from-slate-950 dark:via-violet-950 dark:to-purple-950 relative overflow-hidden"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-full blur-3xl" />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-lg transition-all hover:scale-110 z-10"
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-violet-600" />
        )}
      </button>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/50 overflow-hidden">
          <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-4 left-4 w-20 h-20 border-2 border-white rounded-full" />
              <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-white rounded-full" />
              <div className="absolute top-1/2 right-8 w-12 h-12 bg-white rounded-full" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
                <Factory className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                {t("login", "title")}
              </h1>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                  {t("login", "username")}
                </label>
                <div
                  className={`relative transition-all duration-200 ${
                    focusedField === "username" ? "scale-[1.01]" : ""
                  }`}
                >
                  <User
                    className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "username"
                        ? "text-violet-500"
                        : "text-slate-400"
                    }`}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all"
                    placeholder={t("login", "usernamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                  {t("login", "password")}
                </label>
                <div
                  className={`relative transition-all duration-200 ${
                    focusedField === "password" ? "scale-[1.01]" : ""
                  }`}
                >
                  <Lock
                    className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "password"
                        ? "text-violet-500"
                        : "text-slate-400"
                    }`}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all"
                    placeholder={t("login", "passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-violet-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("login", "loggingIn")}
                    </>
                  ) : (
                    <>
                      {t("login", "loginBtn")}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          {t("login", "copyright")}
        </p>
      </div>
    </div>
  )
}
