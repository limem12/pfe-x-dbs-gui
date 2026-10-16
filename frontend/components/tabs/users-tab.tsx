"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AvatarUploader } from "@/components/avatar-uploader"
import type { Role, User } from "@/lib/api"
import { buildAssetUrl, uploadsApi } from "@/lib/api"
import { ResetPasswordModal } from "@/components/reset-password-modal"
import { usePermissions } from "@/lib/usePermissions"
import { useStore } from "@/lib/store-api"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import {
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"

type UserFormState = {
  username: string
  password: string
  confirmPassword: string
  role: string
  email: string
  phone: string
  address: string
  avatar: string
  status: "ENABLED" | "DISABLED"
}

const EMPTY_FORM: UserFormState = {
  username: "",
  password: "",
  confirmPassword: "",
  role: "",
  email: "",
  phone: "",
  address: "",
  avatar: "",
  status: "ENABLED",
}

function normalizeValue(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function matchesSearch(user: User, search: string) {
  if (!search) {
    return true
  }

  const values = [
    user.username,
    user.role,
    user.status,
    user.email || "",
    user.phone || "",
    user.address || "",
    ...(user.rights || []),
  ]

  return values.some((value) => normalizeValue(value).includes(search))
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString()
}

function UserAvatar({
  username,
  role,
  avatar,
  className = "h-10 w-10",
}: {
  username: string
  role: string
  avatar?: string | null
  className?: string
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  const initial = username.charAt(0).toUpperCase() || "?"
  const isAdmin = normalizeValue(role) === "admin"
  const resolvedAvatar = buildAssetUrl(avatar)
  const canShowAvatar = Boolean(avatar) && failedAvatar !== avatar

  if (canShowAvatar && avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedAvatar}
        alt={username}
        className={`${className} rounded-full object-cover ring-2 ring-white shadow-sm`}
        onError={() => setFailedAvatar(avatar)}
      />
    )
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
        isAdmin ? "bg-sky-600" : "bg-violet-600"
      }`}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: User["status"] }) {
  const enabled = status === "ENABLED"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          enabled ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {enabled ? "Actif" : "Desactive"}
    </span>
  )
}

function RightsTooltip({
  rights,
  children,
}: {
  rights: string[]
  children: ReactNode
}) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function clearHideTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  function handleMouseEnter() {
    clearHideTimeout()

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 12,
        left: rect.left + rect.width / 2,
      })
    }

    setShow(true)
  }

  function handleMouseLeave() {
    clearHideTimeout()
    timeoutRef.current = setTimeout(() => setShow(false), 100)
  }

  if (rights.length === 0) {
    return <>{children}</>
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[9999] transition-all duration-150 ease-out"
              style={{
                top: position.top,
                left: position.left,
                transform: "translateX(-50%) translateY(-100%)",
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-slate-800" />
              <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800 shadow-2xl">
                <div className="bg-gradient-to-r from-violet-600 to-sky-600 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-white/80" />
                    <span className="text-xs font-semibold text-white">
                      Droits supplementaires
                    </span>
                    <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] text-white">
                      {rights.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto p-2">
                  {rights.map((right) => (
                    <div
                      key={right}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      <span className="text-xs font-medium text-slate-200">
                        {right}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function UserRightsBadges({ rights }: { rights?: string[] | null }) {
  const normalizedRights = rights || []

  if (normalizedRights.length === 0) {
    return (
      <span className="text-sm text-slate-500 italic dark:text-slate-400">
        Aucun droit
      </span>
    )
  }

  const visibleRights = normalizedRights.slice(0, 2)
  const hiddenRights = normalizedRights.slice(2)

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleRights.map((right) => (
        <span
          key={right}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 bg-gradient-to-r from-violet-50 to-white px-2.5 py-1 text-xs font-medium text-violet-700 shadow-sm transition-all hover:shadow-md dark:border-violet-900 dark:from-violet-950/40 dark:to-slate-900 dark:text-violet-300"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          {right}
        </span>
      ))}
      {hiddenRights.length > 0 && (
        <RightsTooltip rights={hiddenRights}>
          <span className="inline-flex cursor-help items-center gap-1 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-2.5 py-1 text-xs font-medium text-violet-600 transition-all hover:bg-violet-100 hover:shadow-md dark:border-violet-900 dark:from-violet-950/40 dark:to-slate-900 dark:text-violet-300">
            <Plus className="h-3 w-3" />
            +{hiddenRights.length}
          </span>
        </RightsTooltip>
      )}
    </div>
  )
}

function UserFormModal({
  editingUser,
  form,
  roles,
  onClose,
  onChange,
  onPendingAvatarChange,
  onSave,
}: {
  editingUser: User | null
  form: UserFormState
  roles: Role[]
  onClose: () => void | Promise<void>
  onChange: (patch: Partial<UserFormState>) => void
  onPendingAvatarChange: (avatarUrl: string | null) => void
  onSave: () => Promise<void>
}) {
  const { t } = useTranslation()
  const selectedRole = roles.find((role) => role.id_role === form.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingUser ? t("users", "modalEditTitle") : t("users", "modalCreateTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {editingUser
                ? `${t("steps", "modalEditSubtitle")} ${editingUser.username}`
                : t("users", "modalCreateSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void onClose()
            }}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t("actions", "cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("users", "username")}
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => onChange({ username: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="john_doe"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("users", "role")}
                </label>
                <select
                  value={form.role}
                  onChange={(event) => onChange({ role: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">{t("common", "selectRole")}</option>
                  {roles.map((role) => (
                    <option key={role.id_role} value={role.id_role}>
                      {role.id_role} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!editingUser && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("users", "password")}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => onChange({ password: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Au moins 6 caracteres"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      onChange({ confirmPassword: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Retaper le mot de passe"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => onChange({ email: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Telephone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) => onChange({ phone: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="0612345678"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Adresse
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <textarea
                  value={form.address}
                  onChange={(event) => onChange({ address: event.target.value })}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="12 Rue de Paris, 75000 Paris"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Photo de profil
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <AvatarUploader
                  username={form.username || editingUser?.username || "utilisateur"}
                  currentAvatar={form.avatar || null}
                  onAvatarChange={(avatarUrl) =>
                    onChange({ avatar: avatarUrl || "" })
                  }
                  onPendingAvatarChange={onPendingAvatarChange}
                  size="md"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Glissez-deposez une image ou cliquez pour changer l&apos;avatar.
                Formats supportes: JPG, PNG, GIF, WEBP, BMP, TIFF, ICO, AVIF.
              </p>
            </div>

            {editingUser && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Statut
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {(["ENABLED", "DISABLED"] as const).map((status) => {
                    const active = form.status === status

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onChange({ status })}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {status === "ENABLED" ? "Actif" : "Desactive"}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                Droits du role selectionne
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRole?.rights?.length ? (
                  selectedRole.rights.map((right) => (
                    <span
                      key={right}
                      className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-slate-900 dark:text-violet-300"
                    >
                      {right}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Aucun droit charge pour ce role.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              void onClose()
            }}
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
            {editingUser ? "Enregistrer" : "Creer"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersTab() {
  const { users, roles, currentUser, addUser, updateUser, deleteUser } = useStore()
  const { canManageUsers } = usePermissions()
  const { t } = useTranslation()
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  if (!canManageUsers()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Lock className="mb-4 h-14 w-14 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Acces non autorise
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Vous ne disposez pas des droits pour gerer les utilisateurs.
        </p>
      </div>
    )
  }

  const normalizedSearch = normalizeValue(searchQuery)
  const filteredUsers = users.filter((user) => matchesSearch(user, normalizedSearch))
  const activeUsers = users.filter((user) => user.status === "ENABLED").length
  const adminUsers = users.filter((user) => user.role === "ADMIN").length

  function updateForm(patch: Partial<UserFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function openCreateModal() {
    setEditingUser(null)
    setPendingAvatarUrl(null)
    setForm({
      ...EMPTY_FORM,
      role: roles[0]?.id_role || "",
    })
    setShowModal(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setPendingAvatarUrl(null)
    setForm({
      username: user.username,
      password: "",
      confirmPassword: "",
      role: user.role,
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      avatar: user.avatar || "",
      status: user.status,
    })
    setShowModal(true)
  }

  function resetModalState() {
    setShowModal(false)
    setEditingUser(null)
    setPendingAvatarUrl(null)
    setForm(EMPTY_FORM)
  }

  async function cleanupPendingAvatar() {
    if (!pendingAvatarUrl) {
      return
    }

    try {
      await uploadsApi.deleteAvatar(pendingAvatarUrl)
    } catch (error) {
      console.error("Erreur suppression avatar temporaire:", error)
      toast.warning(t("common", "avatarCleanupIncomplete"), {
        description: t("common", "tempNotDeleted"),
      })
    }
  }

  async function closeModal() {
    await cleanupPendingAvatar()
    resetModalState()
  }

  async function handleSave() {
    const username = form.username.trim()

    if (!username) {
      toast.error(t("users", "nameRequired"))
      return
    }

    if (!form.role) {
      toast.error(t("common", "roleRequired"))
      return
    }

    if (!editingUser) {
      if (!form.password || !form.confirmPassword) {
        toast.error(t("users", "passwordsRequired"))
        return
      }

      if (form.password.length < 6) {
        toast.error(t("users", "passwordMinLength"))
        return
      }

      if (form.password !== form.confirmPassword) {
        toast.error(t("users", "passwordsMismatch"))
        return
      }
    }

    try {
      const normalizedAvatar = form.avatar.trim()

      if (editingUser) {
        await updateUser(editingUser.username, {
          username,
          role: form.role,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          avatar: normalizedAvatar || null,
          status: form.status,
        })
      } else {
        await addUser({
          username,
          password: form.password,
          role: form.role,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          avatar: normalizedAvatar || undefined,
        })
      }

      setPendingAvatarUrl(null)
      resetModalState()
    } catch {
      // Le store gere deja l'affichage d'erreur.
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    if (currentUser?.username.toLowerCase() === deleteTarget.username.toLowerCase()) {
      toast.error(t("common", "cantDeleteOwnAccount"))
      setDeleteTarget(null)
      return
    }

    try {
      await deleteUser(deleteTarget.username)
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
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("users", "totalUsers")}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {users.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("users", "activeUsers")}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {activeUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("users", "admins")}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {adminUsers}
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
            placeholder={t("users", "searchPlaceholder")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          {t("users", "newUser")}
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("users", "listTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredUsers.length} resultat{filteredUsers.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Droits
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Derniere connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const isCurrentUser =
                  currentUser?.username.toLowerCase() === user.username.toLowerCase()

                return (
                  <tr
                    key={user.username}
                    className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={user.username}
                          role={user.role}
                          avatar={user.avatar}
                        />
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
                                Vous
                              </span>
                            )}
                          </div>
                          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Cree le {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <UserRightsBadges rights={user.rights} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <div>{user.email || "-"}</div>
                        <div>{user.phone || "-"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        {!isCurrentUser && (
                          <>
                            <button
                              type="button"
                              onClick={() => setResetTarget(user)}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset MDP
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aucun utilisateur trouve.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <UserFormModal
          editingUser={editingUser}
          form={form}
          roles={roles}
          onClose={closeModal}
          onChange={updateForm}
          onPendingAvatarChange={setPendingAvatarUrl}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {"Supprimer l'utilisateur"}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Le compte <span className="font-semibold">{deleteTarget.username}</span>{" "}
              sera supprime definitivement.
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

      {resetTarget && (
        <ResetPasswordModal
          isOpen
          onClose={() => setResetTarget(null)}
          username={resetTarget.username}
          userName={resetTarget.username}
        />
      )}
    </div>
  )
}

