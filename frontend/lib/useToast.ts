"use client"

import type { ReactNode } from "react"
import { toast } from "sonner"

interface ToastOptions {
  duration?: number
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center"
  description?: string
}

export const useToast = () => {
  const buildOptions = (options?: ToastOptions) => ({
    duration: options?.duration ?? 4000,
    position: options?.position ?? "top-right",
    description: options?.description,
  })

  const show = (
    message: string,
    type: "success" | "error" | "warning" | "info",
    options?: ToastOptions,
  ) => {
    const toastOptions = buildOptions(options)

    switch (type) {
      case "success":
        toast.success(message, toastOptions)
        break
      case "error":
        toast.error(message, toastOptions)
        break
      case "warning":
        toast.warning(message, toastOptions)
        break
      default:
        toast.info(message, toastOptions)
        break
    }
  }

  const success = (message: string, options?: ToastOptions) =>
    show(message, "success", options)
  const error = (message: string, options?: ToastOptions) =>
    show(message, "error", options)
  const warning = (message: string, options?: ToastOptions) =>
    show(message, "warning", options)
  const info = (message: string, options?: ToastOptions) =>
    show(message, "info", options)

  const promise = <T,>(
    promise: Promise<T>,
    {
      loading,
      success: successMsg,
      error: errorMsg,
    }: {
      loading: string
      success: string
      error: string
    },
  ) => {
    toast.promise(promise, {
      loading,
      success: successMsg,
      error: errorMsg,
    })
  }

  const custom = (content: ReactNode, options?: ToastOptions) => {
    toast(content, buildOptions(options))
  }

  return {
    success,
    error,
    warning,
    info,
    promise,
    custom,
    dismiss: toast.dismiss,
  }
}
