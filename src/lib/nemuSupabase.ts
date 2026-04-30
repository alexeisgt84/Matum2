import { createClient } from '@supabase/supabase-js';

// Credenciales extraídas de e:/app/nemu/.env
const nemuUrl = 'https://vkvgdaodurgdgltgwyse.supabase.co';
const nemuAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdmdkYW9kdXJnZGdsdGd3eXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MDI3MDEsImV4cCI6MjA3ODM3ODcwMX0.FvTKfRTd4eKWbddx2MMv-MY63j-5wN6vkzoTiIuMXh4';

export const nemuSupabase = createClient(nemuUrl, nemuAnonKey);
