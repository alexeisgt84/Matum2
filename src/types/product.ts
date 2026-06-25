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
  is_out_of_stock: boolean;
  stock_status: 'available' | 'out_of_stock';
  created_at: string;
  nemu_product_id: string | null;
  parent_product_id?: string | null;
  base_price?: number | null;
  is_discontinued?: boolean;
  price_cup?: number | null;
  price_usd?: number | null;
  category_id?: number | null;
}

export interface ProductForm {
  name: string;
  description: string;
  price: number | string;
  currency: string;
  imagen_url?: string | null;
  category_id?: number | null;
  is_active?: boolean;
}

