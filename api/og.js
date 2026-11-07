// Función Edge/Serverless de Vercel para servir etiquetas Open Graph a los bots de WhatsApp,
// Telegram, Facebook, X y Discord cuando se comparte el enlace de una tienda o de un producto.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

async function fetchSupabase(supabaseUrl, anonKey, path) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const slug = String(req.query.slug || '').trim();
  const productId = req.query.productId ? String(req.query.productId).trim() : null;

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'matum.vercel.app';
  const baseUrl = `${proto}://${host}`;
  const canonicalUrl = productId
    ? `${baseUrl}/${encodeURIComponent(slug)}/p/${encodeURIComponent(productId)}`
    : `${baseUrl}/${encodeURIComponent(slug)}`;

  let title = 'Tienda en Matum';
  let description = 'Explora el catálogo y haz tu pedido directo por WhatsApp.';
  let image = `${baseUrl}/icon.png`;

  if (supabaseUrl && anonKey && slug) {
    try {
      const catSelect =
        'id,slug,name,slogan,description,logo_url,cover_url,is_active,is_public';
      let catalog = await fetchSupabase(
        supabaseUrl,
        anonKey,
        `catalogs?select=${catSelect}&slug=eq.${encodeURIComponent(slug)}&limit=1`
      );
      if (!catalog && UUID_RE.test(slug)) {
        catalog = await fetchSupabase(
          supabaseUrl,
          anonKey,
          `catalogs?select=${catSelect}&id=eq.${encodeURIComponent(slug)}&limit=1`
        );
      }

      if (catalog && catalog.is_active && catalog.is_public) {
        title = catalog.name;
        description =
          catalog.slogan ||
          catalog.description ||
          `Explora los productos de ${catalog.name} y pide por WhatsApp.`;
        image = catalog.logo_url || catalog.cover_url || image;

        if (productId) {
          const prodSelect = 'id,name,description,price,currency,imagen_url,is_active';
          const product = await fetchSupabase(
            supabaseUrl,
            anonKey,
            `products?select=${prodSelect}&id=eq.${encodeURIComponent(productId)}&catalog_id=eq.${encodeURIComponent(catalog.id)}&limit=1`
          );

          if (product && product.is_active) {
            const priceLabel =
              product.price !== null && product.price !== undefined
                ? `${Number(product.price).toLocaleString()} ${product.currency || 'CUP'}`
                : '';
            title = priceLabel
              ? `${product.name} · ${priceLabel} | ${catalog.name}`
              : `${product.name} | ${catalog.name}`;
            description =
              product.description ||
              `Disponible en ${catalog.name}. Haz tu pedido por WhatsApp.`;
            image = product.imagen_url || image;
          }
        }
      }
    } catch (err) {
      console.error('Error building OG metadata:', err);
    }
  }

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="Matum" />
    <meta property="og:type" content="${productId ? 'product' : 'website'}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
}
