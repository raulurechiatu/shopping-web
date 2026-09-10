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
};

export type CatalogItem = {
  id: string;
  list_id: string;
  name: string;
  use_count: number;
  last_used_at: string;
};
