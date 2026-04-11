export interface AutomationSequence {
  id: string;
  catalog_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SequenceForm {
  name: string;
  is_active: boolean;
}
