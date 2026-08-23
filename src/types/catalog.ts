export type SequenceSchedule = {
  time: string;
  enabled: boolean;
  last_sent_at?: string | null;
}

export interface Catalog {
  id: string;
  user_id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  template: string | null;
  share_template: string | null;
  out_of_stock_template: string | null;
  new_product_template: string | null;
  available_template: string | null;
  price_update_template: string | null;
  product_edit_template: string | null;
  is_active: boolean;
  is_public: boolean;
  slug: string | null;
  follow_code?: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_color: string | null;
  title_color?: string | null;
  nemu_store_id: string | null;
  sequence_start_time: string | null;
  sequence_schedules?: SequenceSchedule[] | null;
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
  last_sequence_sent_at: string | null;
  footer_address?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_schedule?: string | null;
  footer_instagram?: string | null;
  footer_facebook?: string | null;
  usd_to_cup_rate?: number;
  cup_to_usd_rate?: number;
  display_currency?: 'original' | 'usd' | 'cup' | 'both';
  min_order_amount?: number;
  min_order_currency?: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogForm {
  nombre: string;
  descripcion: string;
  slogan?: string | null;
  plantilla?: string;
  share_template?: string;
  out_of_stock_template?: string;
  new_product_template?: string;
  available_template?: string;
  price_update_template?: string;
  product_edit_template?: string;
  sequence_start_time: string;
  sequence_schedules?: SequenceSchedule[];
  is_active: boolean;
  is_public: boolean;
  slug?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  primary_color?: string | null;
  background_color?: string | null;
  surface_color?: string | null;
  text_color?: string | null;
  title_color?: string | null;
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
  nemu_store_id?: string | null;
  footer_address?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_schedule?: string | null;
  footer_instagram?: string | null;
  footer_facebook?: string | null;
  usd_to_cup_rate?: number;
  cup_to_usd_rate?: number;
  display_currency?: 'original' | 'usd' | 'cup' | 'both';
  min_order_amount?: number;
  min_order_currency?: string;
}
