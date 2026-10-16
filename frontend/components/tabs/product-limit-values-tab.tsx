"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Gauge,
  GripVertical,
  Layers,
  Lock,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ComponentInstance, ProductStepLimit, StepLimit } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { useStore } from "@/lib/store-api";
import { useTranslation } from "@/lib/useTranslation";

type InstanceDraft = {
  instance_name: string;
  physical_ref: string;
  description: string;
};

export default function ProductLimitValuesTab({
  activeProductId: activeProductIdProp,
  onActiveProductIdChange,
}: {
  activeProductId?: number;
  onActiveProductIdChange?: (productId: number) => void;
}) {
  const {
    products,
    sequences,
    steps,
    stepConfigs,
    stepLimits,
    executionModes,
    componentInstances,
    productStepLimits,
    loadStepConfigs,
    loadStepLimits,
    loadExecutionModes,
    loadComponentInstances,
    loadProductStepLimits,
    addComponentInstance,
    updateComponentInstance,
    deleteComponentInstance,
    addProductStepLimit,
    updateProductStepLimit,
    deleteProductStepLimit,
  } = useStore();
  const { canManageUsers } = usePermissions();
  const { t } = useTranslation();

  const [selectedProductId, setSelectedProductId] = useState<number>(activeProductIdProp || 0);
  const [selectedStepId, setSelectedStepId] = useState<number>(0);
  const [selectedModeId, setSelectedModeId] = useState<number>(0);
  const [openLimitId, setOpenLimitId] = useState<number | null>(null);
  const [draftsByLimit, setDraftsByLimit] = useState<Record<number, InstanceDraft>>({});
  const [draggedInstanceId, setDraggedInstanceId] = useState<number | null>(null);

  const activeProductId = activeProductIdProp || selectedProductId || products[0]?.id || 0;
  const activeProduct = products.find((product) => product.id === activeProductId) || null;
  const activeModeId = executionModes.some((mode) => mode.id === selectedModeId)
    ? selectedModeId
    : executionModes[0]?.id || 0;

  useEffect(() => {
    void Promise.all([
      loadStepConfigs(),
      loadStepLimits(),
      loadExecutionModes(),
      loadComponentInstances(),
      loadProductStepLimits(),
    ]);
  }, [
    loadStepConfigs,
    loadStepLimits,
    loadExecutionModes,
    loadComponentInstances,
    loadProductStepLimits,
  ]);

  const productStepIds = useMemo(() => {
    if (!activeProduct) return new Set<number>();

    const ids = [
      ...(activeProduct.preuutStepIds || []),
      ...(activeProduct.postuutStepIds || []),
    ].map(Number);

    for (const sequenceId of activeProduct.sequenceIds || []) {
      const sequence = sequences.find((item) => item.id === Number(sequenceId));
      ids.push(...(sequence?.stepIds || []).map(Number));
    }

    return new Set(ids.filter(Number.isFinite));
  }, [activeProduct, sequences]);

  const availableSteps = useMemo(() => {
    const catalog = new Map<number, { id: number; name: string; description: string }>();
    const stepsWithLimits = new Set(stepLimits.map((limit) => limit.step_id));

    for (const step of stepConfigs) {
      catalog.set(step.id, {
        id: step.id,
        name: step.name,
        description: step.description || "",
      });
    }

    for (const step of steps) {
      catalog.set(step.id, {
        id: step.id,
        name: step.name,
        description: step.description || "",
      });
    }

    return [...productStepIds]
      .filter((stepId) => stepsWithLimits.has(stepId))
      .map((stepId) => catalog.get(stepId))
      .filter((step): step is { id: number; name: string; description: string } => Boolean(step))
      .sort((left, right) => left.id - right.id);
  }, [productStepIds, stepConfigs, stepLimits, steps]);

  const activeStepId = availableSteps.some((step) => step.id === selectedStepId)
    ? selectedStepId
    : availableSteps[0]?.id || 0;
  const activeStep = availableSteps.find((step) => step.id === activeStepId) || null;

  const limitsForStep = useMemo(
    () => stepLimits.filter((limit) => limit.step_id === activeStepId),
    [stepLimits, activeStepId],
  );

  const instancesForStep = useMemo(
    () =>
      componentInstances
        .filter((item) => item.product_id === activeProductId && item.step_id === activeStepId)
        .sort((left, right) => left.instance_index - right.instance_index || left.id - right.id),
    [componentInstances, activeProductId, activeStepId],
  );

  const configuredLimitCount = useMemo(
    () =>
      limitsForStep.filter((limit) =>
        productStepLimits.some(
          (row) =>
            row.step_limit_id === limit.id &&
            (row.execution_mode_id || 0) === activeModeId,
        ),
      ).length,
    [activeModeId, limitsForStep, productStepLimits],
  );

  if (!canManageUsers()) return <Unauthorized />;

  function getDraft(limitId: number): InstanceDraft {
    return draftsByLimit[limitId] || {
      instance_name: "",
      physical_ref: "",
      description: "",
    };
  }

  function updateDraft(limitId: number, patch: Partial<InstanceDraft>) {
    setDraftsByLimit((drafts) => ({
      ...drafts,
      [limitId]: {
        ...getDraft(limitId),
        ...patch,
      },
    }));
  }

  function limitRows(limitId: number) {
    return productStepLimits
      .filter((row) =>
        row.step_limit_id === limitId &&
        (row.execution_mode_id || 0) === activeModeId,
      )
      .map((row) => ({
        row,
        instance: instancesForStep.find((instance) => instance.id === row.component_instance_id) || null,
      }))
      .filter((item): item is { row: ProductStepLimit; instance: ComponentInstance } => Boolean(item.instance))
      .sort((left, right) => left.instance.instance_index - right.instance.instance_index || left.instance.id - right.instance.id);
  }

  async function createInstanceForLimit(limit: StepLimit) {
    if (!activeProductId || !activeStepId) {
      toast.error(t("productLimitValues", "selectProductAndStep"));
      return;
    }

    const draft = getDraft(limit.id);
    if (!draft.instance_name.trim()) {
      toast.error(t("productLimitValues", "instanceNameRequired"));
      return;
    }

    const nextIndex = Math.max(0, ...limitRows(limit.id).map((item) => item.instance.instance_index || 0)) + 1;
    const createdInstance = await addComponentInstance({
      product_id: activeProductId,
      step_id: activeStepId,
      instance_index: nextIndex,
      instance_name: draft.instance_name.trim(),
      physical_ref: draft.physical_ref.trim() || null,
      description: draft.description.trim() || null,
      is_active: true,
    });

    await addProductStepLimit({
      component_instance_id: createdInstance.id,
      step_limit_id: limit.id,
      execution_mode_id: activeModeId || null,
      is_active: true,
    });

    setDraftsByLimit((drafts) => ({
      ...drafts,
      [limit.id]: { instance_name: "", physical_ref: "", description: "" },
    }));
    setOpenLimitId(null);
  }

  async function reorderLimitInstances(
    limitId: number,
    targetInstanceId: number,
  ) {
    if (!draggedInstanceId || draggedInstanceId === targetInstanceId) return;

    const rows = limitRows(limitId);
    const fromIndex = rows.findIndex((item) => item.instance.id === draggedInstanceId);
    const toIndex = rows.findIndex((item) => item.instance.id === targetInstanceId);

    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...rows];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    await Promise.all(
      reordered.map(({ instance }, index) =>
        updateComponentInstance(instance.id, {
          ...instance,
          instance_index: index + 1,
        }),
      ),
    );
    setDraggedInstanceId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-amber-500 shadow-sm">
              <Gauge className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeProduct ? `${t("productLimitValues", "title")} - ${activeProduct.name}` : t("productLimitValues", "title")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("productLimitValues", "subtitle")}
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryPill label={t("common", "stepPlural")} value={availableSteps.length} />
            <SummaryPill label={t("fields", "limits")} value={limitsForStep.length} />
            <SummaryPill label={t("productLimitValues", "instance")} value={instancesForStep.length} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
            <SlidersHorizontal className="h-4 w-4" />
            {t("common", "filters")}
          </div>
          <Label text={t("common", "product")}>
            <select
              value={activeProductId}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSelectedProductId(next);
                setSelectedStepId(0);
                onActiveProductIdChange?.(next);
              }}
              className={inputClass}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
              {products.length === 0 && <option value={0}>{t("common", "noProduct")}</option>}
            </select>
          </Label>

          <Label text={t("common", "mode")}>
            <select
              value={activeModeId}
              onChange={(event) => setSelectedModeId(Number(event.target.value))}
              className={inputClass}
            >
              {executionModes.map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.name}</option>
              ))}
              {executionModes.length === 0 && <option value={0}>{t("common", "noMode")}</option>}
            </select>
          </Label>

          <Label text={t("common", "step")}>
            <select
              value={activeStepId}
              onChange={(event) => setSelectedStepId(Number(event.target.value))}
              className={inputClass}
            >
              {availableSteps.map((step) => (
                <option key={step.id} value={step.id}>{step.name}</option>
              ))}
              {availableSteps.length === 0 && <option value={0}>{t("productLimitValues", "noStepWithLimits")}</option>}
            </select>
          </Label>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
            {activeStep ? activeStep.description || activeStep.name : t("productLimitValues", "noStepWithLimitsHint")}
          </div>

          <div className="mt-4 grid gap-2">
            <ContextLine label={t("common", "product")} value={activeProduct?.name || "-"} />
            <ContextLine
              label={t("common", "mode")}
              value={executionModes.find((mode) => mode.id === activeModeId)?.name || "-"}
            />
            <ContextLine label={t("common", "step")} value={activeStep?.name || "-"} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title={t("productLimitValues", "panelTitle")}>
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {t("productLimitValues", "hint")}
              </span>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {configuredLimitCount}/{limitsForStep.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {limitsForStep.map((limit) => {
                const rows = limitRows(limit.id);
                const draft = getDraft(limit.id);

                return (
                  <div key={limit.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-violet-200 hover:shadow-md">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/60 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                            <Gauge className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{limit.limit_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="rounded-full border border-violet-100 bg-white px-2 py-0.5 font-semibold text-violet-700">
                                {limit.comparison_type}
                              </span>
                              <span>
                                {t("productLimitValues", "default")} {formatDefaultLimit(limit)} {limit.unit || ""}
                              </span>
                              <span className="text-slate-400">
                                {rows.length} {t("productLimitValues", "instance")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenLimitId(openLimitId === limit.id ? null : limit.id)}
                          className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
                        >
                          {openLimitId === limit.id ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {t("productLimitValues", "instance")}
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 overflow-hidden rounded-lg border border-slate-100">
                        <table className="w-full">
                          <thead>
                            <tr>{[t("productLimitValues", "genericLimit"), t("fields", "comparison"), t("productLimitValues", "default"), t("fields", "unit")].map((label) => <Th key={label}>{label}</Th>)}</tr>
                          </thead>
                          <tbody>
                            <GenericLimitDisplay limit={limit} />
                          </tbody>
                        </table>
                      </div>

                      {openLimitId === limit.id && (
                        <div className="mb-3 grid gap-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                          <input
                            className={inputClass}
                            placeholder={t("productLimitValues", "instanceNamePlaceholder")}
                            value={draft.instance_name}
                            onChange={(event) => updateDraft(limit.id, { instance_name: event.target.value })}
                          />
                          <input
                            className={inputClass}
                            placeholder={t("productLimitValues", "physicalRef")}
                            value={draft.physical_ref}
                            onChange={(event) => updateDraft(limit.id, { physical_ref: event.target.value })}
                          />
                          <input
                            className={inputClass}
                            placeholder={t("fields", "description")}
                            value={draft.description}
                            onChange={(event) => updateDraft(limit.id, { description: event.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => void createInstanceForLimit(limit)}
                            className={primaryButtonClass}
                            title={t("productLimitValues", "addInstance")}
                            aria-label={t("productLimitValues", "addInstance")}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {rows.map(({ row, instance }, index) => (
                          <LimitInstanceCard
                            key={`${limit.id}-${instance.id}-${row.id}`}
                            row={row}
                            instance={instance}
                            limit={limit}
                            displayOrder={index + 1}
                            modeId={activeModeId}
                            onInstanceSave={updateComponentInstance}
                            onInstanceDelete={deleteComponentInstance}
                            onLimitSave={updateProductStepLimit}
                            onLimitDelete={deleteProductStepLimit}
                            onDragStart={setDraggedInstanceId}
                            onDrop={(targetInstanceId) => void reorderLimitInstances(limit.id, targetInstanceId)}
                          />
                        ))}
                        {rows.length === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-slate-400">
                            {t("productLimitValues", "noInstanceForLimit")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {limitsForStep.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-slate-400">
                  {t("productLimitValues", "noLimitForStep")}
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function LimitInstanceCard({
  row,
  instance,
  limit,
  displayOrder,
  modeId,
  onInstanceSave,
  onInstanceDelete,
  onLimitSave,
  onLimitDelete,
  onDragStart,
  onDrop,
}: {
  row: ProductStepLimit;
  instance: ComponentInstance;
  limit: StepLimit;
  displayOrder: number;
  modeId: number;
  onInstanceSave: (id: number, value: Partial<ComponentInstance>) => Promise<void>;
  onInstanceDelete: (id: number) => Promise<void>;
  onLimitSave: (id: number, value: Partial<ProductStepLimit>) => Promise<void>;
  onLimitDelete: (id: number) => Promise<void>;
  onDragStart: (id: number) => void;
  onDrop: (targetInstanceId: number) => void;
}) {
  const { t } = useTranslation();
  const [instanceDraft, setInstanceDraft] = useState(instance);
  const [limitDraft, setLimitDraft] = useState({
    limit_value: row.limit_value || "",
    limit_min: row.limit_min || "",
    limit_max: row.limit_max || "",
    is_active: row.is_active ?? true,
  });

  useEffect(() => {
    setInstanceDraft(instance);
  }, [instance]);

  const isRangeLimit = limit.comparison_type === "RANGE";

  async function save() {
    await onInstanceSave(instance.id, instanceDraft);
    await onLimitSave(row.id, {
      component_instance_id: instance.id,
      step_limit_id: limit.id,
      execution_mode_id: modeId || null,
      limit_value: isRangeLimit ? null : limitDraft.limit_value.trim() || null,
      limit_min: isRangeLimit ? limitDraft.limit_min.trim() || null : null,
      limit_max: isRangeLimit ? limitDraft.limit_max.trim() || null : null,
      is_active: limitDraft.is_active,
    });
  }

  return (
    <div
      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all hover:border-violet-200 hover:bg-white hover:shadow-sm"
      draggable
      onDragStart={() => onDragStart(instance.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(instance.id)}
    >
      <div
        className={
          isRangeLimit
            ? "grid gap-2 lg:grid-cols-[2rem_5rem_1fr_1fr_1fr_1fr_auto]"
            : "grid gap-2 lg:grid-cols-[2rem_5rem_1fr_1fr_1fr_auto]"
        }
      >
        <div className="flex h-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-violet-500">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex h-9 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-sm font-bold text-amber-700 shadow-sm" title={t("productLimitValues", "dragOrder")}>
          #{displayOrder}
        </div>
        <input className={cellInputClass} value={instanceDraft.instance_name} onChange={(event) => setInstanceDraft({ ...instanceDraft, instance_name: event.target.value })} placeholder={t("productLimitValues", "instance")} />
        <input className={cellInputClass} value={instanceDraft.physical_ref || ""} onChange={(event) => setInstanceDraft({ ...instanceDraft, physical_ref: event.target.value })} placeholder={t("productLimitValues", "physicalRef")} />
        {isRangeLimit ? (
          <>
            <input className={cellInputClass} value={limitDraft.limit_min} onChange={(event) => setLimitDraft({ ...limitDraft, limit_min: event.target.value })} placeholder={t("fields", "min")} />
            <input className={cellInputClass} value={limitDraft.limit_max} onChange={(event) => setLimitDraft({ ...limitDraft, limit_max: event.target.value })} placeholder={t("fields", "max")} />
          </>
        ) : (
          <input className={cellInputClass} value={limitDraft.limit_value} onChange={(event) => setLimitDraft({ ...limitDraft, limit_value: event.target.value })} placeholder={t("fields", "value")} />
        )}
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => void save()} className={iconButtonClass} title={t("actions", "save")} aria-label={t("actions", "save")}>
            <Save className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void onLimitDelete(row.id).then(() => onInstanceDelete(instance.id))} className={dangerIconButtonClass} title={t("actions", "delete")} aria-label={t("actions", "delete")}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-500">
        <span className="font-medium">{t("productLimitValues", "default")} : {formatDefaultLimit(limit)} {limit.unit || ""}</span>
        <span>{t("fields", "type")} : {limit.comparison_type}</span>
        <label className="ml-auto flex items-center gap-2 font-medium text-slate-600">
          <input type="checkbox" checked={instanceDraft.is_active} onChange={(event) => setInstanceDraft({ ...instanceDraft, is_active: event.target.checked })} />
          {t("productLimitValues", "activeInstance")}
        </label>
        <label className="flex items-center gap-2 font-medium text-slate-600">
          <input type="checkbox" checked={limitDraft.is_active} onChange={(event) => setLimitDraft({ ...limitDraft, is_active: event.target.checked })} />
          {t("productLimitValues", "activeLimit")}
        </label>
      </div>
    </div>
  );
}

function GenericLimitDisplay({ limit }: { limit: StepLimit }) {
  return (
    <tr className="border-t border-slate-50">
      <Td>{limit.limit_name}</Td>
      <Td>{limit.comparison_type}</Td>
      <Td>{formatDefaultLimit(limit)}</Td>
      <Td>{limit.unit || "-"}</Td>
    </tr>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Layers className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="mt-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{text}</span>
      {children}
    </label>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[7rem] rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="truncate text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-violet-500">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2 text-sm text-slate-700">{children}</td>;
}

function Unauthorized() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
      <Lock className="mb-4 h-14 w-14 text-slate-300" />
      <p className="text-lg font-semibold text-slate-700">{t("common", "accessDenied")}</p>
      <p className="text-sm text-slate-400">{t("common", "manageUsersRequired")}</p>
    </div>
  );
}

function formatDefaultLimit(limit: StepLimit) {
  if (limit.comparison_type === "RANGE") return `${limit.limit_min || "-"} - ${limit.limit_max || "-"}`;
  return limit.limit_value || "-";
}

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const cellInputClass = "h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const primaryButtonClass = "flex h-10 items-center justify-center rounded-xl bg-violet-600 px-3 text-white shadow-sm transition hover:bg-violet-700";
const iconButtonClass = "flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-100";
const dangerIconButtonClass = "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600";
