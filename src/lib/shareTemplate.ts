export interface FormatProductShareTextParams {
  shareTemplate?: string | null;
  productName?: string | null;
  productDescription?: string | null;
  priceText: string;
  currencyText?: string;
  catalogName?: string | null;
  contactNumber?: string | null;
  productUrl?: string;
  storeUrl?: string;
}

export function shareTemplateUsesProductUrl(shareTemplate?: string | null): boolean {
  return Boolean(shareTemplate && /\{(product_url|product_referral_url)\}/.test(shareTemplate));
}

export function shareTemplateUsesStoreUrl(shareTemplate?: string | null): boolean {
  return Boolean(shareTemplate && /\{store_url\}/.test(shareTemplate));
}

/**
 * Formatea el texto para compartir un producto individual respetando las etiquetas
 * definidas por el usuario en su plantilla (`share_template`).
 * Solo incluye enlaces cuando el usuario utiliza `{product_url}`, `{product_referral_url}`
 * o `{store_url}`.
 */
export function formatProductShareText({
  shareTemplate,
  productName,
  productDescription,
  priceText,
  currencyText,
  catalogName,
  contactNumber,
  productUrl = '',
  storeUrl = '',
}: FormatProductShareTextParams): string {
  const cleanName = (productName || '').trim();
  const cleanDesc = (productDescription || '').trim();
  const cleanPrice = (priceText || '').trim();
  const cleanCurrency = (currencyText || '').trim();
  const cleanCatalog = (catalogName || '').trim();
  const cleanContact = (contactNumber || '').trim();

  if (shareTemplate && shareTemplate.trim()) {
    return shareTemplate
      .replace(/{product_name}/g, cleanName)
      .replace(/{product_description}/g, cleanDesc)
      .replace(/{product_price}/g, cleanPrice)
      .replace(/{product_currency}/g, cleanCurrency)
      .replace(/{catalog_name}/g, cleanCatalog)
      .replace(/{contact_number}/g, cleanContact)
      .replace(/{store_url}/g, storeUrl)
      .replace(/{product_url}/g, productUrl)
      .replace(/{product_referral_url}/g, productUrl)
      .trim();
  }

  const priceLine = cleanCurrency ? `${cleanPrice} ${cleanCurrency}`.trim() : cleanPrice;
  const lines = [`*${cleanName}*`, `Precio: ${priceLine}`];
  if (cleanDesc) {
    lines.push(cleanDesc);
  }
  return lines.join('\n\n').trim();
}
