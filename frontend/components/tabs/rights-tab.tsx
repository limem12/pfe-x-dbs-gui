"use client"

import { useEffect, useMemo, useState } from "react"
import type { Right } from "@/lib/api"
import { usePermissions } from "@/lib/usePermissions"
import { useStore } from "@/lib/store-api"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  X,
  Zap,
} from "lucide-react"

type RightFormState = {
  id_right: string
  description: string
  module: string
}

const DEFAULT_RIGHT_IDS = new Set([
  "VIEW_DATA",
  "EDIT_PRODUCT",
  "EDIT_STEP",
  "EDIT_SEQUENCE",
  "MANAGE_USERS",
])

const EMPTY_RIGHT_FORM: RightFormState = {
  id_right: "",
  description: "",
  module: "",
}

const NEW_MODULE_OPTION = "__NEW__"
const UNASSIGNED_MODULE_LABEL = "Sans module"

function compareModules(left: string, right: string): number {
  if (left === "X-DBS-GUI" && right !== "X-DBS-GUI") {
    return -1
  }

  if (right === "X-DBS-GUI" && left !== "X-DBS-GUI") {
    return 1
  }

  if (left === UNASSIGNED_MODULE_LABEL && right !== UNASSIGNED_MODULE_LABEL) {
    return 1
  }

  if (right === UNASSIGNED_MODULE_LABEL && left !== UNASSIGNED_MODULE_LABEL) {
    return -1
  }

  return left.localeCompare(right)
}

function normalizeValue(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString()
}

function buildModuleLabel(module?: string | null): string {
  return module || UNASSIGNED_MODULE_LABEL
}

function RightModal({
  editingRight,
  form,
  existingModules,
  showNewModuleInput,
  newModule,
  onClose,
  onChange,
  onToggleNewModuleInput,
  onNewModuleChange,
  onSave,
}: {
  editingRight: Right | null
  form: RightFormState
  existingModules: string[]
  showNewModuleInput: boolean
  newModule: string
  onClose: () => void
  onChange: (patch: Partial<RightFormState>) => void
  onToggleNewModuleInput: (show: boolean) => void
  onNewModuleChange: (module: string) => void
  onSave: () => Promise<void>
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm">
              {editingRight ? (
                <Pencil className="h-4 w-4 text-white" />
              ) : (
                <Plus className="h-4 w-4 text-white" />
              )}
            </div>
            <div>
              <h2 className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">
                {editingRight ? t("rights", "modalEditTitle") : t("rights", "modalCreateTitle")}
              </h2>
              <p className="text-[11px] text-slate-400">
                {editingRight
                  ? `${t("steps", "modalEditSubtitle")} ${editingRight.id_right}`
                  : t("rights", "modalCreateSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
              {t("rights", "idLabel")}
            </label>
            <input
              type="text"
              value={form.id_right}
              onChange={(event) =>
                onChange({ id_right: event.target.value.toUpperCase() })
              }
              placeholder="EXPORT_DATA"
              disabled={Boolean(editingRight)}
              className={`h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm uppercase shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                editingRight ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
              }`}
            />
            <p className="text-[10px] text-slate-400">
              {t("rights", "uniqueUppercaseId")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
              {t("fields", "description")}
            </label>
            <textarea
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={3}
              placeholder="Description detaillee de ce droit..."
              className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
              {t("rights", "moduleLabel")}
            </label>

            {!showNewModuleInput ? (
              <select
                value={form.module}
                onChange={(event) => {
                  if (event.target.value === NEW_MODULE_OPTION) {
                    onToggleNewModuleInput(true)
                    onChange({ module: "" })
                    return
                  }

                  onChange({ module: event.target.value })
                }}
                className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t("common", "selectModule")}</option>
                {existingModules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
                <option value={NEW_MODULE_OPTION}>{t("common", "createModule")}</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModule}
                  onChange={(event) => onNewModuleChange(event.target.value)}
                  placeholder="NOUVEAU_MODULE"
                  className="h-10 flex-1 rounded-xl border border-violet-200 bg-white px-3 text-sm uppercase shadow-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    onToggleNewModuleInput(false)
                    onNewModuleChange("")
                    onChange({ module: "" })
                  }}
                  className="rounded-xl border border-slate-200 px-3 text-sm text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {t("actions", "cancel")}
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400">
              Module ATP associe, par exemple X-DBS-GUI, PRODUCTION ou
              MAINTENANCE
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-violet-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 transition-all hover:bg-violet-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              void onSave()
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700 active:scale-95"
          >
            <Save className="h-4 w-4" />
            {editingRight ? "Enregistrer" : "Creer le droit"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RightsTab() {
  const { rights, roles, addRight, updateRight, deleteRight } = useStore()
  const { canManageUsers } = usePermissions()
  const { t } = useTranslation()
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingRight, setEditingRight] = useState<Right | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [showNewModuleInput, setShowNewModuleInput] = useState(false)
  const [newModule, setNewModule] = useState("")
  const [form, setForm] = useState<RightFormState>(EMPTY_RIGHT_FORM)

  const existingModules = useMemo(() => {
    const modules = new Set(
      rights.map((right) => right.module).filter((module): module is string => Boolean(module)),
    )

    return Array.from(modules).sort(compareModules)
  }, [rights])

  const rightsByModule = useMemo(() => {
    const groups: Record<string, Right[]> = {}

    rights.forEach((right) => {
      const moduleLabel = buildModuleLabel(right.module)

      if (!groups[moduleLabel]) {
        groups[moduleLabel] = []
      }

      groups[moduleLabel].push(right)
    })

    return Object.fromEntries(
      Object.entries(groups).sort(([left], [right]) => compareModules(left, right)),
    )
  }, [rights])

  const filteredRightsByModule = useMemo(() => {
    if (!searchQuery.trim()) {
      return rightsByModule
    }

    const filtered: Record<string, Right[]> = {}
    const normalizedSearch = normalizeValue(searchQuery)

    Object.entries(rightsByModule).forEach(([module, moduleRights]) => {
      const matchingRights = moduleRights.filter((right) =>
        [right.id_right, right.description, module, right.module].some((value) =>
          normalizeValue(value).includes(normalizedSearch),
        ),
      )

      if (matchingRights.length > 0) {
        filtered[module] = matchingRights
      }
    })

    return filtered
  }, [rightsByModule, searchQuery])

  const usageByRight = useMemo(() => {
    const usage = new Map<string, number>()

    roles.forEach((role) => {
      ;(role.rights || []).forEach((rightId) => {
        usage.set(rightId, (usage.get(rightId) || 0) + 1)
      })
    })

    return usage
  }, [roles])

  const sortedFilteredModules = useMemo(
    () =>
      Object.entries(filteredRightsByModule).sort(([left], [right]) =>
        compareModules(left, right),
      ),
    [filteredRightsByModule],
  )

  const moduleOrderKey = useMemo(
    () => Object.keys(rightsByModule).sort(compareModules).join("|"),
    [rightsByModule],
  )

  useEffect(() => {
    if (!moduleOrderKey) {
      return
    }

    const moduleLabels = moduleOrderKey.split("|")

    setExpandedModules((current) => {
      const next = new Set(current)
      let hasChanges = false

      moduleLabels.forEach((module) => {
        if (!next.has(module)) {
          next.add(module)
          hasChanges = true
        }
      })

      return hasChanges ? next : current
    })
  }, [moduleOrderKey])

  const totalRights = rights.length
  const totalModules = Object.keys(rightsByModule).length
  const defaultRightsCount = rights.filter((right) =>
    DEFAULT_RIGHT_IDS.has(right.id_right),
  ).length

  function updateForm(patch: Partial<RightFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function resetForm() {
    setForm(EMPTY_RIGHT_FORM)
    setShowNewModuleInput(false)
    setNewModule("")
    setEditingRight(null)
    setShowModal(false)
  }

  function openCreateModal() {
    setEditingRight(null)
    setForm(EMPTY_RIGHT_FORM)
    setShowNewModuleInput(false)
    setNewModule("")
    setShowModal(true)
  }

  function openEditModal(right: Right) {
    setEditingRight(right)
    setForm({
      id_right: right.id_right,
      description: right.description || "",
      module: right.module || "",
    })
    setShowNewModuleInput(false)
    setNewModule("")
    setShowModal(true)
  }

  async function handleSave() {
    const idRight = form.id_right.trim().toUpperCase()
    const finalModule = showNewModuleInput ? newModule.trim().toUpperCase() : form.module.trim().toUpperCase()

    if (!idRight) {
      toast.error(t("rights", "idRequired"))
      return
    }

    try {
      if (editingRight) {
        await updateRight(editingRight.id_right, {
          description: form.description,
          module: finalModule || null,
        })
      } else {
        await addRight({
          id_right: idRight,
          description: form.description,
          module: finalModule || null,
        })
      }

      resetForm()
    } catch {
      // Le store gere deja les erreurs.
    }
  }

  async function handleDelete(idRight: string) {
    if (isDeleting === idRight) {
      return
    }

    setIsDeleting(idRight)

    try {
      await deleteRight(idRight)
    } finally {
      setDeleteConfirm(null)
      setIsDeleting(null)
    }
  }

  function toggleModule(module: string) {
    setExpandedModules((current) => {
      const next = new Set(current)

      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }

      return next
    })
  }

  if (!canManageUsers()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Lock className="mb-4 h-14 w-14 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          {t("rights", "unauthorized")}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("rights", "unauthorizedHint")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total droits
              </p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {totalRights}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Modules
              </p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {totalModules}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Par defaut
              </p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {defaultRightsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 400 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par ID, module ou description..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Nouveau droit
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3.5 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">
              Droits par module
            </span>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {totalRights} droits
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedFilteredModules.map(([module, moduleRights]) => {
            const isExpanded =
              searchQuery.trim().length > 0 || expandedModules.has(module)

            return (
              <div key={module} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleModule(module)}
                  className="flex w-full items-center justify-between bg-slate-50 px-5 py-3 transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-violet-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-violet-500" />
                    )}
                    <span className="font-mono text-sm font-bold text-violet-700 dark:text-violet-400">
                      {module}
                    </span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-600">
                      {moduleRights.length}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">
                            ID droit
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">
                            Description
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">
                            Date creation
                          </th>
                          <th className="w-28 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleRights.map((right) => {
                          const linkedRolesCount = usageByRight.get(right.id_right) || 0

                          return (
                            <tr
                              key={right.id_right}
                              className="border-b border-slate-50 transition-colors hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-5 py-4">
                                <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-600 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400">
                                  {right.id_right}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                                {right.description || "—"}
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-500">
                                {formatDate(right.created_at)}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(right)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-violet-100 hover:text-violet-700"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(right.id_right)}
                                    disabled={linkedRolesCount > 0}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={
                                      linkedRolesCount > 0
                                        ? `${linkedRolesCount} role(s) utilisent ce droit`
                                        : "Supprimer"
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {Object.keys(filteredRightsByModule).length === 0 && (
            <div className="py-14 text-center">
              <div className="flex flex-col items-center gap-2">
                <Shield className="h-8 w-8 text-violet-200" />
                <p className="text-sm text-slate-400">{t("rights", "emptyState")}</p>
                <p className="text-xs text-slate-300">{t("rights", "emptyStateHint")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <RightModal
          editingRight={editingRight}
          form={form}
          existingModules={existingModules}
          showNewModuleInput={showNewModuleInput}
          newModule={newModule}
          onClose={resetForm}
          onChange={updateForm}
          onToggleNewModuleInput={setShowNewModuleInput}
          onNewModuleChange={(module) => {
            const normalizedModule = module.toUpperCase()
            setNewModule(normalizedModule)
            updateForm({ module: normalizedModule })
          }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
              Supprimer le droit
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              Etes-vous sur de vouloir supprimer le droit{" "}
              <span className="font-semibold">{deleteConfirm}</span> ?
              <br />
              Cette action est irreversible.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete(deleteConfirm)
                }}
                disabled={isDeleting === deleteConfirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all hover:from-red-600 hover:to-rose-700 disabled:opacity-50"
              >
                {isDeleting === deleteConfirm ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
