export interface Category {
  id: number;
  catalog_id: string | null;
  name: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface CategoryForm {
  name: string;
  icon?: string | null;
  is_active?: boolean;
}
