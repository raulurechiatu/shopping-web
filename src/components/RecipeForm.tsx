"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type IngredientDraft = { name: string; quantity: string };

function toSteps(text: string): string[] {
  const lines = text.split("\n").map((line) => line.trim());
  return lines.length > 0 ? lines : [""];
}

export default function RecipeForm({
  recipeId,
  initialName = "",
  initialInstructions = "",
  initialIngredients,
}: {
  recipeId?: string;
  initialName?: string;
  initialInstructions?: string;
  initialIngredients?: IngredientDraft[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
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

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setIngredients((current) =>
      current.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  }

  function addIngredientRow() {
    setIngredients((current) => [...current, { name: "", quantity: "" }]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((current) => current.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    setSteps((current) => current.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    setSteps((current) => [...current, ""]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const cleanIngredients = ingredients
      .map((ing) => ({ name: ing.name.trim(), quantity: ing.quantity.trim() || null }))
      .filter((ing) => ing.name);
    const instructions = steps.map((s) => s.trim()).filter(Boolean).join("\n");

    if (recipeId) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ name: name.trim(), instructions: instructions || null, updated_at: new Date().toISOString() })
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
      .insert({ name: name.trim(), instructions: instructions || null, owner_id: user?.id })
      .select()
      .single();

    if (insertError || !recipe) {
      setError(insertError?.message ?? "Could not create the recipe.");
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
        <label className="mb-1 block text-xs font-medium tracking-wide text-gray-400 uppercase">
          Recipe name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunday roast chicken"
          required
          className="font-hand w-full border-b-2 border-gray-300 bg-transparent px-1 py-2 text-xl text-gray-900 placeholder:text-gray-400 focus:border-[#2b3a55] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-400 uppercase">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                placeholder="Ingredient (EN or RO)"
                className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-[#2b3a55] focus:outline-none"
              />
              <input
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                placeholder="qty"
                className="font-hand w-16 shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-base focus:border-[#2b3a55] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeIngredientRow(index)}
                className="shrink-0 touch-manipulation rounded-full p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredientRow}
          className="mt-2 touch-manipulation text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          + Add ingredient
        </button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-400 uppercase">
          Instructions
        </label>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="font-hand mt-2 w-5 shrink-0 text-right text-base text-gray-400">
                {index + 1}.
              </span>
              <input
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={index === 0 ? "e.g. Preheat oven to 200°C" : "Next step..."}
                className="font-hand min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-[#2b3a55] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="shrink-0 touch-manipulation rounded-full p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-2 touch-manipulation text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          + Add step
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42] disabled:opacity-50"
      >
        {saving ? "Saving..." : recipeId ? "Save changes" : "Create recipe"}
      </button>
    </form>
  );
}
