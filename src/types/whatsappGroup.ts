export interface WhatsAppGroup {
  id: string;
  catalog_id: string;
  group_id: string; // ID de Evolution API (jid)
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface EvolutionGroup {
  id: string;
  subject: string;
  size: number;
}
