-- Migración para actualizar las plantillas predeterminadas de los catálogos en la base de datos
ALTER TABLE catalogs
  ALTER COLUMN template SET DEFAULT '🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n✨ Ver catálogo completo: *{catalog_name}*',
  ALTER COLUMN share_template SET DEFAULT '✨ *¡Mira este producto!* ✨\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n💬 Escríbenos para ordenarlo o ver más detalles en el catálogo: *{catalog_name}*',
  ALTER COLUMN out_of_stock_template SET DEFAULT '⚠️ *¡Se agotó!* ⚠️\n\nEl artículo *{product_name}* ha volado y no nos queda stock por el momento.\n\n👉 Mira otros productos similares en nuestro catálogo: *{catalog_name}*',
  ALTER COLUMN new_product_template SET DEFAULT '🔥 *¡NUEVO INGRESO!* 🔥\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n🚀 ¡Pide el tuyo ahora escribiéndonos antes de que se agote!',
  ALTER COLUMN available_template SET DEFAULT '🎉 *¡DE VUELTA EN STOCK!* 🎉\n\nLo estabas esperando y ya está disponible nuevamente:\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n⚡ Las unidades son muy limitadas. ¡Escríbenos para asegurar el tuyo ahora mismo!';
