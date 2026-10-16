"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleOff,
  Info,
  Lock,
  Pencil,
  Repeat2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Timer,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ProductExecutionConfig } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { useStore } from "@/lib/store-api";
import { useTranslation } from "@/lib/useTranslation";

type ExecutionConfigForm = {
  execution_mode_id: number;
  sequence_id: number | "";
  step_id: number | "";
  is_active: boolean;
  ignore_fail: boolean;
  retry_on_fail: number;
  repeat_count: number;
  retry_delay_ms: number;
};

type Translate = ReturnType<typeof useTranslation>["t"];

const EMPTY_FORM: ExecutionConfigForm = {
  execution_mode_id: 0,
  sequence_id: "",
  step_id: "",
  is_active: true,
  ignore_fail: false,
  retry_on_fail: 0,
  repeat_count: 1,
  retry_delay_ms: 0,
};

export default function ExecutionConfigTab({
  activeProductId: activeProductIdProp,
  activeSequenceId,
  activeStepId,
}: {
  activeProductId?: number;
  activeSequenceId?: number;
  activeStepId?: number;
}) {
  const {
    products,
    executionModes,
    sequencesConfig,
    sequenceSteps,
    stepConfigs,
    executionConfigs,
    addExecutionConfig,
    updateExecutionConfig,
  } = useStore();
  const { canManageUsers } = usePermissions();
  const { t } = useTranslation();
  const initializingKeysRef = useRef<Set<string>>(new Set());

  const [selectedProductId, setSelectedProductId] = useState<number>(
    activeProductIdProp || 0,
  );
  const [filterModeId, setFilterModeId] = useState<number>(0);
  const [filterTargetType, setFilterTargetType] = useState<
    "all" | "sequence" | "step"
  >(typeof activeStepId === "number" ? "step" : activeSequenceId ? "sequence" : "all");
  const [filterSequenceId, setFilterSequenceId] = useState<number | "">(
    activeSequenceId ?? "",
  );
  const [filterStepId, setFilterStepId] = useState<number | "">(
    activeStepId ?? "",
  );
  const [editing, setEditing] = useState<ProductExecutionConfig | null>(null);
  const [form, setForm] = useState<ExecutionConfigForm>(EMPTY_FORM);

  const activeProductId =
    activeProductIdProp || selectedProductId || products[0]?.id || 0;

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) || null,
    [activeProductId, products],
  );

  const productSequenceIds = useMemo(
    () =>
      new Set(
        (selectedProduct?.sequenceIds || [])
          .map((id) => Number(id))
          .filter(Number.isFinite),
      ),
    [selectedProduct],
  );

  const productStepIds = useMemo(() => {
    if (!selectedProduct) {
      return new Set<number>();
    }

    const directStepIds = [
      ...(selectedProduct.preuutStepIds || []),
      ...(selectedProduct.postuutStepIds || []),
    ].map((id) => Number(id));
    const sequenceStepIds = sequenceSteps
      .filter((link) => productSequenceIds.has(link.sequence_id))
      .map((link) => link.step_id);

    return new Set(
      [...directStepIds, ...sequenceStepIds].filter(Number.isFinite),
    );
  }, [productSequenceIds, selectedProduct, sequenceSteps]);

  const availableSequences = useMemo(
    () =>
      sequencesConfig.filter((sequence) => productSequenceIds.has(sequence.id)),
    [productSequenceIds, sequencesConfig],
  );

  const availableSteps = useMemo(
    () => stepConfigs.filter((step) => productStepIds.has(step.id)),
    [productStepIds, stepConfigs],
  );

  const configs = useMemo(
    () =>
      executionConfigs
        .filter((config) => config.product_id === activeProductId)
        .sort((left, right) => {
          const modeCompare = (left.mode_name || "").localeCompare(
            right.mode_name || "",
          );

          if (modeCompare !== 0) return modeCompare;
          const targetCompare = getTargetLabel(left, t).localeCompare(
            getTargetLabel(right, t),
          );
          return targetCompare !== 0 ? targetCompare : left.id - right.id;
        }),
    [activeProductId, executionConfigs, t],
  );

  const filteredConfigs = useMemo(
    () =>
      configs.filter((config) => {
        if (filterModeId && config.execution_mode_id !== filterModeId) {
          return false;
        }

        if (filterTargetType === "sequence") {
          return (
            config.sequence_id !== null &&
            (filterSequenceId === "" ||
              config.sequence_id === Number(filterSequenceId))
          );
        }

        if (filterTargetType === "step") {
          return (
            config.step_id !== null &&
            (filterStepId === "" || config.step_id === Number(filterStepId))
          );
        }

        return true;
      }),
    [configs, filterModeId, filterSequenceId, filterStepId, filterTargetType],
  );

  useEffect(() => {
    if (!canManageUsers()) return;
    if (executionModes.length === 0 || products.length === 0) return;

    const validSequenceIds = new Set(
      sequencesConfig.map((sequence) => sequence.id),
    );
    const validStepIds = new Set(stepConfigs.map((step) => step.id));

    const createMissingDefaults = async () => {
      for (const product of products) {
        const sequenceTargets = Array.from(new Set(product.sequenceIds || []))
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && validSequenceIds.has(id));
        const productSequenceTargets = new Set(sequenceTargets);
        const directStepTargets = [
          ...(product.preuutStepIds || []),
          ...(product.postuutStepIds || []),
        ].map((id) => Number(id));
        const sequenceStepTargets = sequenceSteps
          .filter((link) => productSequenceTargets.has(link.sequence_id))
          .map((link) => link.step_id);
        const stepTargets = Array.from(
          new Set([...directStepTargets, ...sequenceStepTargets]),
        )
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && validStepIds.has(id));

        for (const mode of executionModes) {
          for (const sequenceId of sequenceTargets) {
            const key = `${product.id}-${mode.id}-sequence-${sequenceId}`;
            const exists = executionConfigs.some(
              (config) =>
                config.product_id === product.id &&
                config.execution_mode_id === mode.id &&
                config.sequence_id === sequenceId,
            );

            if (exists || initializingKeysRef.current.has(key)) continue;

            initializingKeysRef.current.add(key);
            try {
              await addExecutionConfig({
                product_id: product.id,
                execution_mode_id: mode.id,
                sequence_id: sequenceId,
                step_id: null,
                is_active: true,
                ignore_fail: false,
                retry_on_fail: 0,
                repeat_count: 1,
                retry_delay_ms: 0,
              });
            } catch {
              initializingKeysRef.current.delete(key);
            }
          }

          for (const stepId of stepTargets) {
            const key = `${product.id}-${mode.id}-step-${stepId}`;
            const exists = executionConfigs.some(
              (config) =>
                config.product_id === product.id &&
                config.execution_mode_id === mode.id &&
                config.step_id === stepId,
            );

            if (exists || initializingKeysRef.current.has(key)) continue;

            initializingKeysRef.current.add(key);
            try {
              await addExecutionConfig({
                product_id: product.id,
                execution_mode_id: mode.id,
                sequence_id: null,
                step_id: stepId,
                is_active: true,
                ignore_fail: false,
                retry_on_fail: 0,
                repeat_count: 1,
                retry_delay_ms: 0,
              });
            } catch {
              initializingKeysRef.current.delete(key);
            }
          }
        }
      }
    };

    void createMissingDefaults();
  }, [
    addExecutionConfig,
    canManageUsers,
    executionModes,
    executionConfigs,
    products,
    sequenceSteps,
    sequencesConfig,
    stepConfigs,
  ]);

  if (!canManageUsers()) {
    return <Unauthorized />;
  }

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function openEdit(config: ProductExecutionConfig) {
    setEditing(config);
    setSelectedProductId(config.product_id);
    setForm({
      execution_mode_id: config.execution_mode_id,
      sequence_id: config.sequence_id ?? "",
      step_id: config.step_id ?? "",
      is_active: config.is_active,
      ignore_fail: config.ignore_fail,
      retry_on_fail: config.retry_on_fail,
      repeat_count: config.repeat_count,
      retry_delay_ms: config.retry_delay_ms,
    });
  }

  async function saveConfig() {
    if (!editing) {
      toast.error(t("common", "chooseConfigToEdit"));
      return;
    }

    try {
      await updateExecutionConfig(editing.id, {
        product_id: editing.product_id,
        execution_mode_id: form.execution_mode_id,
        sequence_id: form.sequence_id === "" ? null : Number(form.sequence_id),
        step_id: form.step_id === "" ? null : Number(form.step_id),
        is_active: form.is_active,
        ignore_fail: form.ignore_fail,
        retry_on_fail: Number(form.retry_on_fail) || 0,
        repeat_count: Number(form.repeat_count) || 1,
        retry_delay_ms: Number(form.retry_delay_ms) || 0,
      });
      resetForm();
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  const headerTitle = selectedProduct
    ? `${t("nav", "executionConfig")} - ${selectedProduct.name}`
    : t("nav", "executionConfig");
  const configurationLabel = (count: number) =>
    count > 1
      ? t("executionConfig", "configurationPlural")
      : t("executionConfig", "configurationSingular");
  const shownLabel = (count: number) =>
    count > 1
      ? t("executionConfig", "shownPlural")
      : t("executionConfig", "shownSingular");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{headerTitle}</h2>
              <p className="text-sm text-slate-400">
                {filteredConfigs.length} {shownLabel(filteredConfigs.length)}{" "}
                {t("executionConfig", "of")} {configs.length}{" "}
                {configurationLabel(configs.length)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs font-semibold text-violet-700">
            <SlidersHorizontal className="h-4 w-4" />
            {t("executionConfig", "filterThenEdit")}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-600">
              <SlidersHorizontal className="h-3.5 w-3.5" /> {t("executionConfig", "filters")}
            </p>
            <Label text={t("executionConfig", "product")}>
              <select
                value={activeProductId}
                onChange={(event) => {
                  setSelectedProductId(Number(event.target.value));
                  setFilterModeId(0);
                  setFilterTargetType("all");
                  setFilterSequenceId("");
                  setFilterStepId("");
                  resetForm();
                }}
                className={inputClass}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Label>

            <Label text={t("executionConfig", "executionMode")}>
              <select
                value={filterModeId}
                onChange={(event) => setFilterModeId(Number(event.target.value))}
                className={inputClass}
              >
                <option value={0}>{t("executionConfig", "allModes")}</option>
                {executionModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </Label>

            <Label text={t("executionConfig", "targetType")}>
              <select
                value={filterTargetType}
                onChange={(event) => {
                  const nextType = event.target.value as
                    | "all"
                    | "sequence"
                    | "step";
                  setFilterTargetType(nextType);
                  setFilterSequenceId("");
                  setFilterStepId("");
                }}
                className={inputClass}
              >
                <option value="all">{t("executionConfig", "sequencesAndSteps")}</option>
                <option value="sequence">{t("executionConfig", "sequencesOnly")}</option>
                <option value="step">{t("executionConfig", "stepsOnly")}</option>
              </select>
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label text={t("common", "sequence")}>
                <select
                  value={filterSequenceId}
                  disabled={filterTargetType !== "sequence"}
                  onChange={(event) =>
                    setFilterSequenceId(
                      event.target.value === "" ? "" : Number(event.target.value),
                    )
                  }
                  className={`${inputClass} ${
                    filterTargetType !== "sequence" ? "cursor-not-allowed bg-slate-50" : ""
                  }`}
                >
                  <option value="">{t("common", "allFem")}</option>
                  {availableSequences.map((sequence) => (
                    <option key={sequence.id} value={sequence.id}>
                      {sequence.name}
                    </option>
                  ))}
                </select>
              </Label>

              <Label text={t("common", "step")}>
                <select
                  value={filterStepId}
                  disabled={filterTargetType !== "step"}
                  onChange={(event) =>
                    setFilterStepId(
                      event.target.value === "" ? "" : Number(event.target.value),
                    )
                  }
                  className={`${inputClass} ${
                    filterTargetType !== "step" ? "cursor-not-allowed bg-slate-50" : ""
                  }`}
                >
                  <option value="">{t("common", "all")}</option>
                  {availableSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.name}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          </div>

          {editing ? (
            <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                    {t("executionConfig", "modification")}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {getTargetLabel(editing, t)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {editing.mode_name ||
                      `${t("executionConfig", "modeFallback")} ${editing.execution_mode_id}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <IconToggle
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label={t("executionConfig", "active")}
                  checked={form.is_active}
                  onChange={(checked) =>
                    setForm((current) => ({ ...current, is_active: checked }))
                  }
                />
                <IconToggle
                  icon={<CircleOff className="h-4 w-4" />}
                  label={t("executionConfig", "ignoreFail")}
                  checked={form.ignore_fail}
                  onChange={(checked) =>
                    setForm((current) => ({ ...current, ignore_fail: checked }))
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <NumberField
                  icon={<RotateCcw className="h-4 w-4" />}
                  label={t("executionConfig", "retries")}
                  min={0}
                  value={form.retry_on_fail}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, retry_on_fail: value }))
                  }
                />
                <NumberField
                  icon={<Repeat2 className="h-4 w-4" />}
                  label={t("executionConfig", "repetitions")}
                  min={1}
                  value={form.repeat_count}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, repeat_count: value }))
                  }
                />
                <NumberField
                  icon={<Timer className="h-4 w-4" />}
                  label={t("executionConfig", "delayMs")}
                  min={0}
                  value={form.retry_delay_ms}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, retry_delay_ms: value }))
                  }
                />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveConfig()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200"
                >
                  <Save className="h-4 w-4" />
                  {t("actions", "save")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-5 text-sm text-slate-400 shadow-sm">
              {t("executionConfig", "editHint")}
            </div>
          )}
        </aside>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
              {t("executionConfig", "filterResult")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filteredConfigs.length} {configurationLabel(filteredConfigs.length)}{" "}
              {shownLabel(filteredConfigs.length)}{" "}
              {t("executionConfig", "forThisProduct")}
            </p>
          </div>

          {filteredConfigs.map((config) => (
            <article
              key={config.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md ${
                editing?.id === config.id
                  ? "border-violet-300 ring-2 ring-violet-100"
                  : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                      {config.mode_name ||
                        `${t("executionConfig", "modeFallback")} ${config.execution_mode_id}`}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        config.sequence_id
                          ? "border-purple-200 bg-purple-50 text-purple-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      {getTargetLabel(config, t)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ConfigBadge
                      active={config.is_active}
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      label={t("executionConfig", "active")}
                    />
                    <ConfigBadge
                      active={config.ignore_fail}
                      icon={<CircleOff className="h-3.5 w-3.5" />}
                      label={t("executionConfig", "ignoreFail")}
                    />
                    <MetricBadge
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      label={`${t("executionConfig", "retries")} ${config.retry_on_fail}`}
                    />
                    <MetricBadge
                      icon={<Repeat2 className="h-3.5 w-3.5" />}
                      label={`${t("executionConfig", "repetitions")} ${config.repeat_count}`}
                    />
                    <MetricBadge
                      icon={<Timer className="h-3.5 w-3.5" />}
                      label={`${config.retry_delay_ms} ms`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {t("executionConfig", "createdOn")} {formatDate(config.created_at)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(config)}
                    title={t("actions", "edit")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredConfigs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white py-16 text-center text-sm text-slate-400 shadow-sm">
              {t("executionConfig", "noFilterMatch")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTargetLabel(config: ProductExecutionConfig, t?: Translate) {
  if (config.sequence_id !== null) {
    return config.sequence_name || `${t?.("common", "sequence") || "Sequence"} ${config.sequence_id}`;
  }

  return config.step_name || `${t?.("common", "step") || "Step"} ${config.step_id}`;
}

function ConfigBadge({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function MetricBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
      {icon}
      {label}
    </span>
  );
}

function IconToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
        checked
          ? "border-violet-300 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function NumberField({
  icon,
  label,
  min,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  min: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">
        {icon}
        {label}
      </span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </label>
  );
}

function Label({
  text,
  hint,
  children,
}: {
  text: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-3 flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">
        {text}
        {hint && (
          <span className="group relative inline-flex items-center text-violet-400">
            <Info className="h-3.5 w-3.5 cursor-help" />
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden w-52 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] font-medium normal-case tracking-normal text-white shadow-lg group-hover:block">
              {hint}
            </span>
          </span>
        )}
      </span>
      {children}
    </label>
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
  "h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
