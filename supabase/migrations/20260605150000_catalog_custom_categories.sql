-- Migration: Add custom categories support for catalogs
-- Date: 2026-06-05

-- 1. Drop unique constraint on categories name (allows multiple catalogs to have the same category name)
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- 2. Add catalog_id column referencing catalogs table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.catalogs(id) ON DELETE CASCADE;

-- 3. Update products table foreign key to set category_id to NULL on delete
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Enable RLS on categories (if not already enabled)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing select policy
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Owners and collaborators can manage categories" ON public.categories;

-- 6. Create select policy allowing public read access for active/public catalogs, or for owners/collaborators, or global categories (catalog_id IS NULL)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT
USING (
  is_active = true AND (
    catalog_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.catalogs 
      WHERE catalogs.id = categories.catalog_id 
      AND catalogs.is_active = true 
      AND catalogs.is_public = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.catalogs 
      WHERE catalogs.id = categories.catalog_id 
      AND catalogs.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.catalog_members 
      WHERE catalog_members.catalog_id = categories.catalog_id 
      AND catalog_members.user_id = auth.uid() 
      AND catalog_members.status = 'accepted'
    )
  )
);

-- 7. Create policy allowing owners and collaborators to manage categories
CREATE POLICY "Owners and collaborators can manage categories" ON public.categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.catalogs 
    WHERE catalogs.id = categories.catalog_id 
    AND catalogs.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.catalog_members 
    WHERE catalog_members.catalog_id = categories.catalog_id 
    AND catalog_members.user_id = auth.uid() 
    AND catalog_members.status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.catalogs 
    WHERE catalogs.id = categories.catalog_id 
    AND catalogs.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.catalog_members 
    WHERE catalog_members.catalog_id = categories.catalog_id 
    AND catalog_members.user_id = auth.uid() 
    AND catalog_members.status = 'accepted'
  )
);
