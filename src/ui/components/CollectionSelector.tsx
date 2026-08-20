import type { CollectionMode } from "../state/store";
import type { CollectionSummary } from "../../shared/types";

interface CollectionSelectorProps {
  collectionMode: CollectionMode;
  setCollectionMode: (mode: CollectionMode) => void;
  existingCollections: CollectionSummary[];
  selectedCollectionName: string | null;
  setSelectedCollectionName: (name: string | null) => void;
  newCollectionName: string;
  setNewCollectionName: (name: string) => void;
  /** What's being organized — changes the hint copy ("primitives" vs
   * "type scales") without changing the picker's actual behavior. */
  itemsLabel: string;
  title?: string;
  idPrefix?: string;
  newNameLabel?: string;
  embedded?: boolean;
}

/**
 * Existing/new collection picker. Shared verbatim between the color and
 * type-scale screens via props — a Figma Variable Collection isn't
 * type-restricted, so the same picker UI and behavior apply to both;
 * duplicating this component per domain would just be two copies of the
 * same logic drifting apart.
 */
export function CollectionSelector({
  collectionMode,
  setCollectionMode,
  existingCollections,
  selectedCollectionName,
  setSelectedCollectionName,
  newCollectionName,
  setNewCollectionName,
  itemsLabel,
  title = "Collection",
  idPrefix = "collection",
  newNameLabel = "New collection name",
  embedded = false,
}: CollectionSelectorProps) {
  const selected = existingCollections.find((c) => c.name === selectedCollectionName);

  return (
    <div className={embedded ? "collection-selector-embedded" : "section"}>
      <p className="section-label">{title}</p>
      <div className="field">
        <div className="segmented" role="tablist" aria-label={`${title} target`}>
          <button
            type="button"
            role="tab"
            aria-selected={collectionMode === "existing"}
            className={collectionMode === "existing" ? "active" : ""}
            onClick={() => setCollectionMode("existing")}
            disabled={existingCollections.length === 0}
          >
            Use existing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={collectionMode === "new"}
            className={collectionMode === "new" ? "active" : ""}
            onClick={() => setCollectionMode("new")}
          >
            Create new
          </button>
        </div>
      </div>

      {collectionMode === "existing" ? (
        existingCollections.length > 0 ? (
          <div className="field">
            <select
              value={selectedCollectionName ?? ""}
              onChange={(e) => setSelectedCollectionName(e.target.value)}
              aria-label={`Existing ${title.toLowerCase()}`}
            >
              {existingCollections.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="field-hint">
              {selected && selected.groupNames.length > 0
                ? `Already contains: ${selected.groupNames.join(", ")}`
                : `Empty so far — your ${itemsLabel} will be the first groups in it.`}
            </p>
          </div>
        ) : (
          <p className="field-hint">No collections in this file yet — create one below.</p>
        )
      ) : (
        <div className="field">
          <label htmlFor={`${idPrefix}-new-name`}>{newNameLabel}</label>
          <input
            id={`${idPrefix}-new-name`}
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Design Tokens"
          />
          <p className="field-hint">Stores your {itemsLabel}.</p>
        </div>
      )}
    </div>
  );
}
