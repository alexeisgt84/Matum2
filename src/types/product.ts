export interface Product {
  id: string;
  catalog_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  imagen_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductForm {
  name: string;
  description: string;
  price: number | string;
  currency: string;
  imagen_url?: string | null;
}
