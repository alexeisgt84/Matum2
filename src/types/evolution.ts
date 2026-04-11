export interface EvolutionInstance {
  id: string;
  user_id: string;
  catalog_id: string | null;
  name: string;
  instance_key: string;
  status: 'pending' | 'connected' | 'disconnected';
  qrcode: string | null;
  pairing_code?: string | null;
  created_at: string;
}

export interface EvolutionStatusResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  qrcode?: {
    base64: string;
  };
}
