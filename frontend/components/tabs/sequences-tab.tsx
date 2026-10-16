"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import type { Sequence, Step } from "@/lib/api"
import { useStore } from "@/lib/store-api"
import { useTheme } from "@/components/theme-provider"
import { useTranslation } from "@/lib/useTranslation"
import { usePermissions } from "@/lib/usePermissions"
import {
  Plus, Pencil, Trash2, Search, ArrowDown, ArrowUp, GripVertical,
  GitBranch, Layers, Play,
  ChevronDown, ChevronRight, X, Save, Zap, Hash,
  Settings2, LayoutGrid, Table2, Lock
} from "lucide-react"
import { toast } from "sonner"

function StepChipTooltip({ step, anchorRef, t }: {
  step: Step
  anchorRef: React.RefObject<HTMLDivElement>
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [style, setStyle] = useState<React.CSSProperties>({})

  React.useEffect(() => {
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

  if (typeof document === "undefined" || style.left === undefined) return null

  return createPortal(
    <div style={style}>
      <div className="min-w-[180px] max-w-[260px] rounded-xl bg-slate-900 p-3 shadow-2xl ring-1 ring-white/10">
        <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-600">
            <Settings2 className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-white">{step.name}</p>
        </div>
        {step.description && <p className="mb-2 text-xs text-white/60">{step.description}</p>}
        {step.params?.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {t('fields', 'params')}
            </p>
            {step.params.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-2 py-1">
                <span className="text-xs text-white/80">{p.name}</span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold text-white">{p.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-white/40">{t('sequences', 'noParam')}</p>
        )}
      </div>
      <div className="flex justify-center">
        <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #0f172a" }} />
      </div>
    </div>,
    document.body
  )
}

function StepChip({ step, index }: {
  step: Step; index: number
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 pl-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-orange-400" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-extrabold text-white shadow-sm ring-4 ring-violet-50">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800" title={step.name}>{step.name}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                ID {step.id}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {step.description || t('sequences', 'noDescription')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
          <Settings2 className="h-3.5 w-3.5" />
          {step.params?.length || 0} {t('fields', 'params')}
        </div>
      </div>
      {hovered && (
        <StepChipTooltip step={step} anchorRef={ref as React.RefObject<HTMLDivElement>} t={t} />
      )}
    </div>
  )
}

function PipelineConnector({ isLast }: { isLast: boolean }) {
  if (isLast) return null

  return (
    <div className="flex items-center gap-3 py-1 pl-1 sm:pl-2" aria-hidden="true">
      <div className="flex w-12 shrink-0 justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-600 shadow-sm">
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-violet-200 via-slate-200 to-transparent" />
    </div>
  )
}

function PipelineView({ sequence, viewMode }: {
  sequence: Sequence
  viewMode: "chips" | "table"
}) {
  const { steps } = useStore()
  const { t } = useTranslation()
  const [pipelineSearch, setPipelineSearch] = useState("")

  const stepIdsAsNumbers = (sequence.stepIds || []).map((id: string | number) =>
    typeof id === 'string' ? parseInt(id, 10) : id
  )

  const associatedSteps = stepIdsAsNumbers.map((sid: number, index) => {
    const step = steps?.find((s) => s.id === sid)

    return step ? { step, originalIndex: index } : null
  }).filter(Boolean) as Array<{ step: Step; originalIndex: number }>

  const normalizedSearch = pipelineSearch.trim().toLowerCase()
  const visibleSteps = associatedSteps.filter(({ step, originalIndex }) => {
    if (!normalizedSearch) return true

    return (
      String(step.id).includes(normalizedSearch) ||
      String(originalIndex + 1).includes(normalizedSearch) ||
      step.name?.toLowerCase().includes(normalizedSearch) ||
      step.description?.toLowerCase().includes(normalizedSearch)
    )
  })

  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
            <Play className="h-3.5 w-3.5" />
            {visibleSteps.length} / {associatedSteps.length} {t('nav', 'steps')}
          </span>
          <span className="text-xs text-slate-400">
            {t('sequences', 'pipelineHelp')}
          </span>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={pipelineSearch}
            onChange={(event) => setPipelineSearch(event.target.value)}
            placeholder={t('sequences', 'pipelineSearchPlaceholder')}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      {visibleSteps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white/70 py-12 text-center text-sm text-slate-400">
          {t('sequences', 'noPipelineMatch')}
        </div>
      ) : null}

      {visibleSteps.length > 0 && viewMode === "chips" ? (
        <div className="max-h-[34rem] overflow-y-auto rounded-2xl border border-violet-100 bg-gradient-to-b from-white to-violet-50/40 p-3 sm:p-4">
          <div className="flex flex-col">
            {visibleSteps.map(({ step, originalIndex }, visibleIndex) => (
              <React.Fragment key={`${step.id}-${originalIndex}`}>
                <StepChip step={step} index={originalIndex} />
                <PipelineConnector isLast={visibleIndex === visibleSteps.length - 1} />
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}

      {visibleSteps.length > 0 && viewMode === "table" ? (
        <div className="max-h-[30rem] overflow-y-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[680px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-slate-50">
                {["#", "ID", t('fields', 'name'), t('fields', 'description'), t('fields', 'params')].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSteps.map(({ step, originalIndex }) => (
                <tr key={`${step.id}-${originalIndex}`} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/30">
                  <td className="px-4 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
                      {originalIndex + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-violet-600">{step.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{step.name}</p>
                  </td>
                  <td className="max-w-[24rem] px-4 py-3 text-xs leading-relaxed text-slate-500">
                    <p className="line-clamp-2">{step.description || t('sequences', 'noDescription')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-600">
                      <Settings2 className="h-3 w-3" />
                      {step.params?.length || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

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

function normalizeStepIds(stepIds: Array<string | number>): number[] {
  const normalized: number[] = []

  for (const rawId of stepIds) {
    const stepId = Number(rawId)

    if (Number.isFinite(stepId) && !normalized.includes(stepId)) {
      normalized.push(stepId)
    }
  }

  return normalized
}

export default function SequencesTab() {
  const { sequences, steps, addSequence, updateSequence, deleteSequence } = useStore()
  const { canEditSequence, canView } = usePermissions()
  const { t } = useTranslation()
  useTheme()

  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingSeq, setEditingSeq] = useState<Sequence | null>(null)
  const [expandedSeqs, setExpandedSeqs] = useState<Set<number>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [pipelineView, setPipelineView] = useState<Record<number, "chips" | "table">>({})
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formStepIds, setFormStepIds] = useState<number[]>([])
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null)

  if (!(canView() || canEditSequence())) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Lock className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-lg font-semibold text-slate-600">{t('common', 'accessDenied')}</p>
        <p className="text-sm text-slate-400">{t('common', 'viewForbidden')}</p>
      </div>
    )
  }

  const filteredSeqs = Array.isArray(sequences) ? sequences.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      String(s.id).toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    )
  }) : []

  function openModal(seq?: Sequence) {
    if (!canEditSequence()) return
    if (seq) {
      setEditingSeq(seq)
      setFormName(seq.name)
      setFormDescription(seq.description || "")
      setFormStepIds(normalizeStepIds(seq.stepIds || []))
    } else {
      setEditingSeq(null)
      setFormName("")
      setFormDescription("")
      setFormStepIds([])
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false); setEditingSeq(null)
    setFormName(""); setFormDescription(""); setFormStepIds([])
    setDraggedStepIndex(null)
  }

  async function handleSave() {
    if (!canEditSequence()) return
    if (!formName.trim()) { toast.error(t('sequences', 'toastNameRequired')); return }
    const normalizedStepIds = normalizeStepIds(formStepIds).map(String)
    try {
      if (editingSeq) {
        await updateSequence(editingSeq.id, { name: formName, description: formDescription, stepIds: normalizedStepIds })
      } else {
        await addSequence({ name: formName, description: formDescription, stepIds: normalizedStepIds })
      }
      closeModal()
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    }
  }

  async function handleDelete(id: number) {
    if (!canEditSequence() || isDeleting === id) return
    setIsDeleting(id)
    try {
      await deleteSequence(id)
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    } finally {
      setDeleteConfirm(null)
      setIsDeleting(null)
    }
  }

  function reorderStep(sourceIndex: number, targetIndex: number) {
    if (!canEditSequence()) return
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= formStepIds.length ||
      targetIndex >= formStepIds.length
    ) {
      return
    }

    setFormStepIds((current) => {
      const next = [...current]
      const [item] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  function moveStep(index: number, direction: -1 | 1) {
    reorderStep(index, index + direction)
  }

  function handleStepDragStart(event: React.DragEvent<HTMLDivElement>, index: number) {
    setDraggedStepIndex(index)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", String(index))
  }

  function handleStepDrop(event: React.DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault()
    const sourceIndex = draggedStepIndex ?? Number(event.dataTransfer.getData("text/plain"))

    if (Number.isFinite(sourceIndex)) {
      reorderStep(sourceIndex, targetIndex)
    }

    setDraggedStepIndex(null)
  }

  function toggleStep(id: number) {
    if (!canEditSequence()) return
    setFormStepIds((prev) => {
      const normalizedId = Number(id)

      if (!Number.isFinite(normalizedId)) {
        return prev
      }

      return prev.includes(normalizedId)
        ? prev.filter((x) => x !== normalizedId)
        : [...prev, normalizedId]
    })
  }

  function toggleExpand(id: number) {
    setExpandedSeqs((prev) => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
      } else {
        n.add(id)
      }
      return n
    })
  }

  const totalStepsAssigned = Array.isArray(sequences)
    ? sequences.reduce((a, s) => a + (s.stepIds?.length || 0), 0)
    : 0
  const selectedStepIds = new Set(formStepIds)

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<GitBranch className="h-5 w-5 text-white" />} label={t('sequences', 'totalSeqs')} value={sequences?.length || 0} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard icon={<Play className="h-5 w-5 text-white" />} label={t('sequences', 'withSteps')} value={Array.isArray(sequences) ? sequences.filter(s => (s.stepIds?.length || 0) > 0).length : 0} gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
        <StatCard icon={<Hash className="h-5 w-5 text-white" />} label={t('sequences', 'assignedSteps')} value={totalStepsAssigned} gradient="bg-gradient-to-br from-sky-500 to-blue-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-col gap-1" style={{ maxWidth: 480 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t('sequences', 'searchPlaceholder')} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <p className="ml-1 text-[11px] text-slate-400">
            {t('common', 'filterHint')}{" "}
            <span className="font-semibold text-violet-500">ID</span> ·{" "}
            <span className="font-semibold text-violet-500">{t('fields', 'name')}</span> ·{" "}
            <span className="font-semibold text-violet-500">{t('fields', 'description')}</span>
          </p>
        </div>
        {canEditSequence() && (
          <button onClick={() => openModal()}
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700 active:scale-95">
            <Plus className="h-4 w-4" /> {t('sequences', 'newSequence')}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">{t('sequences', 'listTitle')}</span>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {filteredSeqs.length} {filteredSeqs.length !== 1 ? t('common', 'results_plural') : t('common', 'results')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-10 px-3 py-3" />
                {[t('fields', 'id'), t('fields', 'name'), t('fields', 'description'), t('nav', 'steps'), t('fields', 'date'), t('fields', 'createdBy')].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{h}</th>
                ))}
                {canEditSequence() && (
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{t('fields', 'actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredSeqs.map((seq) => {
                const isExpanded = expandedSeqs.has(seq.id)
                const viewMode = pipelineView[seq.id] ?? "chips"

                return (
                  <React.Fragment key={seq.id}>
                    <tr className={`group border-b border-slate-50 transition-colors duration-100 last:border-0 hover:bg-violet-50/40 ${isExpanded ? "bg-violet-50/30" : ""}`}>
                      <td className="px-3 py-4">
                        <button onClick={() => toggleExpand(seq.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-violet-400 transition-all hover:bg-violet-100 hover:text-violet-700">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-600">{seq.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                            <GitBranch className="h-4 w-4 text-violet-600" />
                          </div>
                          <span className="font-semibold text-slate-900">{seq.name}</span>
                        </div>
                      </td>
                      <td className="max-w-[180px] px-5 py-4 text-sm text-slate-500 truncate">{seq.description || "—"}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleExpand(seq.id)} className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                            <Play className="h-3 w-3" />{seq.stepIds?.length || 0}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">{seq.createdAt}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{seq.createdBy}</td>
                      {canEditSequence() && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <button onClick={() => openModal(seq)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setDeleteConfirm(seq.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-violet-50 bg-gradient-to-r from-violet-50/60 to-purple-50/40">
                        <td colSpan={canEditSequence() ? 8 : 7} className="p-0 overflow-visible">
                          <div className="border-l-4 border-violet-400 px-6 py-4 overflow-visible">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-500">
                                <Play className="h-3 w-3" /> {t('sequences', 'pipelineTitle')}
                              </p>
                              <div className="flex items-center gap-1 rounded-xl border border-violet-100 bg-white p-1 shadow-sm">
                                <button
                                  onClick={() => setPipelineView((prev) => ({ ...prev, [seq.id]: "chips" }))}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "chips" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-violet-600"}`}>
                                  <LayoutGrid className="h-3.5 w-3.5" /> {t('sequences', 'viewCards')}
                                </button>
                                <button
                                  onClick={() => setPipelineView((prev) => ({ ...prev, [seq.id]: "table" }))}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "table" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-violet-600"}`}>
                                  <Table2 className="h-3.5 w-3.5" /> {t('sequences', 'viewTable')}
                                </button>
                              </div>
                            </div>
                            {(seq.stepIds?.length || 0) > 0 ? (
                              <PipelineView
                                sequence={seq}
                                viewMode={viewMode}
                              />
                            ) : (
                              <p className="py-4 text-center text-sm italic text-slate-400">{t('sequences', 'noStepsAssigned')}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}

              {filteredSeqs.length === 0 && (
                <tr>
                  <td colSpan={canEditSequence() ? 8 : 7} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <GitBranch className="h-8 w-8 text-violet-200" />
                      <p className="text-sm text-slate-400">{t('sequences', 'emptyState')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && canEditSequence() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm">
                  <GitBranch className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">
                    {editingSeq ? t('sequences', 'modalEditTitle') : t('sequences', 'modalCreateTitle')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {editingSeq ? `${t('sequences', 'modalEditSubtitle')} ${editingSeq.name}` : t('sequences', 'modalCreateSubtitle')}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{t('fields', 'name')}</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('sequences', 'namePlaceholder')}
                    className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{t('fields', 'description')}</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t('sequences', 'descPlaceholder')}
                    className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                    <Layers className="h-3 w-3" /> {t('sequences', 'availableSteps')}
                  </label>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-violet-100 bg-violet-50/30">
                    {!steps || steps.length === 0
                      ? <p className="p-4 text-center text-xs italic text-slate-400">{t('sequences', 'noSteps')}</p>
                      : steps.map((step) => {
                          const checked = selectedStepIds.has(step.id)
                          return (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => toggleStep(step.id)}
                              aria-pressed={checked}
                              className={`flex w-full cursor-pointer items-center gap-3 border-b border-violet-50 px-3 py-2.5 text-left transition-colors last:border-0 ${checked ? "bg-violet-100/60" : "hover:bg-violet-50"}`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${checked ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`}>
                                {checked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800" title={`${step.name} - ID ${step.id}`}>
                                  {step.name}
                                </p>
                                <p className="truncate text-xs text-slate-400">ID {step.id} - {step.params?.length || 0} param(s)</p>
                              </div>
                            </button>
                          )
                        })
                    }
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    <Play className="h-3 w-3" /> {t('sequences', 'executionOrder')} ({formStepIds.length})
                  </label>
                  {formStepIds.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-purple-100 bg-purple-50/30">
                      {formStepIds.map((sid, i) => {
                        const step = steps?.find((s) => s.id === sid)
                        if (!step) return null

                        return (
                          <div
                            key={`${sid}-${i}`}
                            draggable
                            onDragStart={(event) => handleStepDragStart(event, i)}
                            onDragOver={(event) => {
                              event.preventDefault()
                              event.dataTransfer.dropEffect = "move"
                            }}
                            onDrop={(event) => handleStepDrop(event, i)}
                            onDragEnd={() => setDraggedStepIndex(null)}
                            className={`flex cursor-grab items-center gap-2.5 border-b border-purple-50 bg-white/60 px-3 py-2.5 transition-all last:border-0 hover:bg-purple-50 active:cursor-grabbing ${
                              draggedStepIndex === i ? "bg-purple-100 opacity-60 ring-2 ring-purple-200" : ""
                            }`}
                          >
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-purple-300" />
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800" title={`${step.name} - ID ${step.id}`}>
                              {step.name}
                              <span className="ml-2 text-[11px] font-medium text-slate-400">ID {step.id}</span>
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveStep(i, -1)}
                                disabled={i === 0}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-purple-400 transition-colors hover:bg-purple-100 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStep(i, 1)}
                                disabled={i === formStepIds.length - 1}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-purple-400 transition-colors hover:bg-purple-100 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => toggleStep(sid)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30">
                      <Play className="h-6 w-6 text-purple-200" />
                      <p className="text-xs italic text-slate-400">{t('sequences', 'checkStepsHint')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-violet-100 bg-white px-6 py-4">
              <button onClick={closeModal} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all">{t('actions', 'cancel')}</button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all">
                <Save className="h-4 w-4" />
                {editingSeq ? t('sequences', 'editBtn') : t('sequences', 'createBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && canEditSequence() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="mb-1 text-base font-bold text-slate-900">{t('sequences', 'deleteTitle')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('common', 'deleteIrreversible')}</p>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setIsDeleting(null) }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">{t('actions', 'cancel')}</button>
              <button onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)} disabled={isDeleting === deleteConfirm} className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{t('actions', 'delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
