"use client";

import { useState } from "react";
import { Flag, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { ExecutionMode } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { useStore } from "@/lib/store-api";
import { useTranslation } from "@/lib/useTranslation";

const emptyForm = { name: "", description: "" };

export default function ExecutionModesTab() {
  const {
    executionModes,
    addExecutionMode,
    updateExecutionMode,
    deleteExecutionMode,
  } = useStore();
  const { canManageUsers } = usePermissions();
  const { t } = useTranslation();
  const [editing, setEditing] = useState<ExecutionMode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ExecutionMode | null>(null);

  if (!canManageUsers()) {
    return <Unauthorized />;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
  }

  function openEdit(mode: ExecutionMode) {
    setEditing(mode);
    setForm({ name: mode.name, description: mode.description || "" });
  }

  async function saveMode() {
    const name = form.name.trim().toUpperCase();

    if (!name) {
      toast.error(t("executionModePage", "nameRequired"));
      return;
    }

    try {
      if (editing) {
        await updateExecutionMode(editing.id, {
          name,
          description: form.description.trim(),
        });
      } else {
        await addExecutionMode({
          name,
          description: form.description.trim(),
        });
      }

      openCreate();
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteExecutionMode(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              {editing ? (
                <Pencil className="h-4 w-4 text-white" />
              ) : (
                <Plus className="h-4 w-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                {editing ? t("executionModePage", "editMode") : t("executionModePage", "newMode")}
              </h3>
              <p className="text-xs text-slate-400">{t("executionModePage", "subtitle")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Field label={t("fields", "name")}>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value.toUpperCase(),
                  }))
                }
                className={inputClass}
                placeholder="PROD"
              />
            </Field>
            <Field label={t("fields", "description")}>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                className={`${inputClass} h-auto resize-none py-2`}
                placeholder={t("executionModePage", "descriptionPlaceholder")}
              />
            </Field>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => void saveMode()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4" />
                {editing ? t("actions", "save") : t("actions", "create")}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {executionModes.map((mode) => (
            <div
              key={mode.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                    <Flag className="h-4 w-4 text-violet-700" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-violet-700">
                      {mode.name}
                    </p>
                    <p className="text-xs text-slate-400">ID {mode.id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(mode)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(mode)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="min-h-12 text-sm text-slate-600">
                {mode.description || t("executionModePage", "noDescription")}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {t("executionModePage", "createdOn").replace("{date}", formatDate(mode.created_at))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={t("executionModePage", "deleteTitle")}
          message={t("executionModePage", "deleteMessage").replace("{name}", deleteTarget.name)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <Trash2 className="mb-4 h-10 w-10 rounded-full bg-red-50 p-2 text-red-500" />
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("actions", "cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-2 text-sm font-semibold text-white"
          >
            {t("actions", "delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Unauthorized() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
      <Lock className="mb-4 h-14 w-14 text-slate-300" />
      <p className="text-lg font-semibold text-slate-700">{t("common", "accessDenied")}</p>
      <p className="text-sm text-slate-400">{t("common", "manageUsersRequired")}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

const inputClass =
  "h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
