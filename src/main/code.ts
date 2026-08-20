/// <reference types="@figma/plugin-typings" />
import type {
  CollectionSummary,
  GenerateRequest,
  MainToUiMessage,
  TypeGenerateRequest,
  UiToMainMessage,
} from "../shared/types";
import { createVariableCollection } from "./variables/createVariableCollection";
import { createPaintStyles } from "./styles/createPaintStyles";
import { createStyleGuideRows } from "./styleGuide/createStyleGuidePage";
import { createTypeVariables } from "./typography/createTypeVariables";
import { createTextStyles } from "./typography/createTextStyles";
import { createTypeStyleGuideRows } from "./typography/createTypeStyleGuidePage";

figma.showUI(__html__, { width: 900, height: 640, themeColors: true });

function postToUi(message: MainToUiMessage): void {
  figma.ui.postMessage(message);
}

async function handleGenerate(request: GenerateRequest): Promise<void> {
  try {
    let variableCount = 0;
    let styleCount = 0;

    if (request.mode === "variables" || request.mode === "both") {
      const result = await createVariableCollection(
        request.collectionName,
        request.ramps,
        request.createDarkMode,
        (percent, label) => postToUi({ type: "progress", payload: { percent: percent / 3, label } }),
      );
      variableCount = result.variableCount;
    }

    if (request.mode === "styles" || request.mode === "both") {
      styleCount = await createPaintStyles(request.collectionName, request.ramps, (percent, label) =>
        postToUi({
          type: "progress",
          payload: { percent: 33 + percent / 3, label },
        }),
      );
    }

    if (request.styleGuideTarget !== "none") {
      postToUi({ type: "progress", payload: { percent: 70, label: "Building color card" } });
      await createStyleGuideRows(request.styleGuideTarget, request.ramps);
    }

    postToUi({
      type: "generate-complete",
      payload: { collectionName: request.collectionName, variableCount, styleCount },
    });
    figma.notify(`Tonecraft: created ${variableCount} variables and ${styleCount} styles.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating.";
    postToUi({ type: "generate-error", payload: { message } });
    figma.notify(`Tonecraft error: ${message}`, { error: true });
  }
}

async function handleGenerateType(request: TypeGenerateRequest): Promise<void> {
  try {
    let variableCount = 0;
    let styleCount = 0;

    if (request.mode === "variables" || request.mode === "both") {
      const result = await createTypeVariables(request.collectionName, request.fontCollectionName, request.scale, (percent, label) =>
        postToUi({ type: "progress", payload: { percent: percent / 3, label } }),
      );
      variableCount = result.variableCount;
    }

    if (request.mode === "styles" || request.mode === "both") {
      styleCount = await createTextStyles(request.collectionName, request.scale, (percent, label) =>
        postToUi({ type: "progress", payload: { percent: 33 + percent / 3, label } }),
      );
    }

    if (request.styleGuideTarget !== "none") {
      postToUi({ type: "progress", payload: { percent: 70, label: "Building type card" } });
      await createTypeStyleGuideRows(request.styleGuideTarget, request.scale);
    }

    postToUi({
      type: "generate-complete",
      payload: { collectionName: request.collectionName, variableCount, styleCount },
    });
    figma.notify(`Tonecraft: created ${variableCount} variables and ${styleCount} text styles.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating.";
    postToUi({ type: "generate-error", payload: { message } });
    figma.notify(`Tonecraft error: ${message}`, { error: true });
  }
}

async function handleListCollections(): Promise<void> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const summaries: CollectionSummary[] = await Promise.all(
    collections.map(async (collection) => {
      const variables = await Promise.all(
        collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
      );
      const groupNames = new Set<string>();
      for (const variable of variables) {
        if (variable?.name.includes("/")) {
          groupNames.add(variable.name.split("/")[0]);
        }
      }
      return { name: collection.name, groupNames: Array.from(groupNames) };
    }),
  );

  postToUi({ type: "collections-list", payload: { collections: summaries } });
}

figma.ui.onmessage = (message: UiToMainMessage) => {
  switch (message.type) {
    case "generate":
      void handleGenerate(message.payload);
      break;
    case "generate-type":
      void handleGenerateType(message.payload);
      break;
    case "list-collections":
      void handleListCollections();
      break;
    case "cancel":
      figma.closePlugin();
      break;
  }
};
