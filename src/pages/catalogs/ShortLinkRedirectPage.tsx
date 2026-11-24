import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { SHORT_CODE_RE } from '../../lib/shortLinks';
import { LoadingScreen } from '../../components/ui/AnimatedLogo';

interface ResolvedShortLinkRow {
  code: string;
  catalog_id: string;
  catalog_slug: string | null;
  product_id: string | null;
  referral_code: string | null;
}

export const ShortLinkRedirectPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const cleanCode = (code || '').trim();
      if (!SHORT_CODE_RE.test(cleanCode)) {
        toast.error('Enlace no encontrado o expirado');
        navigate('/', { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase.rpc('resolve_short_link', {
          p_code: cleanCode,
          p_increment_click: true,
        });

        if (cancelled) return;

        const row: ResolvedShortLinkRow | null = Array.isArray(data)
          ? (data[0] ?? null)
          : ((data as ResolvedShortLinkRow | null) ?? null);

        if (error || !row || (!row.catalog_slug && !row.catalog_id)) {
          toast.error('Enlace no encontrado o expirado');
          navigate('/', { replace: true });
          return;
        }

        const slugPart = encodeURIComponent(row.catalog_slug || row.catalog_id);
        const refQuery = row.referral_code
          ? `?ref=${encodeURIComponent(row.referral_code)}`
          : '';
        const targetPath = row.product_id
          ? `/${slugPart}/p/${encodeURIComponent(row.product_id)}${refQuery}`
          : `/${slugPart}${refQuery}`;

        navigate(targetPath, { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error('Error resolving short link in SPA:', err);
        toast.error('Enlace no encontrado o expirado');
        navigate('/', { replace: true });
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return <LoadingScreen />;
};
