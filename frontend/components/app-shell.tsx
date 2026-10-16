"use client"

import { useEffect, useState } from "react"
import {
  Factory,
  GitBranch,
  History,
  KeyRound,
  Layers,
  LogOut,
  Menu,
  Moon,
  Package,
  Gauge,
  Shield,
  Sun,
  Workflow,
  Users,
  X,
} from "lucide-react"
import { ChangePasswordModal } from "@/components/change-password-modal"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTheme } from "@/components/theme-provider"
import { hasRight, isAdminRole } from "@/lib/access"
import { buildAssetUrl } from "@/lib/api"
import { useStore } from "@/lib/store-api"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

const tabIds = [
  { id: "steps", translationKey: "nav.steps" },
  { id: "sequences", translationKey: "nav.sequences" },
  { id: "products", translationKey: "nav.products" },
  { id: "execution-modes", translationKey: "nav.executionModes" },
  { id: "execution-config", translationKey: "nav.executionConfig" },
  { id: "product-step-values", translationKey: "nav.productStepValues" },
  { id: "product-limit-values", translationKey: "nav.productLimitValues" },
  { id: "rights", translationKey: "nav.rights" },
  { id: "roles", translationKey: "nav.roles" },
  { id: "users", translationKey: "nav.users" },
  { id: "history", translationKey: "nav.history" },
]

const tabConfig: Record<string, { icon: typeof Layers }> = {
  steps: { icon: Layers },
  sequences: { icon: GitBranch },
  products: { icon: Package },
  "execution-modes": { icon: Gauge },
  "execution-config": { icon: Workflow },
  "product-step-values": { icon: Workflow },
  "product-limit-values": { icon: Gauge },
  rights: { icon: KeyRound },
  roles: { icon: Shield },
  users: { icon: Users },
  history: { icon: History },
}

const navSections = [
  { labelKey: "", items: ["steps", "sequences", "products"] as const },
  {
    labelKey: "configuration",
    items: ["execution-modes", "execution-config"] as const,
  },
  {
    labelKey: "administration",
    items: ["rights", "roles", "users", "history"] as const,
  },
] as const

export default function AppShell({
  children,
  activeTab,
  setActiveTab,
}: AppShellProps) {
  const { currentUser, logout } = useStore()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const toast = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const tabs = tabIds.map((tab) => ({
    id: tab.id,
    label: t("nav", tab.translationKey.split(".")[1]),
    icon: tabConfig[tab.id].icon,
  }))

  const accessibleTabs = tabs.filter((tab) => {
    if (!currentUser) return false
    if (isAdminRole(currentUser.role)) return true

    switch (tab.id) {
      case "steps":
        return hasRight(currentUser, "VIEW_DATA") || hasRight(currentUser, "EDIT_STEP")
      case "sequences":
        return hasRight(currentUser, "VIEW_DATA") || hasRight(currentUser, "EDIT_SEQUENCE")
      case "products":
        return hasRight(currentUser, "VIEW_DATA") || hasRight(currentUser, "EDIT_PRODUCT")
      case "execution-modes":
      case "execution-config":
      case "product-step-values":
      case "product-limit-values":
        return hasRight(currentUser, "MANAGE_USERS")
      case "rights":
        return hasRight(currentUser, "MANAGE_USERS")
      case "roles":
        return hasRight(currentUser, "MANAGE_USERS")
      case "users":
        return hasRight(currentUser, "MANAGE_USERS")
      case "history":
        return hasRight(currentUser, "VIEW_DATA")
      default:
        return true
    }
  })

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      setActiveTab(event.detail.tab)
      const targetLabel = tabs.find((tab) => tab.id === event.detail.tab)?.label || event.detail.tab
      toast.success(t("common", "navigationTo").replace("{target}", targetLabel))
    }

    window.addEventListener("navigate", handleNavigate as EventListener)
    return () =>
      window.removeEventListener("navigate", handleNavigate as EventListener)
  }, [setActiveTab, toast, t, tabs])

  if (!currentUser) return null

  const bottomActionClass = cn(
    "flex items-center rounded-lg text-sm transition-colors",
    sidebarOpen
      ? "w-full gap-2 px-3 py-2.5 justify-start"
      : "w-10 h-10 justify-center self-center",
  )

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden transition-colors duration-300",
        theme === "dark" ? "bg-slate-950" : "bg-slate-50",
      )}
    >
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col overflow-hidden transition-all duration-300",
          theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-900 text-white",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        <div className="shrink-0 border-b border-slate-700 p-4 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Factory className="w-6 h-6 text-violet-400" />
              <span className="font-bold text-lg tracking-tight">X-DBS GUI</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
          {navSections.map((section) => {
            const sectionTabs = section.items
              .map((id) => accessibleTabs.find((tab) => tab.id === id))
              .filter((tab): tab is (typeof accessibleTabs)[number] => Boolean(tab))

            if (sectionTabs.length === 0) {
              return null
            }

            return (
              <div key={section.labelKey || "primary"} className="space-y-1">
                {sidebarOpen && section.labelKey && (
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t("nav", section.labelKey)}
                  </p>
                )}
                {sectionTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                      activeTab === tab.id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800",
                    )}
                    title={!sidebarOpen ? tab.label : undefined}
                  >
                    <tab.icon className="w-5 h-5 shrink-0" />
                    {sidebarOpen && <span>{tab.label}</span>}
                  </button>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-700 bg-slate-900/80 p-3 dark:bg-slate-950/90">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm"
            title={
              !sidebarOpen
                ? theme === "dark"
                  ? t("common", "lightMode")
                  : t("common", "darkMode")
                : undefined
            }
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{t("common", "lightMode")}</span>}
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{t("common", "darkMode")}</span>}
              </>
            )}
          </button>
        </div>

        <div className="shrink-0 border-t border-slate-700 bg-slate-900/95 p-3 space-y-3 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            {currentUser.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={buildAssetUrl(currentUser.avatar)}
                alt={currentUser.username}
                className="w-8 h-8 shrink-0 rounded-full object-cover ring-2 ring-slate-700"
              />
            ) : (
              <div className="w-8 h-8 shrink-0 bg-violet-600 rounded-full flex items-center justify-center text-sm font-bold">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.username}</p>
                <p className="text-xs text-slate-400">{currentUser.role}</p>
              </div>
            )}
          </div>

          <div className={cn("flex gap-2", sidebarOpen ? "flex-col" : "flex-col")}>
            <button
              onClick={() => setShowChangePassword(true)}
              className={cn(
                bottomActionClass,
                "text-slate-300 hover:bg-slate-800",
              )}
              title={t("users", "changePassword")}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{t("users", "changePassword")}</span>}
            </button>

            <button
              onClick={logout}
              className={cn(
                bottomActionClass,
                "text-slate-300 hover:bg-slate-800",
              )}
              title={t("common", "logout")}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{t("common", "logout")}</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "shrink-0 border-b px-6 py-4 flex items-center justify-between",
            theme === "dark"
              ? "bg-slate-900/95 border-slate-800"
              : "bg-white border-slate-200",
          )}
        >
          <h2
            className={cn(
              "text-xl font-semibold",
              theme === "dark" ? "text-white" : "text-slate-800",
            )}
          >
            {tabs.find((tab) => tab.id === activeTab)?.label}
          </h2>
          <LanguageSwitcher />
        </header>

        <div
          className={cn(
            "flex-1 overflow-auto p-6 transition-colors duration-300",
            theme === "dark" ? "bg-slate-950" : "bg-slate-50",
          )}
        >
          {children}
        </div>
      </main>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}
