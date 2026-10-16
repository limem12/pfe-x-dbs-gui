"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SequenceStep } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { useStore } from "@/lib/store-api";
import { useTranslation } from "@/lib/useTranslation";

export default function SequenceStepsOrderTab() {
  const {
    sequencesConfig,
    stepConfigs,
    sequenceSteps,
    addSequenceStep,
    updateSequenceStep,
    deleteSequenceStep,
  } = useStore();
  const { canManageUsers } = usePermissions();
  const { t } = useTranslation();
  const [selectedSequenceId, setSelectedSequenceId] = useState<number>(0);
  const [selectedStepId, setSelectedStepId] = useState<number>(0);

  const activeSequenceId = selectedSequenceId || sequencesConfig[0]?.id || 0;

  const activeSequence = useMemo(
    () => sequencesConfig.find((sequence) => sequence.id === activeSequenceId) || null,
    [activeSequenceId, sequencesConfig],
  );

  const links = useMemo(
    () =>
      sequenceSteps
        .filter((link) => link.sequence_id === activeSequenceId)
        .sort((left, right) => left.order_index - right.order_index || left.id - right.id),
    [activeSequenceId, sequenceSteps],
  );

  const availableSteps = useMemo(
    () => stepConfigs.filter((step) => !links.some((link) => link.step_id === step.id)),
    [links, stepConfigs],
  );

  if (!canManageUsers()) {
    return <Unauthorized />;
  }

  async function persistOrder(nextLinks: SequenceStep[]) {
    await Promise.all(
      nextLinks.map((link, index) =>
        updateSequenceStep(link.id, { order_index: index + 1 }),
      ),
    );
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    const nextLinks = [...links];
    const [moved] = nextLinks.splice(result.source.index, 1);
    nextLinks.splice(result.destination.index, 0, moved);

    try {
      await persistOrder(nextLinks);
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  async function addLink() {
    if (!activeSequenceId || !selectedStepId) {
      toast.error(t("common", "selectSequenceAndStep"));
      return;
    }

    if (links.some((link) => link.step_id === selectedStepId)) {
      toast.error(t("common", "stepAlreadyLinked"));
      return;
    }

    try {
      await addSequenceStep({
        sequence_id: activeSequenceId,
        step_id: selectedStepId,
        order_index: links.length + 1,
      });
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  async function removeLink(link: SequenceStep) {
    const remaining = links.filter((item) => item.id !== link.id);

    try {
      await deleteSequenceStep(link.id);
      await persistOrder(remaining);
    } catch {
      // Le store affiche deja l'erreur.
    }
  }

  const headerTitle = activeSequence
    ? `Ordre des steps - ${activeSequence.name}`
    : "Ordre des steps";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
            <ArrowDown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{headerTitle}</h2>
            <p className="text-sm text-slate-400">
              {links.length} step{links.length > 1 ? "s" : ""} ordonne{links.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <Label text="Sequence">
            <select
              value={activeSequenceId}
              onChange={(event) => setSelectedSequenceId(Number(event.target.value))}
              className={inputClass}
            >
              {sequencesConfig.map((sequence) => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name}
                </option>
              ))}
            </select>
          </Label>

          <Label text="Step a ajouter">
            <select
              value={selectedStepId || stepConfigs[0]?.id || 0}
              onChange={(event) => setSelectedStepId(Number(event.target.value))}
              className={inputClass}
            >
              {availableSteps.length === 0 ? (
                <option value={0}>{t("common", "noStepAvailable")}</option>
              ) : (
                availableSteps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.name}
                  </option>
                ))
              )}
            </select>
          </Label>

          <button
            type="button"
            onClick={() => void addLink()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200"
          >
            <Plus className="h-4 w-4" />
            Ajouter a la sequence
          </button>

          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3 text-xs text-slate-500">
            Glissez les elements dans la liste de droite pour changer leur ordre.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {links.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sequence-step-order">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {links.map((link, index) => {
                      const step = stepConfigs.find((item) => item.id === link.step_id);

                      return (
                        <Draggable key={link.id} draggableId={String(link.id)} index={index}>
                          {(draggableProvided, snapshot) => (
                            <article
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all ${
                                snapshot.isDragging
                                  ? "border-violet-300 bg-violet-50 shadow-md"
                                  : "border-slate-100 bg-white hover:border-violet-200"
                              }`}
                            >
                              <span
                                {...draggableProvided.dragHandleProps}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-sm font-bold text-white">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">
                                  {step?.name || `Step ${link.step_id}`}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {step?.description || "Aucune description"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                                  ordre {link.order_index}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentIndex = index;
                                    if (currentIndex === 0) return;
                                    const nextLinks = [...links];
                                    const [item] = nextLinks.splice(currentIndex, 1);
                                    nextLinks.splice(currentIndex - 1, 0, item);
                                    void persistOrder(nextLinks);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-700"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentIndex = index;
                                    if (currentIndex === links.length - 1) return;
                                    const nextLinks = [...links];
                                    const [item] = nextLinks.splice(currentIndex, 1);
                                    nextLinks.splice(currentIndex + 1, 0, item);
                                    void persistOrder(nextLinks);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-700"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeLink(link)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </article>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/20 py-16 text-center text-sm text-slate-400">
              Aucun step n&apos;est encore ordonne pour cette sequence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
        {text}
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

const inputClass =
  "h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
