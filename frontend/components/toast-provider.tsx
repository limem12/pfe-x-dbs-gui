"use client"

import { Toaster } from "sonner"

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand={false}
      duration={4000}
      theme="system"
      closeButton
    />
  )
}
