export type MessageType = 'text' | 'image' | 'button' | 'product' | 'catalog_products';

export interface FixedSchedule {
  time: string;
  last_sent_at?: string | null;
}

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
  schedule_type?: 'fixed' | 'interval' | null;
  schedule_interval?: number | null;
  fixed_schedules?: FixedSchedule[] | null;
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
  schedule_type?: 'fixed' | 'interval' | null;
  schedule_interval?: number | null;
  fixed_schedules?: FixedSchedule[] | null;
}
