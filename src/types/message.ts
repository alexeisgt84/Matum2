export type MessageType = 'text' | 'image' | 'button' | 'product' | 'catalog_products';

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
  last_sent_at?: string | null;
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
