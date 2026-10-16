"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Trash2, Upload } from "lucide-react"
import { buildAssetUrl, uploadsApi } from "@/lib/api"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"

interface AvatarUploaderProps {
  username: string
  currentAvatar?: string | null
  onAvatarChange: (avatarUrl: string | null) => void
  onPendingAvatarChange?: (avatarUrl: string | null) => void
  size?: "sm" | "md" | "lg"
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_HINT =
  "image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/x-icon,image/vnd.microsoft.icon,image/avif,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.ico,.avif"

const sizes = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
}

const textSizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
}

function getInitials(username: string): string {
  const trimmedUsername = username.trim()

  if (!trimmedUsername) {
    return "?"
  }

  return trimmedUsername.slice(0, 2).toUpperCase()
}

export function AvatarUploader({
  username,
  currentAvatar,
  onAvatarChange,
  onPendingAvatarChange,
  size = "md",
}: AvatarUploaderProps) {
  const toast = useToast()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(
    buildAssetUrl(currentAvatar) || null,
  )
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setPreview(buildAssetUrl(currentAvatar) || null)
  }, [currentAvatar])

  async function deleteTemporaryAvatar(avatarUrl: string) {
    try {
      await uploadsApi.deleteAvatar(avatarUrl)
    } catch (error) {
      console.error("Erreur suppression avatar temporaire:", error)
      toast.warning(t("common", "cleanupIncomplete"), {
        description: t("common", "tempCleanupLater"),
      })
    }
  }

  function openFileDialog() {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  function handleDrag(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true)
      return
    }

    if (event.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (file) {
      void processFile(file)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]

    if (!file) {
      return
    }

    void processFile(file)
  }

  async function processFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("common", "fileTooLarge"), {
        description: t("common", "imageMaxSize"),
      })
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    try {
      await uploadAvatar(file)
    } finally {
      URL.revokeObjectURL(localPreview)
    }
  }

  async function uploadAvatar(file: File) {
    setIsUploading(true)

    try {
      const previousTempAvatar = tempAvatarUrl
      const data = await uploadsApi.uploadAvatar(file)

      if (previousTempAvatar && previousTempAvatar !== data.avatarUrl) {
        await deleteTemporaryAvatar(previousTempAvatar)
      }

      setTempAvatarUrl(data.avatarUrl)
      setPreview(buildAssetUrl(data.avatarUrl))
      onPendingAvatarChange?.(data.avatarUrl)
      onAvatarChange(data.avatarUrl)

      toast.success(t("common", "avatarUploaded"), {
        description: t("common", "saveFormToConfirm"),
      })
    } catch (error) {
      console.error("Erreur upload avatar:", error)
      setPreview(buildAssetUrl(currentAvatar) || null)
      toast.error(t("common", "uploadError"), {
        description:
          error instanceof Error ? error.message : t("common", "retry"),
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemoveAvatar() {
    const pendingAvatarToDelete = tempAvatarUrl

    setPreview(null)
    setTempAvatarUrl(null)
    onPendingAvatarChange?.(null)
    onAvatarChange(null)

    if (pendingAvatarToDelete) {
      await deleteTemporaryAvatar(pendingAvatarToDelete)
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-4">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`group relative shrink-0 transition-transform ${
            dragActive ? "scale-105" : ""
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={username}
              className={`${sizes[size]} rounded-full border-4 object-cover shadow-sm ${
                dragActive
                  ? "border-violet-400"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            />
          ) : (
            <div
              className={`${sizes[size]} flex items-center justify-center rounded-full border-4 bg-gradient-to-br from-violet-500 to-sky-600 text-white shadow-sm ${
                dragActive
                  ? "border-violet-400"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className={`${textSizes[size]} font-bold`}>
                {getInitials(username)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={openFileDialog}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-80"
            aria-label="Choisir un avatar"
          >
            {isUploading ? (
              <span className="h-6 w-6 rounded-full border-2 border-white/90 border-t-transparent animate-spin" />
            ) : (
              <Camera className="h-5 w-5 opacity-0 transition group-hover:opacity-100" />
            )}
          </button>

          {dragActive && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white shadow-lg">
              Deposez l&apos;image
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {preview ? "Avatar pret" : "Aucun avatar"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            JPG, PNG, GIF, WEBP, BMP, TIFF, ICO ou AVIF. Taille max 5 MB.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFileDialog}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" />
              {preview ? "Changer" : "Ajouter"}
            </button>

            {preview && (
              <button
                type="button"
                onClick={() => {
                  void handleRemoveAvatar()
                }}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_HINT}
        onChange={handleFileSelection}
        className="hidden"
      />
    </div>
  )
}
