import { roundToGrid } from "../../type/typeScale";
import { BREAKPOINT_LABELS } from "../../shared/types";
import type { Breakpoint, ResolvedTypeStep, TypeScaleResult } from "../../shared/types";

const DEDICATED_PAGE_NAME = "🔤 Type System";
const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

const LABEL_FONT: FontName = { family: "Inter", style: "Regular" };
const HEADING_FONT: FontName = { family: "Inter", style: "Medium" };
const ROLE_FONT: FontName = { family: "Inter", style: "Bold" };
const TAG_FONT: FontName = { family: "Inter", style: "Medium" };

const CARD_BG: RGB = { r: 0.995, g: 0.995, b: 0.997 };
const TEXT_COLOR: RGB = { r: 0.09, g: 0.09, b: 0.11 };
const MUTED_COLOR: RGB = { r: 0.45, g: 0.45, b: 0.5 };
const BORDER_COLOR: RGB = { r: 0.89, g: 0.89, b: 0.91 };
const GROUP_BG: RGB = { r: 0.965, g: 0.965, b: 0.975 };
const GUIDE_PADDING = 48;
const MIN_GUIDE_WIDTH = 720;


function makeLabel(characters: string, font: FontName, size: number, fill: RGB): TextNode {
  const text = figma.createText();
  text.fontName = font;
  text.fontSize = size;
  text.characters = characters;
  text.fills = [{ type: "SOLID", color: fill }];
  return text;
}

function createBreakpointColumn(
  step: ResolvedTypeStep,
  bp: Breakpoint,
  fontStyle: FontName,
  gridSize: number,
  columnWidth: number,
): FrameNode {
  const value = step.byBreakpoint[bp]!;
  const column = figma.createFrame();
  column.name = bp;
  column.layoutMode = "VERTICAL";
  column.primaryAxisSizingMode = "AUTO";
  column.counterAxisSizingMode = "FIXED";
  column.resize(columnWidth, column.height);
  column.itemSpacing = 8;
  column.paddingTop = 12;
  column.paddingBottom = 12;
  column.paddingLeft = 14;
  column.paddingRight = 14;
  column.cornerRadius = 8;
  column.fills = [{ type: "SOLID", color: CARD_BG }];
  column.strokes = [{ type: "SOLID", color: BORDER_COLOR }];
  column.strokeWeight = 1;

  const tag = makeLabel(BREAKPOINT_LABELS[bp], TAG_FONT, 10, TEXT_COLOR);
  column.appendChild(tag);

  const metrics = makeLabel(
    `${value.px}px · ${value.rem}rem · ${roundToGrid(value.lineHeight * value.px, gridSize)}px line`,
    LABEL_FONT,
    10,
    MUTED_COLOR,
  );
  column.appendChild(metrics);

  const sample = figma.createText();
  sample.name = "sample";
  sample.fontName = fontStyle;
  sample.fontSize = Math.min(value.px, 64); // cap render size so huge desktop steps don't blow up the card
  sample.lineHeight = { value: roundToGrid(value.lineHeight * value.px, gridSize), unit: "PIXELS" };
  sample.characters = SAMPLE_TEXT;
  sample.fills = [{ type: "SOLID", color: TEXT_COLOR }];
  sample.textAutoResize = "HEIGHT";
  sample.resize(columnWidth - 28, sample.height);
  column.appendChild(sample);

  return column;
}

async function createStepRow(
  scale: TypeScaleResult,
  step: ResolvedTypeStep,
  font: { family: string; weight: string },
  rowWidth: number,
): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = `${step.group}/${step.name}/${font.family} ${font.weight}`;
  row.layoutMode = "VERTICAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "FIXED";
  row.resize(rowWidth, row.height);
  row.itemSpacing = 10;
  row.paddingTop = 16;
  row.paddingBottom = 16;
  row.paddingLeft = 20;
  row.paddingRight = 20;
  row.fills = [{ type: "SOLID", color: CARD_BG }];
  row.cornerRadius = 10;
  row.strokes = [{ type: "SOLID", color: BORDER_COLOR }];
  row.strokeWeight = 1;

  const roleBadge = makeLabel(
    `${step.name}   ·   ${font.family} ${font.weight}`,
    ROLE_FONT,
    12,
    TEXT_COLOR,
  );
  row.appendChild(roleBadge);

  const fontStyle: FontName = { family: font.family, style: font.weight };

  if (step.category === "heading") {
    // Keep responsive values side by side while using the same neutral
    // treatment as the body samples.
    const columns = figma.createFrame();
    columns.name = "breakpoints";
    columns.layoutMode = "HORIZONTAL";
    columns.layoutWrap = "WRAP";
    columns.primaryAxisSizingMode = "AUTO";
    columns.counterAxisSizingMode = "FIXED";
    columns.resize(rowWidth - 40, columns.height);
    columns.itemSpacing = 12;
    columns.counterAxisSpacing = 12;
    columns.fills = [];

    const columnWidth = Math.floor(
      (rowWidth - 40 - 12 * (scale.activeBreakpoints.length - 1)) / scale.activeBreakpoints.length,
    );
    for (const bp of scale.activeBreakpoints) {
      if (step.byBreakpoint[bp]) {
        columns.appendChild(await createBreakpointColumn(step, bp, fontStyle, scale.gridSize, columnWidth));
      }
    }
    row.appendChild(columns);
  } else {
    const value = step.single;
    const metrics = makeLabel(
      `${value.px}px · ${value.rem}rem · ${roundToGrid(value.lineHeight * value.px, scale.gridSize)}px line`,
      LABEL_FONT,
      10,
      MUTED_COLOR,
    );
    row.appendChild(metrics);

    const sample = figma.createText();
    sample.name = "sample";
    sample.fontName = fontStyle;
    sample.fontSize = value.px;
    sample.lineHeight = { value: roundToGrid(value.lineHeight * value.px, scale.gridSize), unit: "PIXELS" };
    sample.characters = SAMPLE_TEXT;
    sample.fills = [{ type: "SOLID", color: TEXT_COLOR }];
    sample.textAutoResize = "HEIGHT";
    sample.resize(rowWidth - 40, sample.height);
    row.appendChild(sample);
  }

  return row;
}

function nextGuideX(targetPage: PageNode): number {
  const guides = targetPage.children.filter(
    (node) =>
      node.getPluginData("tonecraftStyleGuide") !== "" ||
      node.getPluginData("tonecraftTypeStyleGuide") !== "",
  );
  return guides.length === 0 ? 0 : Math.max(...guides.map((guide) => guide.x + guide.width)) + 80;
}

/** Ensures dynamic-page children are loaded before the new guide is added. */
async function loadTargetPage(targetPage: PageNode): Promise<void> {
  await targetPage.loadAsync();
}

function createGenerationSection(guideWidth: number): FrameNode {
  const section = figma.createFrame();
  section.name = "Tonecraft Type Style Guide";
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "FIXED";
  section.resize(guideWidth, section.height);
  section.itemSpacing = 32;
  section.paddingTop = 48;
  section.paddingBottom = 48;
  section.paddingLeft = 48;
  section.paddingRight = 48;
  section.fills = [{ type: "SOLID", color: GROUP_BG }];
  section.setPluginData("tonecraftTypeStyleGuide", "true");
  return section;
}

function createGroupSection(groupName: string, groupWidth: number): FrameNode {
  const section = figma.createFrame();
  section.name = `tonecraft-type-group-section:${groupName}`;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "FIXED";
  section.resize(groupWidth, section.height);
  section.itemSpacing = 10;
  section.fills = [];
  section.setPluginData("tonecraftTypeGroupSection", groupName);

  const heading = makeLabel(groupName, HEADING_FONT, 16, TEXT_COLOR);
  section.appendChild(heading);
  return section;
}

/**
 * Creates a new top-level type guide for every generation, grouped by
 * category (Heading / Body / each custom name). Prior guides are preserved
 * as independent Figma canvas frames.
 */
export async function createTypeStyleGuideRows(
  target: "current" | "dedicated",
  scale: TypeScaleResult,
): Promise<void> {
  await figma.loadFontAsync(LABEL_FONT);
  await figma.loadFontAsync(HEADING_FONT);
  await figma.loadFontAsync(ROLE_FONT);
  const fontsToLoad = new Map(scale.fonts.map((f) => [`${f.family}::${f.weight}`, f]));
  for (const font of fontsToLoad.values()) {
    await figma.loadFontAsync({ family: font.family, style: font.weight });
  }

  let targetPage: PageNode;
  if (target === "dedicated") {
    const existingPage = figma.root.children.find((p) => p.name === DEDICATED_PAGE_NAME);
    targetPage = existingPage ?? figma.createPage();
    targetPage.name = DEDICATED_PAGE_NAME;
  } else {
    targetPage = figma.currentPage;
  }

  await loadTargetPage(targetPage);
  const guideX = nextGuideX(targetPage);
  const guideWidth = Math.max(MIN_GUIDE_WIDTH, scale.activeBreakpoints.length * 304 + GUIDE_PADDING * 2);
  const groupWidth = guideWidth - GUIDE_PADDING * 2;

  const groups = new Map<string, ResolvedTypeStep[]>();
  for (const step of scale.steps) {
    const list = groups.get(step.group) ?? [];
    list.push(step);
    groups.set(step.group, list);
  }

  const generation = createGenerationSection(guideWidth);
  for (const [groupName, steps] of groups) {
    const section = createGroupSection(groupName, groupWidth);
    for (const step of steps) {
      for (const font of step.fontStyles) {
        section.appendChild(await createStepRow(scale, step, font, groupWidth));
      }
    }
    generation.appendChild(section);
  }
  targetPage.appendChild(generation);
  generation.x = guideX;
}
