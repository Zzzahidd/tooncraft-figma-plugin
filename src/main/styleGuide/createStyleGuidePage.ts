import type { Ramp, Swatch } from "../../shared/types";
import { hexToFigmaRgb } from "../hexToFigmaRgb";

const DEDICATED_PAGE_NAME = "🎨 Color System";
const CARD_WIDTH = 220;
const SWATCH_HEIGHT = 96;

const FONT_REGULAR: FontName = { family: "Inter", style: "Regular" };
const FONT_MEDIUM: FontName = { family: "Inter", style: "Medium" };

// Off-white / off-black — matches the "no pure black or white" rule
// applied everywhere else in this plugin, including generated artifacts.
const CARD_BG: RGB = { r: 0.995, g: 0.995, b: 0.997 };
const PAGE_BG: RGB = { r: 0.965, g: 0.965, b: 0.975 };
const TEXT_COLOR: RGB = { r: 0.09, g: 0.09, b: 0.11 };
const MUTED_COLOR: RGB = { r: 0.45, g: 0.45, b: 0.5 };
const BORDER_COLOR: RGB = { r: 0.89, g: 0.89, b: 0.91 };

function passLabel(ratio: number, threshold: number): string {
  return ratio >= threshold ? "Pass" : "Fail";
}

function makeText(characters: string, font: FontName, size: number, fill: RGB): TextNode {
  const text = figma.createText();
  text.fontName = font;
  text.fontSize = size;
  text.characters = characters;
  text.fills = [{ type: "SOLID", color: fill }];
  return text;
}

function createSwatchCard(rampName: string, swatch: Swatch): FrameNode {
  const card = figma.createFrame();
  card.name = `${rampName}/${swatch.step}`;
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.resize(CARD_WIDTH, card.height);
  card.itemSpacing = 8;
  card.paddingBottom = 16;
  card.fills = [{ type: "SOLID", color: CARD_BG }];
  card.cornerRadius = 12;
  card.clipsContent = true;
  card.strokes = [{ type: "SOLID", color: BORDER_COLOR }];
  card.strokeWeight = 1;

  const swatchRect = figma.createRectangle();
  swatchRect.name = "swatch";
  swatchRect.resize(CARD_WIDTH, SWATCH_HEIGHT);
  swatchRect.fills = [{ type: "SOLID", color: hexToFigmaRgb(swatch.hex) }];
  swatchRect.layoutAlign = "STRETCH";
  card.appendChild(swatchRect);

  const body = figma.createFrame();
  body.name = "body";
  body.layoutMode = "VERTICAL";
  body.primaryAxisSizingMode = "AUTO";
  body.counterAxisSizingMode = "FIXED";
  body.resize(CARD_WIDTH - 32, body.height);
  body.itemSpacing = 4;
  body.paddingLeft = 16;
  body.paddingRight = 16;
  body.paddingTop = 12;
  body.fills = [];
  body.layoutAlign = "STRETCH";

  const title = makeText(`${rampName} / ${swatch.step}`, FONT_MEDIUM, 13, TEXT_COLOR);
  const hex = makeText(swatch.hex.toUpperCase(), FONT_REGULAR, 12, MUTED_COLOR);
  const rgb = makeText(`rgb(${swatch.rgb.r}, ${swatch.rgb.g}, ${swatch.rgb.b})`, FONT_REGULAR, 11, MUTED_COLOR);
  const hsl = makeText(`hsl(${swatch.hsl.h}, ${swatch.hsl.s}%, ${swatch.hsl.l}%)`, FONT_REGULAR, 11, MUTED_COLOR);
  const oklch = makeText(
    `oklch(${swatch.oklch.l} ${swatch.oklch.c} ${swatch.oklch.h})`,
    FONT_REGULAR,
    11,
    MUTED_COLOR,
  );
  const contrast = makeText(
    `${swatch.contrast.onWhite}:1 on white (${passLabel(swatch.contrast.onWhite, 4.5)} AA) · ` +
      `${swatch.contrast.onBlack}:1 on black (${passLabel(swatch.contrast.onBlack, 4.5)} AA)`,
    FONT_REGULAR,
    10,
    MUTED_COLOR,
  );

  [title, hex, rgb, hsl, oklch, contrast].forEach((node) => body.appendChild(node));
  card.appendChild(body);

  return card;
}

function createRampSection(ramp: Ramp): FrameNode {
  const section = figma.createFrame();
  section.name = `Color/${ramp.name}`;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.itemSpacing = 16;
  section.fills = [];

  const heading = makeText(
    `${ramp.name} — ${ramp.algorithm === "material-hct" ? "Material Design 3 (HCT)" : "Tailwind-style (OKLCH)"}`,
    FONT_MEDIUM,
    18,
    TEXT_COLOR,
  );
  section.appendChild(heading);

  const row = figma.createFrame();
  row.name = `${ramp.name} swatches`;
  row.layoutMode = "HORIZONTAL";
  row.layoutWrap = "WRAP";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.resize(1200, row.height);
  row.itemSpacing = 16;
  row.counterAxisSpacing = 16;
  row.fills = [];

  for (const swatch of ramp.swatches) {
    row.appendChild(createSwatchCard(ramp.name, swatch));
  }
  section.appendChild(row);

  return section;
}

function createGenerationSection(): FrameNode {
  const section = figma.createFrame();
  section.name = "Tonecraft Color Style Guide";
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.itemSpacing = 32;
  section.paddingTop = 48;
  section.paddingBottom = 48;
  section.paddingLeft = 48;
  section.paddingRight = 48;
  section.fills = [{ type: "SOLID", color: PAGE_BG }];
  section.setPluginData("tonecraftStyleGuide", "color");
  return section;
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

/**
 * Adds one row per ramp to the persistent card container on the requested
 * page target, WITHOUT switching `figma.currentPage` — nodes are created
 * wherever the plugin happens to be running and explicitly reparented via
 * `appendChild`, which avoids ever needing the async page-switch dance and
 * doesn't yank the user's viewport away from what they were doing.
 *
 * Every call creates a new, top-level guide frame, including when the same
 * ramp name is generated again. This keeps every color system independent
 * on the Figma canvas instead of nesting runs in one long guide.
 */
export async function createStyleGuideRows(
  target: "current" | "dedicated",
  ramps: Ramp[],
): Promise<void> {
  await figma.loadFontAsync(FONT_REGULAR);
  await figma.loadFontAsync(FONT_MEDIUM);

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

  const generation = createGenerationSection();
  for (const ramp of ramps) {
    generation.appendChild(createRampSection(ramp));
  }
  targetPage.appendChild(generation);
  generation.x = guideX;
}
