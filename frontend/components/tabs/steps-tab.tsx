"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import type { Step, StepLimit, StepParam } from "@/lib/api"
import { useStore } from "@/lib/store-api"
import { useTheme } from "@/components/theme-provider"
import { useToast } from "@/lib/useToast"
import { useTranslation } from "@/lib/useTranslation"
import { usePermissions } from "@/lib/usePermissions"
import {
  Plus, Pencil, Trash2, Search, Layers, Settings2, Package,
  ChevronDown, ChevronRight, Zap, Save, Lock, Gauge
} from "lucide-react"

type ModalTab = "general" | "params" | "limits"
type PendingParam = Pick<StepParam, "param_name" | "param_type" | "default_value"> & { tempId: string }
type PendingLimit = Omit<Partial<StepLimit>, "id" | "step_id" | "created_at" | "step_name"> & { tempId: string }

const paramTypes: StepParam["param_type"][] = ["float", "int", "string", "boolean"]
const limitTypes: StepLimit["limit_type"][] = ["NUMERIC", "STRING", "BOOLEAN", "PASS_FAIL"]
const comparisons: StepLimit["comparison_type"][] = ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "RANGE"]

const emptyParamDraft = {
  param_name: "",
  param_type: "string" as StepParam["param_type"],
  default_value: "",
}

const emptyLimitDraft = {
  limit_name: "",
  limit_type: "NUMERIC" as StepLimit["limit_type"],
  comparison_type: "EQ" as StepLimit["comparison_type"],
  limit_value: "",
  limit_min: "",
  limit_max: "",
  unit: "",
}

function ParamTooltipPortal({ step, anchorRef }: { step: Step; anchorRef: React.RefObject<HTMLElement> }) {
  const { t } = useTranslation()
  const [style, setStyle] = useState<React.CSSProperties>({})
  React.useEffect(() => {
    let raf: number
    function update() {
      if (!anchorRef.current) return
      const r = anchorRef.current.getBoundingClientRect()
      setStyle({ position: "fixed", zIndex: 99999, left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 10, transform: "translateX(-50%)", pointerEvents: "none" })
      raf = requestAnimationFrame(update)
    }
    update()
    return () => { cancelAnimationFrame(raf) }
  }, [anchorRef])
  if (typeof document === "undefined" || style.left === undefined) return null
  return createPortal(
    <div style={style}>
      <div className="min-w-[220px] max-w-[300px] rounded-xl bg-slate-900 p-3 shadow-2xl ring-1 ring-white/10">
        <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-600"><Settings2 className="h-3.5 w-3.5 text-white" /></div>
          <p className="text-sm font-semibold text-white">{step.name}</p>
        </div>
        {step.description && <p className="mb-2 text-xs leading-relaxed text-white/60">{step.description}</p>}
        {step.params?.length > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="mb-1 grid grid-cols-3 gap-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
              <span>{t('fields','name')}</span><span>{t('fields','type')}</span><span className="text-right">{t('fields','value')}</span>
            </div>
            {step.params.map((p) => (
              <div key={p.id} className="grid grid-cols-3 gap-1 rounded-md bg-white/10 px-2 py-1 text-xs">
                <span className="text-white/70 truncate">{p.name}</span>
                <span className="text-center text-violet-300">{p.type || "—"}</span>
                <span className="text-right font-semibold text-white">{p.value}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs italic text-white/40">{t('sequences','noParam')}</p>}
      </div>
      <div className="flex justify-center"><div style={{ width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #0f172a" }} /></div>
    </div>, document.body
  )
}

function StepNameCell({ step }: { step: Step }) {
  const [hovered, setHovered] = useState(false)
  const ref = React.useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="cursor-help font-semibold text-slate-800 transition-colors hover:text-violet-700">
      {step.name}
      {hovered && <ParamTooltipPortal step={step} anchorRef={ref as React.RefObject<HTMLElement>} />}
    </span>
  )
}

function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: number; gradient: string }) {
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

function formatAuditUser(value?: string | null) {
  const user = value?.trim()

  if (!user || user.toLowerCase() === "system") {
    return "-"
  }

  return user
}

export default function StepsTab() {
  const {
    steps,
    stepParams,
    stepLimits,
    addStep,
    updateStep,
    deleteStep,
    addStepParam,
    updateStepParam,
    deleteStepParam,
    addStepLimit,
    updateStepLimit,
    deleteStepLimit,
  } = useStore()
  const { canEditStep, canView } = usePermissions()
  useTheme()
  const { t } = useTranslation()
  const toastLib = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDependsOn, setFormDependsOn] = useState<number | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>("general")
  const [paramDraft, setParamDraft] = useState(emptyParamDraft)
  const [limitDraft, setLimitDraft] = useState(emptyLimitDraft)
  const [pendingParams, setPendingParams] = useState<PendingParam[]>([])
  const [pendingLimits, setPendingLimits] = useState<PendingLimit[]>([])

  if (!(canView() || canEditStep())) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Lock className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-lg font-semibold text-slate-600">{t('common', 'accessDenied')}</p>
        <p className="text-sm text-slate-400">{t('common', 'viewForbidden')}</p>
      </div>
    )
  }

  const filteredSteps = Array.isArray(steps) ? steps.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      String(s.id).toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.dependsOnName?.toLowerCase().includes(q)
    )
  }) : []

  const totalParams = Array.isArray(stepParams) ? stepParams.length : 0
  const thisMonth = Array.isArray(steps) ? steps.filter((s) => s.createdAt?.startsWith(new Date().toISOString().slice(0, 7))).length : 0

  const modalStepParams = editingStep
    ? stepParams.filter((param) => param.step_id === editingStep.id).sort((a, b) => a.param_name.localeCompare(b.param_name))
    : []
  const modalStepLimits = editingStep
    ? stepLimits.filter((limit) => limit.step_id === editingStep.id).sort((a, b) => a.limit_name.localeCompare(b.limit_name))
    : []
  const availableDependencySteps = steps
    .filter((step) => step.id !== editingStep?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  function openModal(step?: Step) {
    if (step) {
      setEditingStep(step)
      setFormName(step.name)
      setFormDescription(step.description || "")
      setFormDependsOn(step.dependsOn ?? null)
    } else {
      setEditingStep(null)
      setFormName("")
      setFormDescription("")
      setFormDependsOn(null)
      setPendingParams([])
      setPendingLimits([])
    }
    setParamDraft(emptyParamDraft)
    setLimitDraft(emptyLimitDraft)
    setActiveModalTab("general")
    setShowModal(true)
  }
  function closeModal() {
    setShowModal(false)
    setEditingStep(null)
    setFormName("")
    setFormDescription("")
    setFormDependsOn(null)
    setParamDraft(emptyParamDraft)
    setLimitDraft(emptyLimitDraft)
    setPendingParams([])
    setPendingLimits([])
    setActiveModalTab("general")
  }

  async function handleSave() {
    if (!formName.trim()) { toastLib.error(t('steps', 'toastNameRequired')); return }
    const stepData = {
      name: formName.trim(),
      description: formDescription,
      dependsOn: formDependsOn,
    }
    try {
      if (editingStep) {
        await updateStep(editingStep.id, stepData)
      } else {
        const createdStep = await addStep({ ...stepData, params: [] })
        for (const param of pendingParams) {
          await addStepParam({
            step_id: createdStep.id,
            param_name: param.param_name,
            param_type: param.param_type,
            default_value: param.default_value,
          })
        }
        for (const limit of pendingLimits) {
          await addStepLimit(cleanLimitPayload({
            ...limit,
            step_id: createdStep.id,
          }))
        }
      }
      closeModal()
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    }
  }

  async function handleAddParam() {
    const name = paramDraft.param_name.trim()
    const value = paramDraft.default_value.trim()

    if (!name) { toastLib.error(t('steps', 'toastParamNameRequired')); return }
    if (!isValidParamValue(paramDraft.param_type, value)) { toastLib.error(t('steps', 'toastDefaultValueInvalid')); return }

    if (editingStep) {
      await addStepParam({
        step_id: editingStep.id,
        param_name: name,
        param_type: paramDraft.param_type,
        default_value: value,
      })
    } else {
      setPendingParams((current) => [
        ...current,
        { tempId: createTempId(), param_name: name, param_type: paramDraft.param_type, default_value: value },
      ])
    }
    setParamDraft(emptyParamDraft)
  }

  async function handleAddLimit() {
    const payload = cleanLimitPayload({
      ...limitDraft,
      limit_name: limitDraft.limit_name.trim(),
      step_id: editingStep?.id,
    })

    if (!isLimitValid(payload)) { toastLib.error(t('steps', 'toastLimitInvalid')); return }

    if (editingStep) {
      await addStepLimit(payload)
    } else {
      setPendingLimits((current) => [
        ...current,
        { ...payload, tempId: createTempId() } as PendingLimit,
      ])
    }
    setLimitDraft(emptyLimitDraft)
  }

  async function handleDelete(id: number) {
    if (isDeleting === id) return
    setIsDeleting(id)
    try {
      await deleteStep(id)
    } catch {
      // Le store gere deja l'affichage de l'erreur.
    } finally {
      setDeleteConfirm(null)
      setIsDeleting(null)
    }
  }
  function toggleExpand(id: number) {
    setExpandedSteps((prev) => {
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<Layers className="h-5 w-5 text-white" />} label={t('steps', 'totalSteps')} value={steps?.length || 0} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard icon={<Settings2 className="h-5 w-5 text-white" />} label={t('steps', 'totalParams')} value={totalParams} gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
        <StatCard icon={<Package className="h-5 w-5 text-white" />} label={t('steps', 'createdMonth')} value={thisMonth} gradient="bg-gradient-to-br from-sky-500 to-blue-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-col gap-1" style={{ maxWidth: 480 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t('steps', 'searchPlaceholder')} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none placeholder:text-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <p className="ml-1 text-[11px] text-slate-400">
            {t('common', 'filterHint')} <span className="font-semibold text-violet-500">ID</span> · <span className="font-semibold text-violet-500">{t('fields', 'name')}</span> · <span className="font-semibold text-violet-500">{t('fields', 'description')}</span>
          </p>
        </div>
        {canEditStep() && (
          <button onClick={() => openModal()}
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700 active:scale-95">
            <Plus className="h-4 w-4" /> {t('steps', 'newStep')}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">{t('steps', 'listTitle')}</span>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {filteredSteps.length} {filteredSteps.length !== 1 ? t('common', 'results_plural') : t('common', 'results')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-8 px-3 py-3" />
                {[t('fields', 'id'), t('fields', 'name'), t('fields', 'description'), t('fields', 'dependsOn'), t('fields', 'params'), t('fields', 'limits'), t('fields', 'date'), t('fields', 'createdBy'), t('fields', 'modifiedBy')].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{h}</th>
                ))}
                {canEditStep() && (
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-violet-400">{t('fields', 'actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredSteps.map((step) => {
                const stepParamRows = stepParams.filter((param) => param.step_id === step.id)
                const stepLimitRows = stepLimits.filter((limit) => limit.step_id === step.id)
                const hasDetails = stepParamRows.length > 0 || stepLimitRows.length > 0

                return (
                <React.Fragment key={step.id}>
                  <tr className={`group border-b border-slate-50 transition-colors duration-100 last:border-0 hover:bg-violet-50/40 ${expandedSteps.has(step.id) ? "bg-violet-50/30" : ""}`}>
                    <td className="px-3 py-4">
                      {hasDetails && (
                        <button onClick={() => toggleExpand(step.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-violet-400 transition-all hover:bg-violet-100 hover:text-violet-700">
                          {expandedSteps.has(step.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4"><span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-600">{step.id}</span></td>
                    <td className="px-5 py-4"><StepNameCell step={step} /></td>
                    <td className="max-w-[180px] px-5 py-4 text-sm text-slate-500 truncate">{step.description || "—"}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {step.dependsOnName || (step.dependsOn ? `#${step.dependsOn}` : "-")}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleExpand(step.id)}>
                        <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 transition-colors">
                          <Settings2 className="h-3 w-3" />
                          {stepParamRows.length} {stepParamRows.length !== 1 ? t('steps', 'parameterPlural') : t('steps', 'parameterSingular')}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleExpand(step.id)}>
                        <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                          <Gauge className="h-3 w-3" />
                          {stepLimitRows.length} {stepLimitRows.length !== 1 ? t('steps', 'limitPlural') : t('steps', 'limitSingular')}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{step.createdAt}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatAuditUser(step.createdBy)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="flex flex-col">
                        <span>{formatAuditUser(step.modifiedBy)}</span>
                        {step.modifiedAt && <span className="text-[10px] text-slate-400">{step.modifiedAt}</span>}
                      </div>
                    </td>
                    {canEditStep() && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal(step)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-violet-100 hover:text-violet-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(step.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {expandedSteps.has(step.id) && hasDetails && (
                    <tr className="border-b border-violet-50 bg-gradient-to-r from-violet-50/60 to-purple-50/40">
                      <td colSpan={canEditStep() ? 11 : 10} className="p-0">
                        <div className="border-l-4 border-violet-400 px-6 py-4">
                          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-500">
                            <Settings2 className="h-3 w-3" /> {t('fields', 'params')}
                          </p>
                          <div className="mb-1.5 grid grid-cols-3 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>{t('fields', 'name')}</span><span>{t('fields', 'type')}</span><span>{t('fields', 'value')}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {stepParamRows.map((p) => (
                              <div key={p.id} className="grid grid-cols-3 gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 shadow-sm text-sm">
                                <span className="font-medium text-slate-700">{p.param_name}</span>
                                <span className="text-violet-500">{p.param_type || <span className="italic text-slate-300">-</span>}</span>
                                <span className="font-semibold text-violet-700">{p.default_value || "-"}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 border-t border-violet-100 pt-4">
                            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                              <Gauge className="h-3 w-3" /> {t('fields', 'limits')}
                            </p>
                            {stepLimitRows.length > 0 ? (
                              <>
                                <div className="mb-1.5 grid grid-cols-4 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <span>{t('fields', 'name')}</span><span>{t('fields', 'type')}</span><span>{t('fields', 'comparison')}</span><span>{t('fields', 'value')}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {stepLimitRows.map((limit) => (
                                    <div key={limit.id} className="grid grid-cols-4 gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 shadow-sm text-sm">
                                      <span className="font-medium text-slate-700">{limit.limit_name}</span>
                                      <span className="text-amber-600">{limit.limit_type}</span>
                                      <span className="text-slate-500">{limit.comparison_type}</span>
                                      <span className="font-semibold text-amber-700">{formatLimitValue(limit)}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 py-6 text-center text-sm text-slate-400">
                                {t('steps', 'noStepLimits')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                )
              })}
              {filteredSteps.length === 0 && (
                <tr>
                  <td colSpan={canEditStep() ? 11 : 10} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2"><Layers className="h-8 w-8 text-violet-200" /><p className="text-sm text-slate-400">{t('steps', 'emptyState')}</p></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm">
                  {editingStep ? <Pencil className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">
                    {editingStep ? t('steps', 'modalEditTitle') : t('steps', 'modalCreateTitle')}
                  </h2>
                  <p className="text-[11px] text-slate-400">{editingStep ? `${t('steps', 'modalEditSubtitle')} ${editingStep.name}` : t('steps', 'modalCreateSubtitle')}</p>
                </div>
              </div>
              <button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="border-b border-violet-100 bg-white px-6 pt-4">
              <div className="flex gap-2">
                {([
                  ["general", t('steps', 'tabGeneral'), Layers],
                  ["params", t('steps', 'tabParams'), Settings2],
                  ["limits", t('steps', 'tabLimits'), Gauge],
                ] as const).map(([tab, label, Icon]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveModalTab(tab)}
                    className={`flex items-center gap-2 rounded-t-xl border px-4 py-2 text-sm font-semibold transition-all ${
                      activeModalTab === tab
                        ? "border-violet-200 border-b-white bg-white text-violet-700"
                        : "border-transparent bg-violet-50/60 text-slate-500 hover:text-violet-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              {activeModalTab === "general" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{t('steps', 'nameLabel')}</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('steps', 'namePlaceholder')} className={modalInputClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{t('fields', 'description')}</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t('steps', 'descPlaceholder')} rows={4} className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{t('fields', 'dependsOn')}</label>
                    <select
                      value={formDependsOn ?? ""}
                      onChange={(event) => setFormDependsOn(event.target.value ? Number(event.target.value) : null)}
                      className={modalInputClass}
                    >
                      <option value="">{t('steps', 'noDependency')}</option>
                      {availableDependencySteps.map((step) => (
                        <option key={step.id} value={step.id}>
                          {step.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeModalTab === "params" && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_9rem_1fr_auto]">
                    <input value={paramDraft.param_name} onChange={(event) => setParamDraft((current) => ({ ...current, param_name: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'name')} />
                    <select value={paramDraft.param_type} onChange={(event) => setParamDraft((current) => ({ ...current, param_type: event.target.value as StepParam["param_type"] }))} className={modalInputClass}>
                      {paramTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input value={paramDraft.default_value} onChange={(event) => setParamDraft((current) => ({ ...current, default_value: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'defaultValue')} />
                    <button type="button" onClick={() => void handleAddParam()} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">
                      <Plus className="h-4 w-4" /> {t('actions', 'add')}
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-violet-100">
                    {(editingStep ? modalStepParams : pendingParams).length === 0 ? (
                      <p className="py-10 text-center text-sm text-slate-400">{t('steps', 'noStepParams')}</p>
                    ) : (
                      <div className="divide-y divide-violet-50">
                        {editingStep
                          ? modalStepParams.map((param) => (
                              <EditableParamRow key={param.id} param={param} onSave={(next) => updateStepParam(param.id, next)} onDelete={() => deleteStepParam(param.id)} />
                            ))
                          : pendingParams.map((param) => (
                              <PendingParamRow key={param.tempId} param={param} onChange={(next) => setPendingParams((current) => current.map((item) => item.tempId === param.tempId ? { ...item, ...next } : item))} onDelete={() => setPendingParams((current) => current.filter((item) => item.tempId !== param.tempId))} />
                            ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === "limits" && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <input value={limitDraft.limit_name} onChange={(event) => setLimitDraft((current) => ({ ...current, limit_name: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'name')} />
                    <select value={limitDraft.limit_type} onChange={(event) => setLimitDraft((current) => ({ ...current, limit_type: event.target.value as StepLimit["limit_type"] }))} className={modalInputClass}>
                      {limitTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <select value={limitDraft.comparison_type} onChange={(event) => setLimitDraft((current) => ({ ...current, comparison_type: event.target.value as StepLimit["comparison_type"] }))} className={modalInputClass}>
                      {comparisons.map((comparison) => <option key={comparison} value={comparison}>{comparison}</option>)}
                    </select>
                    {limitDraft.comparison_type === "RANGE" ? (
                      <>
                        <input value={limitDraft.limit_min} onChange={(event) => setLimitDraft((current) => ({ ...current, limit_min: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'min')} />
                        <input value={limitDraft.limit_max} onChange={(event) => setLimitDraft((current) => ({ ...current, limit_max: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'max')} />
                      </>
                    ) : (
                      <input value={limitDraft.limit_value} onChange={(event) => setLimitDraft((current) => ({ ...current, limit_value: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'value')} />
                    )}
                    <input value={limitDraft.unit} onChange={(event) => setLimitDraft((current) => ({ ...current, unit: event.target.value }))} className={modalInputClass} placeholder={t('fields', 'unit')} />
                    <button type="button" onClick={() => void handleAddLimit()} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">
                      <Plus className="h-4 w-4" /> {t('actions', 'add')}
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {(editingStep ? modalStepLimits : pendingLimits).length === 0 ? (
                      <p className="rounded-xl border border-dashed border-violet-200 py-10 text-center text-sm text-slate-400">{t('steps', 'noStepLimits')}</p>
                    ) : editingStep ? (
                      modalStepLimits.map((limit) => (
                        <EditableLimitRow key={limit.id} limit={limit} onSave={(next) => updateStepLimit(limit.id, cleanLimitPayload(next))} onDelete={() => deleteStepLimit(limit.id)} />
                      ))
                    ) : (
                      pendingLimits.map((limit) => (
                        <PendingLimitRow key={limit.tempId} limit={limit} onChange={(next) => setPendingLimits((current) => current.map((item) => item.tempId === limit.tempId ? { ...item, ...next } : item))} onDelete={() => setPendingLimits((current) => current.filter((item) => item.tempId !== limit.tempId))} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>            <div className="flex items-center justify-end gap-3 border-t border-violet-100 bg-white px-6 py-4">
              <button onClick={closeModal} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all">{t('actions', 'cancel')}</button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all">
                <Save className="h-4 w-4" />{editingStep ? t('actions', 'save') : t('steps', 'createBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100"><Trash2 className="h-5 w-5 text-red-500" /></div>
            <h3 className="mb-1 text-base font-bold text-slate-900">{t('steps', 'deleteTitle')}</h3>
            <p className="mb-5 text-sm text-slate-500">{t('steps', 'deleteMessage')}</p>
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

function EditableParamRow({
  param,
  onSave,
  onDelete,
}: {
  param: StepParam
  onSave: (next: Partial<StepParam>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(param)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(param)

  return (
    <div className="grid gap-2 p-3 md:grid-cols-[1fr_8rem_1fr_auto]">
      <input value={draft.param_name} onChange={(event) => setDraft((current) => ({ ...current, param_name: event.target.value }))} className={modalCellClass} />
      <select value={draft.param_type} onChange={(event) => setDraft((current) => ({ ...current, param_type: event.target.value as StepParam["param_type"] }))} className={modalCellClass}>
        {paramTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <input value={draft.default_value || ""} onChange={(event) => setDraft((current) => ({ ...current, default_value: event.target.value }))} className={modalCellClass} />
      <div className="flex gap-1">
        <button type="button" title={t('actions', 'save')} aria-label={t('actions', 'save')} disabled={!isDirty} onClick={() => void onSave({ step_id: draft.step_id, param_name: draft.param_name, param_type: draft.param_type, default_value: draft.default_value })} className="flex h-9 w-9 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-100 disabled:opacity-30">
          <Save className="h-4 w-4" />
        </button>
        <button type="button" title={t('actions', 'delete')} aria-label={t('actions', 'delete')} onClick={() => void onDelete()} className="flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-red-500 hover:bg-red-50 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
          <span className="hidden text-xs font-semibold xl:inline">{t('actions', 'delete')}</span>
        </button>
      </div>
    </div>
  )
}

function PendingParamRow({
  param,
  onChange,
  onDelete,
}: {
  param: PendingParam
  onChange: (next: Partial<PendingParam>) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-2 p-3 md:grid-cols-[1fr_8rem_1fr_auto]">
      <input value={param.param_name} onChange={(event) => onChange({ param_name: event.target.value })} className={modalCellClass} />
      <select value={param.param_type} onChange={(event) => onChange({ param_type: event.target.value as StepParam["param_type"] })} className={modalCellClass}>
        {paramTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <input value={param.default_value} onChange={(event) => onChange({ default_value: event.target.value })} className={modalCellClass} />
      <button type="button" title={t('actions', 'delete')} aria-label={t('actions', 'delete')} onClick={onDelete} className="flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-red-500 hover:bg-red-50 hover:text-red-700">
        <Trash2 className="h-4 w-4" />
        <span className="hidden text-xs font-semibold xl:inline">{t('actions', 'delete')}</span>
      </button>
    </div>
  )
}

function EditableLimitRow({
  limit,
  onSave,
  onDelete,
}: {
  limit: StepLimit
  onSave: (next: Partial<StepLimit>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [draft, setDraft] = useState(limit)
  const isRange = draft.comparison_type === "RANGE"
  const isDirty = JSON.stringify(draft) !== JSON.stringify(limit)

  return (
    <div className="rounded-xl border border-violet-100 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-7">
        <input value={draft.limit_name} onChange={(event) => setDraft((current) => ({ ...current, limit_name: event.target.value }))} className="h-9 rounded-lg border border-violet-100 px-2 text-sm outline-none focus:border-violet-400 md:col-span-2" />
        <select value={draft.limit_type} onChange={(event) => setDraft((current) => ({ ...current, limit_type: event.target.value as StepLimit["limit_type"] }))} className={modalCellClass}>
          {limitTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={draft.comparison_type} onChange={(event) => setDraft((current) => ({ ...current, comparison_type: event.target.value as StepLimit["comparison_type"] }))} className={modalCellClass}>
          {comparisons.map((comparison) => <option key={comparison} value={comparison}>{comparison}</option>)}
        </select>
        {isRange ? (
          <>
            <input value={draft.limit_min || ""} onChange={(event) => setDraft((current) => ({ ...current, limit_min: event.target.value }))} className={modalCellClass} placeholder="min" />
            <input value={draft.limit_max || ""} onChange={(event) => setDraft((current) => ({ ...current, limit_max: event.target.value }))} className={modalCellClass} placeholder="max" />
          </>
        ) : (
          <input value={draft.limit_value || ""} onChange={(event) => setDraft((current) => ({ ...current, limit_value: event.target.value }))} className="h-9 rounded-lg border border-violet-100 px-2 text-sm outline-none focus:border-violet-400 md:col-span-2" placeholder="valeur" />
        )}
        <div className="flex gap-1">
          <button type="button" disabled={!isDirty} onClick={() => void onSave(draft)} className="flex h-9 w-9 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-100 disabled:opacity-30">
            <Save className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void onDelete()} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function PendingLimitRow({
  limit,
  onChange,
  onDelete,
}: {
  limit: PendingLimit
  onChange: (next: Partial<PendingLimit>) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-white p-3 text-sm">
      <input value={limit.limit_name || ""} onChange={(event) => onChange({ limit_name: event.target.value })} className={modalCellClass} />
      <select value={limit.limit_type} onChange={(event) => onChange({ limit_type: event.target.value as StepLimit["limit_type"] })} className={modalCellClass}>
        {limitTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <select value={limit.comparison_type} onChange={(event) => onChange({ comparison_type: event.target.value as StepLimit["comparison_type"] })} className={modalCellClass}>
        {comparisons.map((comparison) => <option key={comparison} value={comparison}>{comparison}</option>)}
      </select>
      <span className="text-slate-500">{formatLimitValue(limit)}</span>
      <button type="button" title={t('actions', 'delete')} aria-label={t('actions', 'delete')} onClick={onDelete} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function createTempId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function cleanLimitPayload(limit: Partial<StepLimit>): Partial<StepLimit> {
  const isRange = limit.comparison_type === "RANGE"
  return {
    ...limit,
    limit_value: isRange ? undefined : limit.limit_value || undefined,
    limit_min: isRange ? limit.limit_min || undefined : undefined,
    limit_max: isRange ? limit.limit_max || undefined : undefined,
    unit: limit.unit || undefined,
  }
}

function isLimitValid(limit: Partial<StepLimit>) {
  if (!limit.limit_name || !limit.limit_type || !limit.comparison_type) return false
  if (limit.comparison_type === "RANGE") return Boolean(limit.limit_min && limit.limit_max)
  return Boolean(limit.limit_value)
}

function isValidParamValue(type: StepParam["param_type"], value: string) {
  if (!value) return true
  if (type === "int") return /^-?\d+$/.test(value)
  if (type === "float") return /^-?\d+(\.\d+)?$/.test(value)
  if (type === "boolean") return ["true", "false", "0", "1"].includes(value.toLowerCase())
  return true
}

function formatLimitValue(limit: Partial<StepLimit>) {
  if (limit.comparison_type === "RANGE") {
    return `${limit.limit_min || "-"} - ${limit.limit_max || "-"} ${limit.unit || ""}`.trim()
  }
  return `${limit.comparison_type || ""} ${limit.limit_value || "-"} ${limit.unit || ""}`.trim()
}

const modalInputClass = "h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
const modalCellClass = "h-9 rounded-lg border border-violet-100 bg-white px-2 text-sm outline-none focus:border-violet-400"
