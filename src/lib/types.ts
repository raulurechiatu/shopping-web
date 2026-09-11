export type ShoppingList = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  list_id: string;
  name: string;
  quantity: string | null;
  is_checked: boolean;
  added_by: string | null;
  created_at: string;
  checked_at: string | null;
  category: string | null;
};

export type CatalogItem = {
  id: string;
  list_id: string;
  name: string;
  use_count: number;
  last_used_at: string;
  category: string | null;
  is_favorite: boolean;
};

export type RecipeKind = "food" | "cocktail";

export type Recipe = {
  id: string;
  owner_id: string;
  name: string;
  instructions: string | null;
  invite_code: string;
  kind: RecipeKind;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  position: number;
};
