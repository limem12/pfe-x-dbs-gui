"use client"

import { useState } from "react"
import type { Right, Role } from "@/lib/api"
import { usePermissions } from "@/lib/usePermissions"
import { useStore } from "@/lib/store-api"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import {
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react"

type RoleFormState = {
  id_role: string
  description: string
  rights: string[]
}

const EMPTY_ROLE_FORM: RoleFormState = {
  id_role: "",
  description: "",
  rights: [],
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

function RoleModal({
  editingRole,
  form,
  rights,
  onClose,
  onChange,
  onToggleRight,
  onSave,
}: {
  editingRole: Role | null
  form: RoleFormState
  rights: Right[]
  onClose: () => void
  onChange: (patch: Partial<RoleFormState>) => void
  onToggleRight: (rightId: string) => void
  onSave: () => Promise<void>
}) {
  const rightsByModule = rights.reduce<Record<string, Right[]>>((groups, right) => {
    const moduleLabel = right.module || "Sans module"

    if (!groups[moduleLabel]) {
      groups[moduleLabel] = []
    }

    groups[moduleLabel].push(right)
    return groups
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingRole ? "Modifier le role" : "Nouveau role"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {editingRole
                ? `Edition du role ${editingRole.id_role}`
                : "Definir les droits associes a ce role"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Identifiant du role
                </label>
                <input
                  type="text"
                  value={form.id_role}
                  onChange={(event) =>
                    onChange({ id_role: event.target.value.toUpperCase() })
                  }
                  disabled={Boolean(editingRole)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                  placeholder="TECHNICIEN"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => onChange({ description: event.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Role de supervision"
                />
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Droits associes
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                  {Object.entries(rightsByModule)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([module, moduleRights]) => (
                      <div
                        key={module}
                        className="overflow-hidden rounded-2xl border border-violet-100 bg-white dark:border-violet-900/40 dark:bg-slate-900"
                      >
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2 text-sm font-semibold text-violet-700 dark:from-slate-800 dark:to-slate-800 dark:text-violet-300">
                          {module} ({moduleRights.length})
                        </div>
                        <div className="grid gap-3 p-4 md:grid-cols-2">
                          {moduleRights.map((right) => {
                            const checked = form.rights.includes(right.id_right)

                            return (
                              <label
                                key={right.id_right}
                                className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${
                                  checked
                                    ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30"
                                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => onToggleRight(right.id_right)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {right.id_right}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {right.description || "Sans description"}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                  {rights.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Aucun droit disponible.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              void onSave()
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
          >
            <Save className="h-4 w-4" />
            {editingRole ? "Enregistrer" : "Creer"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RolesTab() {
  const { roles, rights, users, addRole, updateRole, deleteRole } = useStore()
  const { canManageUsers } = usePermissions()
  const toast = useToast()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState<RoleFormState>(EMPTY_ROLE_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  if (!canManageUsers()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Lock className="mb-4 h-14 w-14 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          {t("common", "accessDenied")}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("common", "manageUsersRequired")}
        </p>
      </div>
    )
  }

  const normalizedSearch = normalizeValue(searchQuery)
  const filteredRoles = roles.filter((role) => {
    if (!normalizedSearch) {
      return true
    }

    return [role.id_role, role.description].some((value) =>
      normalizeValue(value).includes(normalizedSearch),
    )
  })

  function updateForm(patch: Partial<RoleFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function toggleRight(rightId: string) {
    setForm((current) => ({
      ...current,
      rights: current.rights.includes(rightId)
        ? current.rights.filter((value) => value !== rightId)
        : [...current.rights, rightId],
    }))
  }

  function openCreateModal() {
    setEditingRole(null)
    setForm(EMPTY_ROLE_FORM)
    setShowModal(true)
  }

  function openEditModal(role: Role) {
    setEditingRole(role)
    setForm({
      id_role: role.id_role,
      description: role.description,
      rights: [...(role.rights || [])],
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingRole(null)
    setForm(EMPTY_ROLE_FORM)
  }

  async function handleSave() {
    const roleId = form.id_role.trim().toUpperCase()
    const description = form.description.trim()

    if (!roleId) {
      toast.error(t("common", "roleIdRequired"))
      return
    }

    if (!description) {
      toast.error(t("common", "roleDescriptionRequired"))
      return
    }

    try {
      if (editingRole) {
        await updateRole(editingRole.id_role, {
          description,
          rights: form.rights,
        })
      } else {
        await addRole({
          id_role: roleId,
          description,
          rights: form.rights,
        })
      }

      closeModal()
    } catch {
      // Le store gere deja l'affichage d'erreur.
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteRole(deleteTarget.id_role)
    } catch {
      // Le store gere deja l'affichage d'erreur.
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Roles
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {roles.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Droits disponibles
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {rights.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Utilisateurs assignes
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {users.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher par identifiant ou description"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau role
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Liste des roles
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredRoles.length} resultat{filteredRoles.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Droits
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Utilisateurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Cree le
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRoles.map((role) => {
                const usersCount = users.filter((user) => user.role === role.id_role).length

                return (
                  <tr
                    key={role.id_role}
                    className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
                        {role.id_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {role.description}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(role.rights || []).length ? (
                          role.rights.map((right) => (
                            <span
                              key={right}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {right}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            Aucun droit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {usersCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(role.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(role)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(role)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredRoles.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aucun role trouve.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RoleModal
          editingRole={editingRole}
          form={form}
          rights={rights}
          onClose={closeModal}
          onChange={updateForm}
          onToggleRight={toggleRight}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Supprimer le role
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Le role <span className="font-semibold">{deleteTarget.id_role}</span>{" "}
              {"sera supprime s'il n'est plus assigne a aucun utilisateur."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDelete()
                }}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
