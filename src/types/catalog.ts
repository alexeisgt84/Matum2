export interface Catalog {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template: string | null;
  is_active: boolean;
  sequence_start_time: string | null;
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
  last_sequence_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogForm {
  nombre: string;
  descripcion: string;
  plantilla: string;
  sequence_start_time: string;
  is_active: boolean;
  is_sequence_scheduled: boolean;
  is_individual_scheduled: boolean;
}

