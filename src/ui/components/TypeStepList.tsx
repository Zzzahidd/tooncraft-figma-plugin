import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, GripVertical, X } from "lucide-react";
import { useTonecraftStore } from "../state/store";
import { categorizeStepName } from "../../type/typeScale";
import { BREAKPOINT_LABELS } from "../../shared/types";
import type { Breakpoint, TypeStepInput } from "../../shared/types";

function MetricInputs({
  stepName,
  label,
  px,
  lineHeight,
  onPxChange,
  onLineHeightChange,
}: {
  stepName: string;
  label: string;
  px: number;
  lineHeight: number;
  onPxChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
}) {
  const [pxDraft, setPxDraft] = useState(String(px));
  const [lineHeightDraft, setLineHeightDraft] = useState(String(lineHeight));

  useEffect(() => setPxDraft(String(px)), [px]);
  useEffect(() => setLineHeightDraft(String(lineHeight)), [lineHeight]);

  function commitPx(raw: string) {
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 1) onPxChange(value);
  }

  function commitLineHeight(raw: string) {
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0.5) onLineHeightChange(value);
  }

  return (
    <div className="type-step-metric-row">
      <span className="type-step-metric-tag">{label}</span>
      <input
        type="number"
        min={1}
        value={pxDraft}
        onChange={(e) => {
          setPxDraft(e.target.value);
          commitPx(e.target.value);
        }}
        onBlur={() => {
          if (!pxDraft || Number(pxDraft) < 1) setPxDraft(String(px));
        }}
        aria-label={`${stepName || "Step"} ${label} size in pixels`}
      />
      <span className="type-step-metric-unit">px</span>
      <input
        type="number"
        min={0.5}
        step={0.05}
        value={lineHeightDraft}
        onChange={(e) => {
          setLineHeightDraft(e.target.value);
          commitLineHeight(e.target.value);
        }}
        onBlur={() => {
          if (!lineHeightDraft || Number(lineHeightDraft) < 0.5) setLineHeightDraft(String(lineHeight));
        }}
        aria-label={`${stepName || "Step"} ${label} line height`}
      />
      <span className="type-step-metric-unit">line</span>
    </div>
  );
}

function StepCard({ step }: { step: TypeStepInput }) {
  const activeBreakpoints = useTonecraftStore((s) => s.activeBreakpoints);
  const typeFonts = useTonecraftStore((s) => s.typeFonts);
  const updateTypeStep = useTonecraftStore((s) => s.updateTypeStep);
  const updateTypeStepValue = useTonecraftStore((s) => s.updateTypeStepValue);
  const removeTypeStep = useTonecraftStore((s) => s.removeTypeStep);
  const reorderTypeSteps = useTonecraftStore((s) => s.reorderTypeSteps);
  const typeSteps = useTonecraftStore((s) => s.typeSteps);
  const [isDragOver, setIsDragOver] = useState(false);

  const { category } = categorizeStepName(step.name);

  return (
    <div
      className={`type-step-card${isDragOver ? " is-drag-over" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", step.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const fromId = e.dataTransfer.getData("text/plain");
        if (fromId) reorderTypeSteps(fromId, step.id);
      }}
    >
      <div className="type-step-card-header">
        <span className="drag-handle" aria-hidden="true" title="Drag to reorder">
          <GripVertical size={14} />
        </span>
        <input
          type="text"
          className="entry-name"
          value={step.name}
          onChange={(e) => updateTypeStep(step.id, { name: e.target.value })}
          placeholder="H1, Body, Label…"
          spellCheck={false}
          aria-label="Step name"
        />
        <div className="type-step-font-options" role="group" aria-label={`${step.name || "Step"} font styles`}>
          {typeFonts.map((font) => {
            const selected = step.fontEntryIds.includes(font.id);
            const onlySelected = selected && step.fontEntryIds.length === 1;
            return (
              <button
                key={font.id}
                type="button"
                className={`type-step-font-option${selected ? " active" : ""}`}
                aria-pressed={selected}
                disabled={onlySelected}
                title={onlySelected ? "Choose another style before removing this one" : `${selected ? "Remove" : "Add"} ${font.family} ${font.weight}`}
                onClick={() =>
                  updateTypeStep(step.id, {
                    fontEntryIds: selected
                      ? step.fontEntryIds.filter((id) => id !== font.id)
                      : [...step.fontEntryIds, font.id],
                  })
                }
              >
                {font.family} {font.weight}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => removeTypeStep(step.id)}
          disabled={typeSteps.length === 1}
          aria-label={`Remove ${step.name || "step"}`}
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>

      {category === "heading" ? (
        activeBreakpoints.map((bp: Breakpoint) => {
          const value = step.byBreakpoint[bp] ?? { px: step.single.px, lineHeight: step.single.lineHeight };
          return (
            <MetricInputs
              key={bp}
              stepName={step.name}
              label={BREAKPOINT_LABELS[bp]}
              px={value.px}
              lineHeight={value.lineHeight}
              onPxChange={(px) => updateTypeStepValue(step.id, bp, { px })}
              onLineHeightChange={(lineHeight) => updateTypeStepValue(step.id, bp, { lineHeight })}
            />
          );
        })
      ) : (
        <MetricInputs
          stepName={step.name}
          label="Size"
          px={step.single.px}
          lineHeight={step.single.lineHeight}
          onPxChange={(px) => updateTypeStepValue(step.id, "single", { px })}
          onLineHeightChange={(lineHeight) => updateTypeStepValue(step.id, "single", { lineHeight })}
        />
      )}
    </div>
  );
}

export function TypeStepList() {
  const typeSteps = useTonecraftStore((s) => s.typeSteps);
  const addLargerTypeStep = useTonecraftStore((s) => s.addLargerTypeStep);
  const addSmallerTypeStep = useTonecraftStore((s) => s.addSmallerTypeStep);

  return (
    <div className="section">
      <p className="section-label">Type sizes</p>
      <p className="field-hint">
        Choose the font styles each size should create. Drag to reorder; only H1-H6 use separate breakpoint values.
      </p>

      <button type="button" className="add-color-button" onClick={addLargerTypeStep}>
        <ChevronUp size={14} />
        Add larger step
      </button>

      <div className="type-step-grid">
        {typeSteps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>

      <button type="button" className="add-color-button" onClick={addSmallerTypeStep}>
        <ChevronDown size={14} />
        Add smaller step
      </button>
    </div>
  );
}
