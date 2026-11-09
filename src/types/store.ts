// Tipos compartidos por las vistas públicas de la tienda (catálogo y ficha de producto)

export type DisplayCurrency = 'original' | 'usd' | 'cup' | 'both';

export interface PublicCatalog {
  id: string;
  slug?: string | null;
  name: string;
  slogan: string | null;
  description: string | null;
  user_id: string;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_color?: string | null;
  title_color?: string | null;
  follow_code?: string | null;
  footer_address?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_schedule?: string | null;
  footer_instagram?: string | null;
  footer_facebook?: string | null;
  min_order_amount?: number | null;
  min_order_currency?: string | null;
  usd_to_cup_rate?: number;
  cup_to_usd_rate?: number;
  display_currency?: DisplayCurrency;
  share_template?: string | null;
  enable_affiliates?: boolean;
}

export interface PublicProduct {
  id: string;
  catalog_id?: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  imagen_url: string | null;
  is_out_of_stock: boolean;
  stock_status: string;
  price_cup?: number | null;
  price_usd?: number | null;
  category_id?: number | null;
  commission_amount?: number | null;
  commission_currency?: 'CUP' | 'USD';
  delivery_cost?: number | null;
  delivery_currency?: 'CUP' | 'USD' | null;
  delivery_time_value?: number | null;
  delivery_time_unit?: 'hours' | 'days' | null;
  position?: number | null;
}

export interface StoreCategory {
  id: number;
  name: string;
  icon: string | null;
  display_order: number;
}

export interface CartItem {
  product: PublicProduct;
  quantity: number;
}

export type StoreSortBy = 'category' | 'default' | 'price-asc' | 'price-desc';
