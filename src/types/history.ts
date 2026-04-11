export interface SendingLog {
  id: string;
  catalog_id: string;
  catalog_name?: string;
  group_name: string;
  status: 'success' | 'failed';
  error_message?: string;
  created_at: string;
}
