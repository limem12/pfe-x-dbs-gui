"use client"

import { useMemo, useState } from "react"
import { useStore } from "@/lib/store-api"
import { buildAssetUrl } from "@/lib/api"
import { useTheme } from "@/components/theme-provider"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import {
  Search,
  Download,
  History,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  ArrowUpDown,
  MoveRight,
  Filter,
} from "lucide-react"
import {
  toLocalDate,
  toLocalDateKey,
  toLocalDateTime,
  toLocalTime,
} from "@/lib/date-utils"

const HISTORY_ACTION_LABELS: Record<string, string> = {
  creation: "Creation",
  modification: "Modification",
  suppression: "Suppression",
  connexion: "Connexion",
  deconnexion: "Deconnexion",
  reordonner: "Reordonner",
  deplacer: "Deplacer",
}

const HISTORY_ENTITY_LABELS: Record<string, string> = {
  product: "Produit",
  produit: "Produit",
  step: "Step",
  sequence: "Sequence",
  user: "User",
}

const ACTION_CONFIG: Record<
  string,
  {
    bg: string
    text: string
    border: string
    icon: React.ReactNode
  }
> = {
  Creation: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <Plus className="h-3 w-3" />,
  },
  Modification: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    icon: <Pencil className="h-3 w-3" />,
  },
  Suppression: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: <Trash2 className="h-3 w-3" />,
  },
  Connexion: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    icon: <LogIn className="h-3 w-3" />,
  },
  Deconnexion: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: <LogOut className="h-3 w-3" />,
  },
  Reordonner: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <ArrowUpDown className="h-3 w-3" />,
  },
  Deplacer: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    icon: <MoveRight className="h-3 w-3" />,
  },
}

const ENTITY_CONFIG: Record<
  string,
  {
    bg: string
    text: string
    border: string
    pill: string
  }
> = {
  Step: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    pill: "bg-violet-600",
  },
  Sequence: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    pill: "bg-purple-600",
  },
  Produit: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    pill: "bg-indigo-600",
  },
  User: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    pill: "bg-emerald-600",
  },
}

type HistoryRow = {
  id: number
  user: string
  avatar: string | null
  action: string
  entity: string
  details: string
  date: string
}

function normalizeHistoryKey(value: string): string {
  return value
    .replaceAll(`Cr${"\u00c3\u00a9"}ation`, "Creation")
    .replaceAll(`D${"\u00c3\u00a9"}connexion`, "Deconnexion")
    .replaceAll(`R${"\u00c3\u00a9"}ordonner`, "Reordonner")
    .replaceAll(`D${"\u00c3\u00a9"}placer`, "Deplacer")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function normalizeHistoryAction(action: string): string {
  const normalizedAction = HISTORY_ACTION_LABELS[normalizeHistoryKey(action)]
  return normalizedAction || action.trim()
}

function normalizeHistoryEntity(entity: string): string {
  const normalizedEntity = HISTORY_ENTITY_LABELS[normalizeHistoryKey(entity)]
  return normalizedEntity || entity.trim()
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action]

  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {action}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.icon}
      {action}
    </span>
  )
}

function EntityBadge({ entity }: { entity: string }) {
  const cfg = ENTITY_CONFIG[entity]

  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
        {entity}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.pill}`} />
      {entity}
    </span>
  )
}

function UserAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const initials = (name || "U")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const avatarUrl = buildAssetUrl(avatar)

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-7 w-7 shrink-0 rounded-full border border-violet-200 object-cover shadow-sm"
      />
    )
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white shadow-sm">
      {initials}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10 ${color}`} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${color} shadow-sm`}
          >
            {icon}
          </div>
        </div>
        <p className="text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  )
}

export default function HistoryTab() {
  const { history } = useStore()
  useTheme()
  const { t } = useTranslation()
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterEntity, setFilterEntity] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const historyRows = useMemo<HistoryRow[]>(() => {
    if (!Array.isArray(history)) {
      return []
    }

    return history.filter(Boolean).map((entry) => ({
      id: entry.id,
      user: entry.user || "",
      avatar: entry.avatar || null,
      action: normalizeHistoryAction(entry.action || ""),
      entity: normalizeHistoryEntity(entry.entity || ""),
      details: entry.details || "",
      date: entry.date || "",
    }))
  }, [history])

  const availableActions = useMemo(() => {
    const actions = [...new Set(historyRows.map((item) => item.action).filter(Boolean))]
    return ["all", ...actions]
  }, [historyRows])

  const availableEntities = useMemo(() => {
    const entities = [...new Set(historyRows.map((item) => item.entity).filter(Boolean))]
    return ["all", ...entities]
  }, [historyRows])

  const filteredHistory = useMemo(() => {
    const searchLower = searchQuery.toLowerCase()

    return historyRows.filter((entry) => {
      const localDateTime = toLocalDateTime(entry.date).toLowerCase()
      const localDateKey = toLocalDateKey(entry.date)

      const matchesSearch =
        entry.user.toLowerCase().includes(searchLower) ||
        entry.action.toLowerCase().includes(searchLower) ||
        entry.entity.toLowerCase().includes(searchLower) ||
        entry.details.toLowerCase().includes(searchLower) ||
        localDateTime.includes(searchLower) ||
        entry.date.toLowerCase().includes(searchLower)

      const matchesAction = filterAction === "all" || entry.action === filterAction
      const matchesEntity = filterEntity === "all" || entry.entity === filterEntity

      const matchesStartDate = !startDate || localDateKey >= startDate
      const matchesEndDate = !endDate || localDateKey <= endDate

      return (
        matchesSearch &&
        matchesAction &&
        matchesEntity &&
        matchesStartDate &&
        matchesEndDate
      )
    })
  }, [endDate, filterAction, filterEntity, historyRows, searchQuery, startDate])

  const exportCSV = () => {
    const headers = ["Date", "Utilisateur", "Action", "Details", "Entite"]
    const rows = filteredHistory.map((entry) => [
      toLocalDateTime(entry.date),
      entry.user,
      entry.action,
      entry.details,
      entry.entity,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `dbs-history-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success(
      t("history", "exportSuccess").replace(
        "{count}",
        filteredHistory.length.toString(),
      ),
    )
  }

  const creations = historyRows.filter((entry) => entry.action === "Creation").length
  const modifs = historyRows.filter((entry) => entry.action === "Modification").length
  const suppressions = historyRows.filter((entry) => entry.action === "Suppression").length
  const connexions = historyRows.filter((entry) => entry.action === "Connexion").length

  return (
    <div
      className="flex flex-col gap-6"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 380 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("history", "searchPlaceholder")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder="Date debut"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder="Date fin"
          />
        </div>

        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-400" />
          <select
            value={filterAction}
            onChange={(event) => setFilterAction(event.target.value)}
            className="h-10 appearance-none rounded-xl border border-violet-200 bg-white pl-8 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action === "all" ? "Toutes les actions" : action}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-purple-400" />
          <select
            value={filterEntity}
            onChange={(event) => setFilterEntity(event.target.value)}
            className="h-10 appearance-none rounded-xl border border-purple-200 bg-white pl-8 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          >
            {availableEntities.map((entity) => (
              <option key={entity} value={entity}>
                {entity === "all" ? "Toutes les entites" : entity}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:from-emerald-600 hover:to-green-700 hover:shadow-emerald-300 active:scale-95"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Entrees"
          value={historyRows.length}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
          icon={<History className="h-3.5 w-3.5 text-white" />}
        />
        <StatCard
          label="Creations"
          value={creations}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
          icon={<Plus className="h-3.5 w-3.5 text-white" />}
        />
        <StatCard
          label="Modifications"
          value={modifs}
          color="bg-gradient-to-br from-sky-500 to-blue-600"
          icon={<Pencil className="h-3.5 w-3.5 text-white" />}
        />
        <StatCard
          label="Connexions"
          value={connexions}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          icon={<LogIn className="h-3.5 w-3.5 text-white" />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-bold text-violet-800">
              Journal d&apos;activite
            </span>
          </div>
          {suppressions > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
              <Trash2 className="h-3 w-3" />
              {suppressions} suppression{suppressions > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Date & Heure", "Utilisateur", "Action", "Details", "Entite"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <History className="h-8 w-8 text-violet-200" />
                      <p className="text-sm font-medium text-slate-400">
                        Aucune entree dans l&apos;historique
                      </p>
                      <p className="text-xs text-slate-300">
                        Les actions apparaitront ici automatiquement.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((entry, index) => (
                  <tr
                    key={`${entry.id}-${index}`}
                    className="group border-b border-slate-50 transition-colors duration-100 last:border-0 hover:bg-violet-50/30"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700">
                          {toLocalDate(entry.date)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {toLocalTime(entry.date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={entry.user} avatar={entry.avatar} />
                        <span className="text-sm font-semibold text-slate-800">
                          {entry.user}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-5 py-3.5">
                      <p
                        className="max-w-xs truncate text-sm text-slate-600"
                        title={entry.details}
                      >
                        {entry.details}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <EntityBadge entity={entry.entity} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
