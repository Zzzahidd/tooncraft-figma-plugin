import type { ResolvedTypeStep, TypeScaleResult } from "../../shared/types";
import { BREAKPOINT_LABELS } from "../../shared/types";
import type { Breakpoint } from "../../shared/types";

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

interface BigTypePreviewProps {
  scale: TypeScaleResult | null;
}

function StepPreviewRow({ step, activeBreakpoints }: { step: ResolvedTypeStep; activeBreakpoints: Breakpoint[] }) {
  return (
    <div className="big-type-row">
      <span className="big-type-role">{step.name}</span>
      {step.fontStyles.map((font) =>
        step.category === "heading" ? (
          <div className="big-type-style" key={font.id}>
            <span className="big-type-font">{font.family} {font.weight}</span>
            <div className="big-type-breakpoints">
              {activeBreakpoints.map((bp) => {
                const value = step.byBreakpoint[bp];
                if (!value) return null;
                return (
                  <div className="big-type-bp-block" key={bp}>
                    <span className={`big-type-bp-tag big-type-bp-tag-${bp}`}>{BREAKPOINT_LABELS[bp]}</span>
                    <span className="big-type-px">{value.px}px · {value.rem}rem · {value.lineHeight}× line</span>
                    <p className="big-type-sample" style={{ fontSize: `${Math.min(value.px, 44)}px`, lineHeight: `${value.lineHeight * Math.min(value.px, 44)}px`, fontFamily: font.family, fontWeight: font.weight }}>
                      {SAMPLE_TEXT}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="big-type-style" key={font.id}>
            <span className="big-type-font">{font.family} {font.weight}</span>
            <span className="big-type-px">{step.single.px}px · {step.single.rem}rem · {step.single.lineHeight}× line</span>
            <p className="big-type-sample" style={{ fontSize: `${step.single.px}px`, lineHeight: `${step.single.lineHeight * step.single.px}px`, fontFamily: font.family, fontWeight: font.weight }}>
              {SAMPLE_TEXT}
            </p>
          </div>
        ),
      )}
    </div>
  );
}

export function BigTypePreview({ scale }: BigTypePreviewProps) {
  if (!scale || scale.steps.length === 0) {
    return (
      <div className="preview-empty">
        <p>Add a step to preview the type scale.</p>
      </div>
    );
  }

  const groups = new Map<string, ResolvedTypeStep[]>();
  for (const step of scale.steps) {
    const list = groups.get(step.group) ?? [];
    list.push(step);
    groups.set(step.group, list);
  }

  return (
    <div className="big-type-preview">
      {Array.from(groups.entries()).map(([groupName, steps]) => (
        <div className="big-type-group" key={groupName}>
          <p className="big-type-group-label">{groupName}</p>
          {steps.map((step) => (
            <StepPreviewRow key={step.id} step={step} activeBreakpoints={scale.activeBreakpoints} />
          ))}
        </div>
      ))}
    </div>
  );
}
