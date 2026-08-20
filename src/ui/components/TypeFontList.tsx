import { Plus, X } from "lucide-react";
import { useTonecraftStore } from "../state/store";
import { CollectionSelector } from "./CollectionSelector";

export function TypeFontList() {
  const typeFonts = useTonecraftStore((s) => s.typeFonts);
  const addTypeFont = useTonecraftStore((s) => s.addTypeFont);
  const updateTypeFont = useTonecraftStore((s) => s.updateTypeFont);
  const removeTypeFont = useTonecraftStore((s) => s.removeTypeFont);
  const existingCollections = useTonecraftStore((s) => s.existingCollections);
  const typeFontCollectionMode = useTonecraftStore((s) => s.typeFontCollectionMode);
  const setTypeFontCollectionMode = useTonecraftStore((s) => s.setTypeFontCollectionMode);
  const typeFontSelectedCollectionName = useTonecraftStore((s) => s.typeFontSelectedCollectionName);
  const setTypeFontSelectedCollectionName = useTonecraftStore((s) => s.setTypeFontSelectedCollectionName);
  const typeFontNewCollectionName = useTonecraftStore((s) => s.typeFontNewCollectionName);
  const setTypeFontNewCollectionName = useTonecraftStore((s) => s.setTypeFontNewCollectionName);

  return (
    <div className="section">
      <p className="section-label">Fonts & weights</p>
      <p className="field-hint">Add every font style you may use, then choose styles for each type size below.</p>

      <div className="font-setup-grid">
        <div>
          <div className="type-font-grid">
            {typeFonts.map((font) => (
              <div className="type-font-row" key={font.id}>
                <input
                  type="text"
                  value={font.family}
                  onChange={(e) => updateTypeFont(font.id, { family: e.target.value })}
                  placeholder="Inter"
                  aria-label="Font family"
                />
                <input
                  type="text"
                  value={font.weight}
                  onChange={(e) => updateTypeFont(font.id, { weight: e.target.value })}
                  placeholder="Regular"
                  aria-label="Font weight"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeTypeFont(font.id)}
                  disabled={typeFonts.length === 1}
                  aria-label={`Remove ${font.family} ${font.weight}`}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="add-color-button" onClick={addTypeFont}>
            <Plus size={14} />
            Add font
          </button>
          <p className="field-hint">Use the exact family and weight names shown in Figma.</p>
        </div>

        <CollectionSelector
          embedded
          collectionMode={typeFontCollectionMode}
          setCollectionMode={setTypeFontCollectionMode}
          existingCollections={existingCollections}
          selectedCollectionName={typeFontSelectedCollectionName}
          setSelectedCollectionName={setTypeFontSelectedCollectionName}
          newCollectionName={typeFontNewCollectionName}
          setNewCollectionName={setTypeFontNewCollectionName}
          itemsLabel="font families and weights"
          title="Font variable collection"
          idPrefix="font"
          newNameLabel="New font variable collection name"
        />
      </div>
    </div>
  );
}
