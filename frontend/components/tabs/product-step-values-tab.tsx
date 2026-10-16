"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Lock, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProductStepParam, StepParam } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { useStore } from "@/lib/store-api";
import { useTranslation } from "@/lib/useTranslation";

export default function ProductStepValuesTab({
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
    stepParams,
    productStepParams,
    addProductStepParam,
    updateProductStepParam,
    deleteProductStepParam,
    loadStepConfigs,
    loadStepParams,
    loadProductStepParams,
  } = useStore();
  const { canManageUsers } = usePermissions();
  const { t } = useTranslation();

  const [selectedProductId, setSelectedProductId] = useState<number>(activeProductIdProp || 0);
  const [selectedStepId, setSelectedStepId] = useState<number>(0);

  const activeProductId = activeProductIdProp || selectedProductId || products[0]?.id || 0;
  const activeProduct = products.find((product) => product.id === activeProductId) || null;

  useEffect(() => {
    void Promise.all([
      loadStepConfigs(),
      loadStepParams(),
      loadProductStepParams(),
    ]);
  }, [loadStepConfigs, loadStepParams, loadProductStepParams]);

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
    const stepsWithParams = new Set(stepParams.map((param) => param.step_id));

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
      .filter((stepId) => stepsWithParams.has(stepId))
      .map((stepId) => catalog.get(stepId))
      .filter((step): step is { id: number; name: string; description: string } => Boolean(step))
      .sort((left, right) => left.id - right.id);
  }, [productStepIds, stepConfigs, stepParams, steps]);

  const activeStepId = availableSteps.some((step) => step.id === selectedStepId)
    ? selectedStepId
    : availableSteps[0]?.id || 0;
  const activeStep = availableSteps.find((step) => step.id === activeStepId) || null;

  const paramsForStep = useMemo(
    () => stepParams.filter((param) => param.step_id === activeStepId),
    [stepParams, activeStepId],
  );

  const paramOverrides = useMemo(
    () => productStepParams.filter((item) => item.product_id === activeProductId),
    [productStepParams, activeProductId],
  );

  if (!canManageUsers()) return <Unauthorized />;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-600">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">
              {activeProduct ? `${t("productStepValues", "title")} - ${activeProduct.name}` : t("productStepValues", "title")}
            </h2>
            <p className="text-sm text-slate-400">
              {t("productStepValues", "subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
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

          <Label text={t("common", "step")}>
            <select
              value={activeStepId}
              onChange={(event) => setSelectedStepId(Number(event.target.value))}
              className={inputClass}
            >
              {availableSteps.map((step) => (
                <option key={step.id} value={step.id}>{step.name}</option>
              ))}
              {availableSteps.length === 0 && <option value={0}>{t("productStepValues", "noStepWithParams")}</option>}
            </select>
          </Label>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
            {activeStep ? activeStep.description || activeStep.name : t("productStepValues", "noStepWithParamsHint")}
          </div>
        </div>

        <Panel title={t("productStepValues", "panelTitle")}>
          <div className="mb-3 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 text-xs text-slate-500">
            {t("productStepValues", "foundForStep").replace("{count}", String(paramsForStep.length))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>{[t("productStepValues", "parameter"), t("fields", "type"), t("productStepValues", "default"), t("productStepValues", "productValue"), ""].map((label) => <Th key={label}>{label}</Th>)}</tr>
              </thead>
              <tbody>
                {paramsForStep.map((param) => (
                  <ParamRow
                    key={`${activeProductId}-${param.id}-${paramOverrides.find((item) => item.step_param_id === param.id)?.id || "new"}`}
                    param={param}
                    productId={activeProductId}
                    override={paramOverrides.find((item) => item.step_param_id === param.id) || null}
                    onCreate={addProductStepParam}
                    onSave={updateProductStepParam}
                    onDelete={deleteProductStepParam}
                  />
                ))}
                {paramsForStep.length === 0 && <EmptyRow colSpan={5} text={t("productStepValues", "noStepParams")} />}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ParamRow({
  param,
  productId,
  override,
  onCreate,
  onSave,
  onDelete,
}: {
  param: StepParam;
  productId: number;
  override: ProductStepParam | null;
  onCreate: (value: Partial<ProductStepParam>) => Promise<void>;
  onSave: (id: number, value: Partial<ProductStepParam>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(override?.value || "");

  async function save() {
    if (!value.trim()) {
      toast.error(t("productStepValues", "valueRequired"));
      return;
    }

    if (override) {
      await onSave(override.id, { product_id: productId, step_param_id: param.id, value: value.trim() });
    } else {
      await onCreate({ product_id: productId, step_param_id: param.id, value: value.trim() });
    }
  }

  return (
    <tr className="border-t border-slate-50">
      <Td>{param.param_name}</Td>
      <Td>{param.param_type}</Td>
      <Td>{param.default_value || "-"}</Td>
      <Td><input className={cellInputClass} value={value} onChange={(event) => setValue(event.target.value)} /></Td>
      <Td>
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => void save()} className={iconButtonClass} title={t("actions", "save")} aria-label={t("actions", "save")}>
            <Save className="h-4 w-4" />
          </button>
          {override && (
            <button type="button" onClick={() => void onDelete(override.id)} className={dangerIconButtonClass} title={t("productStepValues", "deleteProductValue")} aria-label={t("productStepValues", "deleteProductValue")}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
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

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-violet-500">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2 text-sm text-slate-700">{children}</td>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className="py-8 text-center text-sm text-slate-400">{text}</td></tr>;
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

const inputClass = "h-10 w-full rounded-lg border border-violet-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const cellInputClass = "h-9 w-full rounded-lg border border-violet-100 bg-white px-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const iconButtonClass = "flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-100";
const dangerIconButtonClass = "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600";
