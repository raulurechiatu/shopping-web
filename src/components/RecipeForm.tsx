"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/lib/useOnlineStatus";
import { getItemIcon } from "@/lib/itemIcons";
import type { RecipeKind } from "@/lib/types";

type IngredientDraft = { name: string; quantity: string };

function toSteps(text: string): string[] {
  const lines = text.split("\n").map((line) => line.trim());
  return lines.length > 0 ? lines : [""];
}

const ACCENT: Record<RecipeKind, string> = {
  food: "#2b3a55",
  cocktail: "#6b3fa0",
};

export default function RecipeForm({
  recipeId,
  kind = "food",
  initialName = "",
  initialInstructions = "",
  initialIngredients,
  initialImageUrl = "",
}: {
  recipeId?: string;
  kind?: RecipeKind;
  initialName?: string;
  initialInstructions?: string;
  initialIngredients?: IngredientDraft[];
  initialImageUrl?: string;
}) {
  const router = useRouter();
  const requireOnline = useOnlineGuard();
  const accent = ACCENT[kind];
  const accentVar = kind === "cocktail" ? "var(--accent-cocktail)" : "var(--accent-food)";
  const noun = kind === "cocktail" ? "cocktail" : "recipe";
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [steps, setSteps] = useState<string[]>(
    initialInstructions ? toSteps(initialInstructions) : [""],
  );
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initialIngredients && initialIngredients.length > 0
      ? initialIngredients
      : [{ name: "", quantity: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const ingredientNameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const stepRefs = useRef<(HTMLInputElement | null)[]>([]);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let picking the same file again re-trigger onChange
    if (!file) return;
    if (!(await requireOnline())) return;

    setUploadingImage(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("recipe-images").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploadingImage(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("recipe-images").getPublicUrl(path);
    setImageUrl(publicUrl);
    setUploadingImage(false);
  }

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setIngredients((current) =>
      current.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  }

  function addIngredientRow(focusIndex?: number) {
    setIngredients((current) => {
      const next = [...current, { name: "", quantity: "" }];
      const targetIndex = focusIndex ?? next.length - 1;
      requestAnimationFrame(() => ingredientNameRefs.current[targetIndex]?.focus());
      return next;
    });
  }

  function removeIngredientRow(index: number) {
    setIngredients((current) => current.filter((_, i) => i !== index));
  }

  // Enter on the last row adds a new one and focuses it (no reaching for
  // the "+ Add ingredient" button on every line); Backspace on an empty
  // name field deletes that row and refocuses the previous one — the same
  // feel as a Notion/Todoist list, which matters most on a phone where
  // typing a full ingredient list one tap-per-row at a time is tedious.
  function handleIngredientNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === ingredients.length - 1) {
        addIngredientRow();
      } else {
        ingredientNameRefs.current[index + 1]?.focus();
      }
      return;
    }
    if (e.key === "Backspace" && ingredients[index].name === "" && ingredients[index].quantity === "") {
      if (ingredients.length === 1) return;
      e.preventDefault();
      removeIngredientRow(index);
      requestAnimationFrame(() => ingredientNameRefs.current[Math.max(0, index - 1)]?.focus());
    }
  }

  // Pasting a multi-line ingredient list (copied from a recipe elsewhere)
  // fills this row and inserts one new row per extra line, instead of
  // dumping every line into a single field.
  function handleIngredientPaste(e: React.ClipboardEvent<HTMLInputElement>, index: number) {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    setIngredients((current) => {
      const next = [...current];
      next[index] = { ...next[index], name: lines[0] };
      const inserted = lines.slice(1).map((line) => ({ name: line, quantity: "" }));
      next.splice(index + 1, 0, ...inserted);
      return next;
    });
  }

  function updateStep(index: number, value: string) {
    setSteps((current) => current.map((s, i) => (i === index ? value : s)));
  }

  function addStep(focusIndex?: number) {
    setSteps((current) => {
      const next = [...current, ""];
      const targetIndex = focusIndex ?? next.length - 1;
      requestAnimationFrame(() => stepRefs.current[targetIndex]?.focus());
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function handleStepKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === steps.length - 1) {
        addStep();
      } else {
        stepRefs.current[index + 1]?.focus();
      }
      return;
    }
    if (e.key === "Backspace" && steps[index] === "") {
      if (steps.length === 1) return;
      e.preventDefault();
      removeStep(index);
      requestAnimationFrame(() => stepRefs.current[Math.max(0, index - 1)]?.focus());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!(await requireOnline())) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const cleanIngredients = ingredients
      .map((ing) => ({ name: ing.name.trim(), quantity: ing.quantity.trim() || null }))
      .filter((ing) => ing.name);
    const instructions = steps.map((s) => s.trim()).filter(Boolean).join("\n");
    const trimmedImageUrl = imageUrl.trim() || null;

    if (recipeId) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update({
          name: name.trim(),
          instructions: instructions || null,
          image_url: trimmedImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipeId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

      if (cleanIngredients.length > 0) {
        const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
          cleanIngredients.map((ing, index) => ({
            recipe_id: recipeId,
            name: ing.name,
            quantity: ing.quantity,
            position: index,
          })),
        );

        if (ingredientsError) {
          setError(ingredientsError.message);
          setSaving(false);
          return;
        }
      }

      router.push(`/recipes/${recipeId}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: recipe, error: insertError } = await supabase
      .from("recipes")
      .insert({
        name: name.trim(),
        instructions: instructions || null,
        image_url: trimmedImageUrl,
        owner_id: user?.id,
        kind,
      })
      .select()
      .single();

    if (insertError || !recipe) {
      setError(insertError?.message ?? `Could not create the ${noun}.`);
      setSaving(false);
      return;
    }

    if (cleanIngredients.length > 0) {
      const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
        cleanIngredients.map((ing, index) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          position: index,
        })),
      );

      if (ingredientsError) {
        setError(ingredientsError.message);
        setSaving(false);
        return;
      }
    }

    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
          {kind === "cocktail" ? "Cocktail name" : "Recipe name"}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "cocktail" ? "e.g. Old Fashioned" : "e.g. Sunday roast chicken"}
          required
          enterKeyHint="next"
          style={{ ["--accent" as string]: accentVar }}
          className="font-hand w-full border-b-2 border-gray-300 dark:border-gray-700 bg-transparent px-1 py-2 text-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 flex items-baseline gap-1.5 text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
          Photo <span className="normal-case text-gray-300 dark:text-gray-600">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            type="url"
            inputMode="url"
            placeholder="Paste an image link"
            enterKeyHint="next"
            style={{ ["--accent" as string]: accentVar }}
            className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[var(--accent)] focus:outline-none"
          />
          <input
            ref={photoFileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => photoFileInputRef.current?.click()}
            disabled={uploadingImage}
            aria-label="Add a photo from your camera or gallery"
            className="shrink-0 touch-manipulation rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50"
          >
            {uploadingImage ? "…" : "📷"}
          </button>
        </div>
        {imageUrl.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl.trim()}
            alt=""
            className="mt-2 h-28 w-full rounded-lg bg-gray-100 object-contain dark:bg-gray-800"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = "";
            }}
          />
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-lg leading-none">
                {ing.name.trim() ? getItemIcon(ing.name) : ""}
              </span>
              <input
                ref={(el) => {
                  ingredientNameRefs.current[index] = el;
                }}
                value={ing.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                onKeyDown={(e) => handleIngredientNameKeyDown(e, index)}
                onPaste={(e) => handleIngredientPaste(e, index)}
                placeholder="Ingredient (EN or RO)"
                enterKeyHint="next"
                style={{ ["--accent" as string]: accentVar }}
                className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
              />
              <input
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                placeholder="qty"
                enterKeyHint="next"
                style={{ ["--accent" as string]: accentVar }}
                className="font-hand w-16 shrink-0 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredientRow(index)}
                  className="shrink-0 touch-manipulation rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
                  aria-label="Remove ingredient"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addIngredientRow()}
          className="mt-2 touch-manipulation text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          + Add ingredient
        </button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">
          Instructions
        </label>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="font-hand mt-2 w-5 shrink-0 text-right text-base text-gray-400 dark:text-gray-500">
                {index + 1}.
              </span>
              <input
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                onKeyDown={(e) => handleStepKeyDown(e, index)}
                placeholder={
                  index === 0
                    ? kind === "cocktail"
                      ? "e.g. Add ice to a shaker"
                      : "e.g. Preheat oven to 200°C"
                    : "Next step..."
                }
                enterKeyHint="next"
                style={{ ["--accent" as string]: accentVar }}
                className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="shrink-0 touch-manipulation rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
                  aria-label="Remove step"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addStep()}
          className="mt-2 touch-manipulation text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          + Add step
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !name.trim()}
        style={{ backgroundColor: accent }}
        className="w-full touch-manipulation rounded-lg px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving..." : recipeId ? "✅ Save changes" : `➕ Create ${noun}`}
      </button>
    </form>
  );
}
