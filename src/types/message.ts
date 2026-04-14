export type MessageType = 'text' | 'image' | 'button' | 'product';

export interface WhatsAppMessage {
  id: string;
  catalog_id: string;
  name: string;
  content: string | null;
  type: MessageType;
  is_individual: boolean;
  is_sequence: boolean;
  scheduled_at?: string | null;
  scheduled_time?: string | null;
  image_url?: string | null;
  sequence_order: number;
  created_at: string;
}

export interface MessageForm {
  name: string;
  content: string | null;
  type: MessageType;
  is_individual: boolean;
  is_sequence: boolean;
  scheduled_at?: string | null;
  scheduled_time?: string | null;
  image_url?: string | null;
  sequence_order?: number;
}
