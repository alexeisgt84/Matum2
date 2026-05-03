export type SequenceSchedule = {
  time: string;
  enabled: boolean;
  last_sent_at?: string | null;
}

export interface Catalog {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template: string | null;
  share_template: string | null;
  out_of_stock_template: string | null;
  new_product_template: string | null;
  available_template: string | null;
  price_update_template: string | null;
  product_edit_template: string | null;
  is_active: boolean;
  nemu_store_id: string | null;
  sequence_start_time: string | null;
  sequence_schedules?: SequenceSchedule[] | null;
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
  last_sequence_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogForm {
  nombre: string;
  descripcion: string;
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
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
  nemu_store_id?: string | null;
}
