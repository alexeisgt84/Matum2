// Gestión de etiquetas Open Graph, Twitter Card y JSON-LD en las vistas públicas.

export interface StoreSeoMeta {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'product';
  jsonLd?: Record<string, unknown>;
}

const setMetaTag = (attr: 'property' | 'name', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.dataset.storeSeo = 'true';
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export const applyStoreSeo = ({
  title,
  description,
  image,
  url,
  type = 'website',
  jsonLd,
}: StoreSeoMeta) => {
  if (typeof document === 'undefined') return () => {};

  const prevTitle = document.title;
  document.title = title;

  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:type', type);
  setMetaTag('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);

  if (url) setMetaTag('property', 'og:url', url);
  if (image) {
    setMetaTag('property', 'og:image', image);
    setMetaTag('name', 'twitter:image', image);
  }

  let ldEl: HTMLScriptElement | null = null;
  if (jsonLd) {
    ldEl = document.createElement('script');
    ldEl.type = 'application/ld+json';
    ldEl.id = 'store-jsonld';
    ldEl.textContent = JSON.stringify({ '@context': 'https://schema.org', ...jsonLd });
    document.getElementById('store-jsonld')?.remove();
    document.head.appendChild(ldEl);
  }

  return () => {
    document.title = prevTitle;
    document.head.querySelectorAll('meta[data-store-seo="true"]').forEach(el => el.remove());
    ldEl?.remove();
  };
};
