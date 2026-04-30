export type AuthUser = {
  id: string;
  phone: string;
  nombre: string | null;
  avatar_url: string | null;
  plan: string;
  role: 'user' | 'admin';
};

export type LoginForm = {
  phone: string;
  password: string;
};

export type RegisterForm = {
  phone: string;
  password: string;
  nombre: string;
};

export type VerificationCode = {
  id: string;
  phone: string;
  code: string;
  expires_at: string;
};
