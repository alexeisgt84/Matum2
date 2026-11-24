// Función Serverless de Vercel para resolver enlaces cortos (/s/:code).
// - A los usuarios humanos los redirige (302) a la ruta canónica del producto/tienda conservando ?ref=...
// - A los bots (WhatsApp, Telegram, Facebook, X, Discord, etc.) les sirve etiquetas Open Graph directamente.

const SHORT_CODE_RE = /^[A-Za-z0-9]{4,16}$/;
const BOT_UA_RE =
  /(WhatsApp|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Discordbot|Slackbot|LinkedInBot|Applebot|Pinterest|Embedly|SkypeUriPreview|Viber|vkShare)/i;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderOgHtml({ title, description, canonicalUrl, image, ogType }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="Nazaar" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
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
}

async function resolveShortCode(supabaseUrl, anonKey, code, incrementClick) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_short_link`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_code: code,
      p_increment_click: incrementClick,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const rows = await response.json();
  if (Array.isArray(rows)) {
    return rows[0] || null;
  }
  return rows || null;
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const code = String(req.query?.code || '').trim();
  const isOgQuery = req.query?.og === '1';
  const userAgent = String(req.headers?.['user-agent'] || '');
  const isBot = isOgQuery || BOT_UA_RE.test(userAgent);

  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'nazaar.shop';
  const baseUrl = `${proto}://${host}`;
  const canonicalUrl = SHORT_CODE_RE.test(code)
    ? `${baseUrl}/s/${encodeURIComponent(code)}`
    : baseUrl;

  let title = 'Tienda en Nazaar';
  let description = 'Explora el catálogo y haz tu pedido directo por WhatsApp.';
  let image = `${baseUrl}/icon.png`;
  let ogType = 'website';

  const sendBotFallback = () => {
    const html = renderOgHtml({ title, description, canonicalUrl, image, ogType });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      isOgQuery ? 'public, s-maxage=300, stale-while-revalidate=600' : 'private, no-store'
    );
    return res.status(200).send(html);
  };

  const sendHumanRedirect = (location) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Location', location);
    return res.status(302).end();
  };

  if (!SHORT_CODE_RE.test(code) || !supabaseUrl || !anonKey) {
    return isBot ? sendBotFallback() : sendHumanRedirect('/');
  }

  let row = null;
  try {
    row = await resolveShortCode(supabaseUrl, anonKey, code, !isBot);
  } catch (err) {
    console.error('Error resolving short link:', err);
    return isBot ? sendBotFallback() : sendHumanRedirect('/');
  }

  if (!row) {
    return isBot ? sendBotFallback() : sendHumanRedirect('/');
  }

  if (!isBot) {
    const slugPart = encodeURIComponent(row.catalog_slug || row.catalog_id);
    const refQuery = row.referral_code ? `?ref=${encodeURIComponent(row.referral_code)}` : '';
    const targetPath = row.product_id
      ? `/${slugPart}/p/${encodeURIComponent(row.product_id)}${refQuery}`
      : `/${slugPart}${refQuery}`;
    return sendHumanRedirect(targetPath);
  }

  ogType = row.product_id ? 'product' : 'website';

  if (row.catalog_is_active && row.catalog_is_public && !row.catalog_is_blocked) {
    title = row.catalog_name || title;
    description =
      row.catalog_slogan ||
      row.catalog_description ||
      `Explora los productos de ${row.catalog_name} y pide por WhatsApp.`;
    image = row.catalog_logo_url || row.catalog_cover_url || image;

    if (row.product_id && row.product_is_active) {
      const priceLabel =
        row.product_price !== null && row.product_price !== undefined
          ? `${Number(row.product_price).toLocaleString()} ${row.product_currency || 'CUP'}`
          : '';
      title = priceLabel
        ? `${row.product_name} · ${priceLabel} | ${row.catalog_name}`
        : `${row.product_name} | ${row.catalog_name}`;
      description =
        row.product_description ||
        `Disponible en ${row.catalog_name}. Haz tu pedido por WhatsApp.`;
      image = row.product_imagen_url || image;
    }
  }

  return sendBotFallback();
}
