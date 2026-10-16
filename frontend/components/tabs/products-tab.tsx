/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useMemo, useRef, useCallback, useEffect, type DragEvent } from "react"
import { createPortal } from "react-dom"
import { useStore } from "@/lib/store-api"
import { type Product, type Step, type Sequence } from "@/lib/api"
import { useTranslation } from "@/lib/useTranslation"
import { usePermissions } from "@/lib/usePermissions"
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Package,
  Settings2, Layers, GripVertical, ArrowRight, Copy, Eye, Zap,
  Hash, Save, Search, Lock, Gauge
} from "lucide-react"
import { toast } from "sonner"

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
}

function validateParamType(type: string, value: string): boolean {
  if (!type || type === "") return true
  switch (type.toLowerCase()) {
    case 'string': return true
    case 'integer': return /^-?\d+$/.test(value)
    case 'float': return /^-?\d+(\.\d+)?$/.test(value)
    case 'boolean': return value.toLowerCase() === 'true' || value.toLowerCase() === 'false' || value === '0' || value === '1'
    case 'array': return true
    default: return true
  }
}

type ParamWithType = { id: string | number; name: string; type?: string; value?: string }

const PARAM_TYPES = ["", "String", "Integer", "Float", "Boolean", "Array"] as const

const T = {
  labelPre:  "rounded-md bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm",
  labelPost: "rounded-md bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm",
  labelSeq:  "rounded-md bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm",
  inputBase: "h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
  label:     "text-[10px] font-bold uppercase tracking-wider text-violet-600",
} as const

function toStepId(num: number): string {
  return `S${String(num).padStart(3, '0')}`
}

function convertToNumber(id: string | number): number {
  if (typeof id === 'number') return id
  const match = id.match(/\d+/)
  return match ? parseInt(match[0], 10) : NaN
}

// ─── Tooltip Portal ───────────────────────────────────────────────────────────
function StepTooltipPortal({ step, anchorRef, accentBg }: {
  step: any; anchorRef: React.RefObject<HTMLDivElement>; accentBg: string
}) {
  const { t } = useTranslation()
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    let raf: number
    function update() {
      if (!anchorRef.current) return
      const r = anchorRef.current.getBoundingClientRect()
      setStyle({
        position: "fixed", zIndex: 99999,
        left: r.left + r.width / 2,
        bottom: window.innerHeight - r.top + 10,
        transform: "translateX(-50%)", pointerEvents: "none",
      })
      raf = requestAnimationFrame(update)
    }
    update()
    return () => { cancelAnimationFrame(raf) }
  }, [anchorRef])

  if (typeof document === "undefined" || !step || style.left === undefined) return null

  return createPortal(
    <div style={style}>
      <div className="min-w-[200px] max-w-[300px] rounded-xl bg-slate-900 p-3 shadow-2xl ring-1 ring-white/10">
        <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accentBg}`}>
            <Settings2 className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-white">{step.name}</p>
        </div>
        {step.description && <p className="mb-2 text-xs leading-relaxed text-white/60">{step.description}</p>}
        {Array.isArray(step.params) && step.params.length > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="mb-1 grid grid-cols-3 gap-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
              <span>{t('fields', 'name')}</span><span>{t('fields', 'type')}</span><span className="text-right">{t('fields', 'value')}</span>
            </div>
            {step.params.map((p: any) => (
              <div key={p.id} className="grid grid-cols-3 gap-1 rounded-md bg-white/10 px-2 py-1 text-xs">
                <span className="text-white/70 truncate">{p.name}</span>
                <span className="text-center text-violet-300">{p.type || "—"}</span>
                <span className="text-right font-semibold text-white">{p.value}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs italic text-white/40">{t('sequences', 'noParam')}</p>}
      </div>
      <div className="flex justify-center">
        <div style={{ width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #0f172a" }} />
      </div>
    </div>,
    document.body
  )
}

// ─── Step Chip ────────────────────────────────────────────────────────────────
function StepChip({ step, index, accentBg, accentBorder, badgeBg, badgeText }: {
  step: any; index?: number; accentBg: string; accentBorder: string; badgeBg: string; badgeText: string
}) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className={`relative flex cursor-default select-none items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${accentBorder} ${badgeBg} ${badgeText} hover:brightness-95 hover:shadow-sm`}>
      {index !== undefined && (
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${accentBg} text-[9px] font-bold text-white`}>{index + 1}</span>
      )}
      <span>{step?.name ?? "—"}</span>
      {hovered && (
        <StepTooltipPortal step={step} anchorRef={ref as React.RefObject<HTMLDivElement>} accentBg={accentBg} />
      )}
    </div>
  )
}

// ─── Pipeline Flow ────────────────────────────────────────────────────────────
function PipelineConnector({ color = "violet" }: { color?: "violet" | "purple" }) {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-px ${color === "violet" ? "bg-violet-300" : "bg-purple-300"}`} />
        <ArrowRight className={`h-3.5 w-3.5 rotate-90 ${color === "violet" ? "text-violet-400" : "text-purple-400"}`} />
      </div>
    </div>
  )
}

function PipelineFlow({ preuutSteps, sequences, postuutSteps, steps }: {
  preuutSteps: any[]; sequences: any[]; postuutSteps: any[]; steps: any[]
}) {
  const { t } = useTranslation()
  const stepLabel = (count: number) => count !== 1 ? t('common', 'stepPlural') : t('common', 'stepSingular')
  return (
    <div className="flex flex-col gap-0">
      {/* PREUUT */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-violet-50/40 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={T.labelPre}>PREUUT</span>
          <span className="text-[10px] text-violet-400">{preuutSteps.length} {stepLabel(preuutSteps.length)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {preuutSteps.length > 0 ? preuutSteps.map((s, i) => (
            <div key={`pre-${s?.id}-${i}`} className="flex items-center gap-1">
              <StepChip step={s} accentBg="bg-violet-600" accentBorder="border-violet-200" badgeBg="bg-white" badgeText="text-violet-700" />
              {i < preuutSteps.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-violet-300" />}
            </div>
          )) : <span className="text-xs italic text-slate-400">{t('common', 'noStep')}</span>}
        </div>
      </div>

      <PipelineConnector color="violet" />

      {/* SEQUENCES */}
      {sequences.length > 0 ? (
        <div className="flex flex-col gap-0">
          {sequences.map((seq, si) => (
            <div key={`seq-${seq?.id}-${si}`} className="flex flex-col gap-0">
              <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-50/40 px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={T.labelSeq}>Séq. {si + 1}</span>
                  <span className="text-sm font-semibold text-purple-900">{seq?.name || `${t('common', 'sequence')} ${seq?.id}`}</span>
                  <span className="ml-auto flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    <Hash className="h-2.5 w-2.5" />{seq?.stepIds?.length || 0} {stepLabel(seq?.stepIds?.length || 0)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                  {seq?.stepIds?.length > 0 ? seq.stepIds.map((sid: number | string, j: number) => {
                    const stepIdNum = typeof sid === 'string' ? parseInt(sid, 10) : sid
                    const step = steps.find((s: any) => s.id === stepIdNum)
                    if (!step) {
                      return (
                        <div key={`${sid}-${j}`} className="flex items-center gap-1">
                          <div className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-xs font-medium text-purple-800 shadow-sm">
                            Step {stepIdNum}
                          </div>
                          {j < seq.stepIds.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-purple-300" />}
                        </div>
                      )
                    }
                    return (
                      <div key={`${sid}-${j}`} className="flex items-center gap-1">
                        <StepChip step={step} index={j} accentBg="bg-purple-600" accentBorder="border-purple-200" badgeBg="bg-white" badgeText="text-purple-800" />
                        {j < seq.stepIds.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-purple-300" />}
                      </div>
                    )
                  }) : <span className="text-xs italic text-slate-400">{t('common', 'noStep')}</span>}
                </div>
              </div>
              {si < sequences.length - 1 && <PipelineConnector color="purple" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/30 px-4 py-3 text-center text-xs italic text-slate-400">
          {t('products', 'noSequenceAssigned')}
        </div>
      )}

      <PipelineConnector color="violet" />

      {/* POSTUUT */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-violet-50/40 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={T.labelPost}>POSTUUT</span>
          <span className="text-[10px] text-violet-400">{postuutSteps.length} {stepLabel(postuutSteps.length)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {postuutSteps.length > 0 ? postuutSteps.map((s, i) => (
            <div key={`post-${s?.id}-${i}`} className="flex items-center gap-1">
              <StepChip step={s} accentBg="bg-violet-600" accentBorder="border-violet-200" badgeBg="bg-white" badgeText="text-violet-700" />
              {i < postuutSteps.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-violet-300" />}
            </div>
          )) : <span className="text-xs italic text-slate-400">{t('common', 'noStep')}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Draggable Zone Item ──────────────────────────────────────────────────────
function DraggableZoneItem({ id, label, index, zoneKey, onReorder, onRemove }: {
  id: string; label: string; index: number; zoneKey: string
  onReorder: (zoneKey: string, from: number, to: number) => void
  onRemove: (zoneKey: string, index: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  void id
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData("reorder-zone", zoneKey)
    e.dataTransfer.setData("reorder-index", String(index))
    e.dataTransfer.effectAllowed = "move"
  }
  function handleDragOver(e: DragEvent) {
    if (e.dataTransfer.types.includes("reorder-zone")) {
      e.preventDefault()
      ref.current?.classList.add("ring-2", "ring-violet-400", "scale-[1.02]")
    }
  }
  function handleDragLeave() { ref.current?.classList.remove("ring-2", "ring-violet-400", "scale-[1.02]") }
  function handleDrop(e: DragEvent) {
    ref.current?.classList.remove("ring-2", "ring-violet-400", "scale-[1.02]")
    const fromZone = e.dataTransfer.getData("reorder-zone")
    const fromIndex = parseInt(e.dataTransfer.getData("reorder-index"), 10)
    if (fromZone === zoneKey && !isNaN(fromIndex) && fromIndex !== index) {
      e.preventDefault(); onReorder(zoneKey, fromIndex, index)
    }
  }
  return (
    <div ref={ref} draggable onDragStart={handleDragStart} onDragOver={handleDragOver}
      onDragLeave={handleDragLeave} onDrop={handleDrop}
      className="mb-1.5 flex cursor-grab items-center gap-2 rounded-lg border border-violet-100 bg-white px-2.5 py-2 shadow-sm transition-all hover:border-violet-300 hover:shadow-md active:cursor-grabbing active:opacity-70">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-violet-300" />
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-[10px] font-bold text-white">{index + 1}</span>
      <span className="flex-1 truncate text-sm font-medium text-slate-900">{label}</span>
      <button onClick={() => onRemove(zoneKey, index)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ zoneKey, label, labelColor, borderColor, bgColor, items, onReorder, onRemove, onDropNew, acceptType, emptyText, canEdit }: {
  zoneKey: string; label: string; labelColor: string; borderColor: string; bgColor: string
  items: { id: string; label: string }[]
  onReorder: (zoneKey: string, from: number, to: number) => void
  onRemove: (zoneKey: string, index: number) => void
  onDropNew: (zoneKey: string, id: string) => void
  acceptType: string; emptyText: string; canEdit: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)
  function handleDragOver(e: DragEvent) {
    if (!canEdit) return
    if (e.dataTransfer.types.includes(acceptType)) { e.preventDefault(); setIsOver(true) }
    if (e.dataTransfer.types.includes("reorder-zone")) e.preventDefault()
  }
  function handleDragLeave(e: DragEvent) {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setIsOver(false)
  }
  function handleDrop(e: DragEvent) {
    if (!canEdit) return
    setIsOver(false)
    const newId = e.dataTransfer.getData(acceptType)
    if (newId) { e.preventDefault(); onDropNew(zoneKey, newId) }
  }
  return (
    <div className="flex flex-col gap-2">
      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>{label}</p>
      <div ref={ref} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`min-h-[10rem] rounded-xl border-2 border-dashed p-2.5 transition-all duration-200 ${borderColor} ${bgColor} ${isOver && canEdit ? "scale-[1.01] ring-2 ring-violet-400/60 border-violet-400 shadow-lg" : ""}`}>
        {items.map((item, i) => (
          <DraggableZoneItem key={`${item.id}-${i}`} id={item.id} label={item.label} index={i}
            zoneKey={zoneKey} onReorder={onReorder} onRemove={onRemove} />
        ))}
        {items.length === 0 && (
          <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
            <Plus className={`h-5 w-5 opacity-30 ${labelColor}`} />
            <p className="text-xs text-slate-400">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Source Item ──────────────────────────────────────────────────────────────
function SourceItem({ id, label, sub, dragType, canEdit }: {
  id: string; label: string; sub: string; dragType: string; canEdit: boolean
}) {
  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    if (!canEdit) return
    e.dataTransfer.setData(dragType, id)
    e.dataTransfer.effectAllowed = "copy"
  }
  return (
    <div draggable={canEdit} onDragStart={handleDragStart}
      className={`flex cursor-grab items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all hover:border-violet-300 hover:shadow-md hover:shadow-violet-50 active:cursor-grabbing active:scale-[0.98] ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}>
      <GripVertical className="h-3.5 w-3.5 text-violet-300" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-semibold text-slate-800">{label}</span>
        <span className="truncate text-xs text-slate-400">{sub}</span>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient }: {
  icon: React.ReactNode; label: string; value: number; gradient: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${gradient}`} />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${gradient} shadow-sm`}>{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Copy Product Modal ───────────────────────────────────────────────────────
function CopyProductModal({ products, steps, sequences, onClose, onCopy, canEdit }: {
  products: Product[]; steps: Step[]; sequences: Sequence[]
  onClose: () => void; onCopy: (product: Product) => void; canEdit: boolean
}) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>("")

  // ✅ FIX 1 : guard sur selectedId avant parseInt pour éviter NaN
  const selectedProduct = useMemo(() => {
    const normalizedSelectedId = convertToNumber(selectedId)
    if (Number.isNaN(normalizedSelectedId)) return undefined
    return products.find((p) => convertToNumber(p.id) === normalizedSelectedId)
  }, [products, selectedId])

  // ✅ FIX 2 : résolution robuste des steps/sequences avec convertToNumber
  const preuutSteps = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct.preuutStepIds || [])
      .map((id) => steps?.find((s) => s.id === convertToNumber(id)))
      .filter(Boolean)
  }, [selectedProduct, steps])

  const prodSequences = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct.sequenceIds || [])
      .map((id) => {
        const numId = typeof id === "string" ? convertToNumber(id) : id
        return sequences?.find((s) => s.id === numId)
      })
      .filter(Boolean)
  }, [selectedProduct, sequences])

  const postuutSteps = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct.postuutStepIds || [])
      .map((id) => steps?.find((s) => s.id === convertToNumber(id)))
      .filter(Boolean)
  }, [selectedProduct, steps])

  function handleCreate() {
    if (!selectedProduct) { toast.error(t('products','sourceProductRequired')); return }
    onCopy(selectedProduct)
    setSelectedId("")
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm">
              <Copy className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">{t('products','copyModalTitle')}</h2>
              <p className="text-[11px] text-slate-400">{t('products','copyModalSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className={T.label}>{t('products','sourceProduct')}</label>
            {/* ✅ FIX 3 : value forcé en String(p.id) pour cohérence avec l'état string */}
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            >
              <option value="">{t('products','choosePlaceholder')}</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct ? (
            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-purple-50/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-bold text-violet-800">{t('products','previewTitle')}</span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{t('fields','name')}</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{selectedProduct.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{t('fields','description')}</span>
                  <p className="mt-0.5 text-sm text-slate-600">{selectedProduct.description || "—"}</p>
                </div>
              </div>

              {(selectedProduct.params?.length || 0) > 0 && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                    {t('fields','params')} ({selectedProduct.params.length})
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(selectedProduct.params as ParamWithType[]).map((p) => (
                      <span key={p.id} className="rounded-md border border-violet-100 bg-white px-2.5 py-1 text-xs shadow-sm">
                        <span className="font-semibold text-violet-700">{p.name}</span>
                        {p.type && <span className="ml-1 text-violet-400">({p.type})</span>}
                        <span className="text-slate-400">:</span>
                        <span className="ml-1 text-slate-600">{p.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-violet-100 bg-white p-3 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-violet-500">
                  {t('products','pipelineTitle')}
                </p>
                <PipelineFlow
                  preuutSteps={preuutSteps}
                  sequences={prodSequences}
                  postuutSteps={postuutSteps}
                  steps={steps || []}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40">
              <Eye className="h-6 w-6 text-violet-200" />
              <p className="text-sm text-slate-400">{t('products','previewEmpty')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-violet-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all">
            {t('common','cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedProduct || !canEdit}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" /> {t('products','createCopyBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({ editProd, isCopy, onClose, onSave, canEdit }: {
  editProd: Product | null; isCopy?: boolean; onClose: () => void; onSave: (data: any) => void; canEdit: boolean
}) {
  const { steps, sequences } = useStore()
  const { t } = useTranslation()

  const [formName, setFormName] = useState(editProd?.name ?? "")
  const [formDesc, setFormDesc] = useState(editProd?.description ?? "")
  const [formParams, setFormParams] = useState<ParamWithType[]>(
    editProd
      ? (editProd.params || []).map((p: any) => ({
          ...p,
          id: p.id != null ? String(p.id) : genId("PP"),
          name: p.name || "",
          type: p.type || "",
          value: String(p.value ?? ""),
        }))
      : []
  )
  const [formPreuutIds, setFormPreuutIds] = useState<string[]>(editProd ? [...(editProd.preuutStepIds || [])] : [])
  const [formSeqIds, setFormSeqIds] = useState<string[]>(editProd ? [...(editProd.sequenceIds || [])].map(String) : [])
  const [formPostuutIds, setFormPostuutIds] = useState<string[]>(editProd ? [...(editProd.postuutStepIds || [])] : [])

  const setterMap = useMemo<
    Record<string, React.Dispatch<React.SetStateAction<any[]>>>
  >(
    () => ({
      preuut: setFormPreuutIds,
      sequences: setFormSeqIds,
      postuut: setFormPostuutIds,
    }),
    [],
  )

  const handleReorder = useCallback((zoneKey: string, from: number, to: number) => {
    if (!canEdit) return
    const setter = setterMap[zoneKey]
    if (!setter) return
    setter((prev) => { const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr })
  }, [canEdit, setterMap])

  const handleRemove = useCallback((zoneKey: string, index: number) => {
    if (!canEdit) return
    setterMap[zoneKey]?.((prev) => prev.filter((_, i) => i !== index))
  }, [canEdit, setterMap])

  const handleDropNew = useCallback((zoneKey: string, id: string) => {
    if (!canEdit) return
    setterMap[zoneKey]?.((prev) => [...prev, id])
  }, [canEdit, setterMap])

  const preuutItems  = formPreuutIds.map((id) => ({ id, label: steps?.find((s) => s.id === convertToNumber(id))?.name || id }))
  const seqItems     = formSeqIds.map((id) => ({ id, label: sequences?.find((s) => s.id === convertToNumber(id))?.name || id }))
  const postuutItems = formPostuutIds.map((id) => ({ id, label: steps?.find((s) => s.id === convertToNumber(id))?.name || id }))

  function isValueValid(param: { name: string; type?: string; value?: string }) {
    if (!param.type) return true
    return validateParamType(param.type, String(param.value ?? ''))
  }

  function handleSave() {
    if (!canEdit) return
    if (!formName.trim()) { toast.error(t('products','toastNameRequired')); return }
    const validParams = formParams
      .filter(p => p.name && p.name.trim() !== '')
      .map(p => {
        const { id, ...rest } = p; // supprime la propriété id
        void id
        return rest;
      });
    const invalidParam = validParams.find((p) => !isValueValid(p))
    if (invalidParam) { toast.error(`${t('products','errorInvalidParamType')} ${invalidParam.name}`); return }
    onSave({
      name: formName, description: formDesc, params: validParams,
      preuutStepIds: formPreuutIds, sequenceIds: formSeqIds, postuutStepIds: formPostuutIds,
    })
  }

  function updateParam(id: string | number, field: keyof Omit<ParamWithType, "id">, val: string) {
    if (!canEdit) return
    setFormParams((prev) =>
      prev.map((x) => (String(x.id) === String(id) ? { ...x, [field]: val } : x))
    )
  }

  const isEditing = editProd && !isCopy
  const modalTitle = isEditing ? t('products','modalEditTitle') : isCopy ? t('products','modalCopyTitle') : t('products','modalCreateTitle')
  const modalSubtitle = isEditing ? `${t('products','modalEditSubtitle')} ${editProd?.name}` : isCopy ? t('products','modalCopySubtitle') : t('products','modalCreateSubtitle')

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm">
              {isEditing ? <Pencil className="h-4 w-4 text-white" /> : isCopy ? <Copy className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
            </div>
            <div>
              <h2 className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">{modalTitle}</h2>
              <p className="text-[11px] text-slate-400">{modalSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={T.label}>{t('products','productNameLabel')}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder={t('products','productNamePlaceholder')} className={T.inputBase} disabled={!canEdit} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={T.label}>{t('fields','description')}</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                placeholder={t('products','descPlaceholder')} className={T.inputBase} disabled={!canEdit} />
            </div>
          </div>

          {/* Params */}
          <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className={T.label}>{t('products','productParams')}</label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setFormParams((prev) => [...prev, { id: genId("PP"), name: "", type: "", value: "" }])}
                  className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-all">
                  <Plus className="h-3 w-3" /> {t('products','addParam')}
                </button>
              )}
            </div>
            {formParams.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                <Settings2 className="h-8 w-8 text-violet-200" />
                <p className="text-sm text-slate-400">{t('products','noParams')}</p>
              </div>
            ) : (
              <>
                <div className="mb-2 grid gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  style={{ gridTemplateColumns: "1.5rem 1fr 1fr 1fr 2.5rem" }}>
                  <span /><span>{t('products', 'paramName')}</span><span>{t('products', 'paramType')}</span><span>{t('products', 'paramValue')}</span><span />
                </div>
                <div className="flex flex-col gap-2">
                  {formParams.map((p, idx) => {
                    const isValid = validateParamType(p.type || "", p.value || "")

                    return (
                      <div
                        key={p.id}
                        className={`grid items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${
                          isValid ? "border-violet-100 bg-white" : "border-red-200 bg-red-50"
                        }`}
                        style={{ gridTemplateColumns: "1.5rem 1fr 1fr 1fr 2.5rem" }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white">{idx + 1}</span>
                        <input type="text" value={p.name} onChange={(e) => updateParam(p.id, "name", e.target.value)}
                          placeholder={t('products', 'paramName')}
                          className="h-8 rounded-lg border border-violet-100 bg-violet-50/50 px-2 text-xs text-slate-800 outline-none focus:border-violet-300 focus:bg-white transition-all"
                          disabled={!canEdit} />
                        <select value={p.type || ""} onChange={(e) => updateParam(p.id, "type", e.target.value)}
                          className="h-8 rounded-lg border border-violet-100 bg-violet-50/50 px-2 text-xs text-slate-800 outline-none focus:border-violet-300 focus:bg-white transition-all"
                          disabled={!canEdit}>
                          {PARAM_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt === "" ? t('fields', 'type') : pt}
                            </option>
                          ))}
                        </select>
                        <input type="text" value={p.value || ""} onChange={(e) => updateParam(p.id, "value", e.target.value)}
                          placeholder={t('products', 'paramValue')}
                          className={`h-8 rounded-lg border px-2 text-xs text-slate-800 outline-none focus:bg-white transition-all ${
                            p.type && p.type !== "" && !isValid
                              ? "border-red-400 bg-red-50 focus:border-red-500"
                              : "border-violet-100 bg-violet-50/50 focus:border-violet-300"
                          }`}
                          disabled={!canEdit} />
                        {canEdit && (
                          <button type="button" onClick={() => setFormParams((prev) => prev.filter((x) => x.id !== p.id))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title={t('common', 'delete')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pipeline */}
          <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-slate-50 to-violet-50/30 p-4">
            <div className="mb-1 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-violet-900">{t('products', 'assignPipeline')}</h3>
            </div>
            <p className="mb-4 text-xs text-slate-400">{t('products', 'pipelineHint')}</p>
            <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-violet-100 bg-white px-3 py-2.5 shadow-sm">
              <span className={T.labelPre}>PREUUT</span>
              <ArrowRight className="h-3.5 w-3.5 text-violet-400" />
              <span className={T.labelSeq}>SÉQUENCES</span>
              <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
              <span className={T.labelPost}>POSTUUT</span>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">{t('products', 'availableSteps')}</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-violet-100 bg-white/70 p-2 shadow-inner">
                    {!steps || steps.length === 0
                      ? <p className="py-3 text-center text-xs italic text-slate-400">{t('products', 'noStepsAvail')}</p>
                      : steps.map((s) => <div key={s.id} className="mb-1.5"><SourceItem id={toStepId(s.id)} label={s.name} sub={`${s.params?.length || 0} param(s)`} dragType="drag-step" canEdit={canEdit} /></div>)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">{t('products', 'availableSeqs')}</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-purple-100 bg-white/70 p-2 shadow-inner">
                    {!sequences || sequences.length === 0
                      ? <p className="py-3 text-center text-xs italic text-slate-400">{t('products', 'noSeqsAvail')}</p>
                      : sequences.map((sq) => <div key={sq.id} className="mb-1.5"><SourceItem id={String(sq.id)} label={sq.name} sub={`${sq.stepIds?.length || 0} step(s)`} dragType="drag-sequence" canEdit={canEdit} /></div>)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <DropZone zoneKey="preuut" label={t('products', 'preuutZone')} labelColor="text-violet-600"
                  borderColor="border-violet-300" bgColor="bg-violet-50"
                  items={preuutItems} onReorder={handleReorder} onRemove={handleRemove} onDropNew={handleDropNew}
                  acceptType="drag-step" emptyText={t('products', 'dropStepsHere')} canEdit={canEdit} />
                <DropZone zoneKey="sequences" label={t('products', 'seqZone')} labelColor="text-purple-600"
                  borderColor="border-purple-300" bgColor="bg-purple-50"
                  items={seqItems} onReorder={handleReorder} onRemove={handleRemove} onDropNew={handleDropNew}
                  acceptType="drag-sequence" emptyText={t('products', 'dropSeqsHere')} canEdit={canEdit} />
                <DropZone zoneKey="postuut" label={t('products', 'postuutZone')} labelColor="text-violet-600"
                  borderColor="border-violet-300" bgColor="bg-violet-50"
                  items={postuutItems} onReorder={handleReorder} onRemove={handleRemove} onDropNew={handleDropNew}
                  acceptType="drag-step" emptyText={t('products', 'dropStepsHere')} canEdit={canEdit} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-violet-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all">
            {t('common','cancel')}
          </button>
          {canEdit && (
            <button onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all">
              <Save className="h-4 w-4" />
              {isEditing ? t('common','save') : isCopy ? t('products','confirmCopyBtn') : t('products','createBtn')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Expanded Product Detail ──────────────────────────────────────────────────
function ExpandedProductDetail({
  prod,
}: {
  prod: Product
}) {
  const { steps, sequences } = useStore()
  const { t } = useTranslation()

  const preuutSteps = useMemo(() =>
    (prod.preuutStepIds || [])
      .map((id: string | number) => steps?.find((s) => s.id === convertToNumber(id)))
      .filter(Boolean),
    [prod.preuutStepIds, steps]
  )

  const prodSequences = useMemo(() =>
    (prod.sequenceIds || [])
      .map((id: string | number) => {
        const numId = typeof id === "string" ? convertToNumber(id) : id
        return sequences?.find((s) => s.id === numId)
      })
      .filter(Boolean),
    [prod.sequenceIds, sequences]
  )

  const postuutSteps = useMemo(() =>
    (prod.postuutStepIds || [])
      .map((id: string | number) => steps?.find((s) => s.id === convertToNumber(id)))
      .filter(Boolean),
    [prod.postuutStepIds, steps]
  )

  return (
    <div className="flex flex-col gap-4">
      {(prod.params?.length || 0) > 0 && (
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">{t('products','productParams')}</span>
          <div className="mt-2 overflow-hidden rounded-xl border border-violet-100">
            <div className="grid grid-cols-3 gap-2 border-b border-violet-50 bg-violet-50/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{t('fields','name')}</span><span>{t('fields','type')}</span><span>{t('fields','value')}</span>
            </div>
            {(prod.params as ParamWithType[]).map((p) => {
              const paramKey = String(p.id)
              return (
                <div key={paramKey} className="grid grid-cols-3 gap-2 border-b border-slate-50 px-3 py-2 text-sm last:border-0">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <span className="text-violet-500">{p.type || <span className="italic text-slate-300">—</span>}</span>
                  <span className="font-semibold text-violet-700">{p.value || "—"}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">{t('products','pipelineTitle')}</span>
        </div>
        <PipelineFlow
          preuutSteps={preuutSteps}
          sequences={prodSequences}
          postuutSteps={postuutSteps}
          steps={steps || []}
        />
      </div>
    </div>
  )
}

// ─── Products Tab (main) ──────────────────────────────────────────────────────
export function ProductsTab({ globalSearch }: { globalSearch?: string }) {
  const { steps, sequences, products, addProduct, updateProduct, deleteProduct } = useStore()
  const { canEditProduct, canManageUsers, canView } = usePermissions()
  const { t } = useTranslation()
  const canReadProducts = canView() || canEditProduct()

  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editProd, setEditProd] = useState<Product | null>(null)
  const [isCopy, setIsCopy] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  if (!canReadProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Lock className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-lg font-semibold text-slate-600">{t('common', 'accessDenied')}</p>
        <p className="text-sm text-slate-400">{t('common', 'viewForbidden')}</p>
      </div>
    )
  }

  const combinedSearch = ((globalSearch ?? "") + " " + search).trim().toLowerCase()
  const filteredProducts = Array.isArray(products)
    ? products.filter((p) =>
        !combinedSearch ||
        String(p.id).toLowerCase().includes(combinedSearch) ||
        p.name?.toLowerCase().includes(combinedSearch) ||
        p.description?.toLowerCase().includes(combinedSearch),
      )
    : []

  const totalParams = Array.isArray(products) ? products.reduce((acc, p) => acc + (p.params?.length || 0), 0) : 0
  const totalSeqs   = Array.isArray(products) ? products.reduce((acc, p) => acc + (p.sequenceIds?.length || 0), 0) : 0
  const totalPreuut = Array.isArray(products) ? products.reduce((acc, p) => acc + (p.preuutStepIds?.length || 0), 0) : 0

  function openCreate() {
    if (!canEditProduct()) return
    setEditProd(null); setIsCopy(false); setShowModal(true)
  }
  function openEdit(p: Product) {
    if (!canEditProduct()) return
    setEditProd(p); setIsCopy(false); setShowModal(true)
  }

  function handleCopyProduct(source: Product) {
    if (!canEditProduct()) return
    const copy = {
      id: 0,
      name: `${source.name} (Copie)`,
      description: source.description,
      params: (source.params || []).map((p, index) => ({ ...p, id: String(p.id ?? `${Date.now()}-${index}`) })),
      preuutStepIds: [...(source.preuutStepIds || [])].map(String),
      sequenceIds:   [...(source.sequenceIds || [])].map(String),
      postuutStepIds: [...(source.postuutStepIds || [])].map(String),
      createdAt: source.createdAt || "",
      createdBy: source.createdBy || "",
    } as Product
    setEditProd(copy); setIsCopy(true); setShowModal(true)
  }

  async function handleSave(data: any) {
    if (!canEditProduct()) return
    const normalizeIds = (arr: any[]) =>
      (arr || [])
        .map((id: string | number) => {
          const normalizedId = convertToNumber(id)
          return Number.isNaN(normalizedId) ? null : String(normalizedId)
        })
        .filter((id: string | null): id is string => id !== null)

    const productData = {
      name: data.name, description: data.description, params: data.params,
      preuutStepIds:  normalizeIds(data.preuutStepIds),
      sequenceIds:    normalizeIds(data.sequenceIds),
      postuutStepIds: normalizeIds(data.postuutStepIds),
    }

    try {
      if (editProd && editProd.id && !isCopy) {
        await updateProduct(convertToNumber(editProd.id), productData)
      } else {
        await addProduct(productData)
      }
      setShowModal(false)
      setEditProd(null)
      setIsCopy(false)
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    }
  }

  async function handleDelete(id: number) {
    if (!canEditProduct() || isDeleting === id) return
    setIsDeleting(id)
    try {
      await deleteProduct(id)
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    } finally {
      setDeleteConfirm(null)
      setIsDeleting(null)
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
      } else {
        n.add(id)
      }
      return n
    })
  }

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={<Package className="h-5 w-5 text-white" />} label={t('products', 'totalProducts')}
          value={products?.length || 0} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard icon={<Settings2 className="h-5 w-5 text-white" />} label={t('products', 'totalParams')}
          value={totalParams} gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
        <StatCard icon={<Layers className="h-5 w-5 text-white" />} label={t('products', 'assignedSeqs')}
          value={totalSeqs} gradient="bg-gradient-to-br from-sky-500 to-blue-600" />
        <StatCard icon={<Zap className="h-5 w-5 text-white" />} label={t('products', 'preuutSteps')}
          value={totalPreuut} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 420 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('products', 'searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canEditProduct() && (
            <>
              <button onClick={() => setShowCopyModal(true)}
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 hover:border-violet-300 transition-all">
                <Copy className="h-4 w-4" /> {t('products', 'copyProduct')}
              </button>
              <button onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all">
                <Plus className="h-4 w-4" /> {t('products', 'newProduct')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">{t('products', 'listTitle')}</span>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {filteredProducts.length} {filteredProducts.length !== 1 ? t('common', 'results_plural') : t('common', 'results')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-10 px-3 py-3" />
                {[t('fields', 'id'), t('fields', 'name'), t('fields', 'description'), t('products', 'colParams'), t('products', 'colSeqs'), t('fields', 'date'), t('products', 'user')].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{h}</th>
                ))}
                {canEditProduct() && (
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{t('fields', 'actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod) => (
                <React.Fragment key={prod.id}>
                  <tr className={`group border-b border-slate-50 transition-colors duration-100 last:border-0 hover:bg-violet-50/40 ${expanded.has(prod.id) ? "bg-violet-50/30" : ""}`}>
                    <td className="px-3 py-4">
                      <button onClick={() => toggleExpand(prod.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-violet-400 transition-all hover:bg-violet-100 hover:text-violet-700">
                        {expanded.has(prod.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-600">{prod.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                          <Package className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className="font-semibold text-slate-900">{prod.name}</span>
                      </div>
                    </td>
                    <td className="max-w-[160px] px-5 py-4 text-sm text-slate-500 truncate">{prod.description || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                          <Settings2 className="h-3 w-3" />{prod.params?.length || 0}
                        </span>
                        {canManageUsers() && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("navigate", {
                                    detail: {
                                      tab: "product-step-values",
                                      productId: prod.id,
                                    },
                                  }),
                                )
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-100 hover:shadow-sm"
                              title={t('products', 'manageParamValues')}
                              aria-label={t('products', 'manageParamValues')}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              {t('products', 'paramValuesShort')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("navigate", {
                                    detail: {
                                      tab: "product-limit-values",
                                      productId: prod.id,
                                    },
                                  }),
                                )
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm"
                              title={t('products', 'manageLimitValues')}
                              aria-label={t('products', 'manageLimitValues')}
                            >
                              <Gauge className="h-3.5 w-3.5" />
                              {t('products', 'limitValuesShort')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                        <Layers className="h-3 w-3" />{prod.sequenceIds?.length || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{prod.createdAt}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{prod.createdBy}</td>
                    {canEditProduct() && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEdit(prod)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(prod.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {expanded.has(prod.id) && (
                    <tr className="border-b border-violet-50 bg-gradient-to-r from-violet-50/60 to-purple-50/40">
                      <td colSpan={canEditProduct() ? 9 : 8} className="p-0">
                        <div className="border-l-4 border-violet-400 px-6 py-4">
                          <ExpandedProductDetail
                            prod={prod}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canEditProduct() ? 9 : 8} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-violet-200" />
                      <p className="text-sm text-slate-400">{t('products', 'emptyState')}</p>
                      <p className="text-xs text-slate-300">{t('products', 'emptyStateHint')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showModal && canEditProduct() && (
        <ProductModal
          editProd={editProd}
          isCopy={isCopy}
          onClose={() => { setShowModal(false); setEditProd(null); setIsCopy(false) }}
          onSave={handleSave}
          canEdit={canEditProduct()}
        />
      )}

      {showCopyModal && canEditProduct() && (
        <CopyProductModal
          products={products}
          steps={steps}
          sequences={sequences}
          onClose={() => setShowCopyModal(false)}
          onCopy={handleCopyProduct}
          canEdit={canEditProduct()}
        />
      )}

      {deleteConfirm && canEditProduct() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
              <Trash2 className="h-5 w-5 text-slate-600" />
            </div>
            <h3 className="mb-1 text-base font-bold text-slate-900">{t('products', 'deleteTitle')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('products', 'deleteMessage')}</p>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setIsDeleting(null) }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">{t('actions', 'cancel')}</button>
              <button onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)} disabled={isDeleting === deleteConfirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {t('actions', 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
