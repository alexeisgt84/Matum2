# Walkthrough - Studio de Imágenes y Formateador (>2 Megapíxeles) para Supabase

Hemos implementado un **Studio de Imágenes (`ImageStudioModal`)** completo y el motor de formateo/optimización inteligente en la aplicación para procesar fotos de más de 2 Megapíxeles (cámaras de 12MP a 48MP o archivos pesados) sin colgar la memoria del dispositivo y formateándolas eficientemente antes de subirlas a **Supabase Storage**.

---

## Cambios Realizados

### 1. Motor de Optimización e Indicadores de Megapíxeles
- **[imageOptimizer.ts](file:///e:/APP/Matum2/src/lib/imageOptimizer.ts)**:
  - `calculateMegapixels(width, height)`: calcula la resolución en megapíxeles exactos (ej. 12.00 MP).
  - `formatBytes(bytes)`: formateador legible de tamaño de archivo (KB / MB).
  - `getImageMetadata(file)`: obtiene dimensiones binarias, megapíxeles y peso sin cargar innecesariamente toda la imagen en RAM.
  - `processStudioImage(...)`: aplica recorte proporcional, rotación (0°, 90°, 180°, 270°), formateo (`WebP`, `JPEG`, `PNG`), nivel de compresión (10%-100%) y ajuste por límite de megapíxeles (ej. 2.0 MP recomendado para Supabase).

### 2. Componente de UI: Studio de Imágenes
- **[ImageStudioModal.tsx](file:///e:/APP/Matum2/src/components/ui/ImageStudioModal.tsx)**:
  - Interfaz gráfica oscura con diseño glassmorphism.
  - **Insignia de Megapíxeles y Alerta >2MP**: Alerta suave al detectar fotos de más de 2 Megapíxeles.
  - **Estadísticas en vivo de Supabase**: Muestra tamaño original vs. tamaño estimado formateado y porcentaje de ahorro (ej. `4.5 MB ➔ 280 KB (-93%)`).
  - **Controles de Recorte**: Presets de aspecto `1:1 (Producto)`, `4:3`, `16:9` y `Libre`.
  - **Controles de Rotación y Zoom**: Botones flotantes de rotación y barra deslizante de zoom.
  - **Selector de Formato y Calidad**: Selección de WebP, JPEG y PNG con slider de compresión.
  - **Límite de Megapíxeles**: Presets `1.0 MP`, `2.0 MP (Óptimo Supabase)`, `4.0 MP` u `Original`.

### 3. Conexión de Componentes Existentes
- **[ImageCropperModal.tsx](file:///e:/APP/Matum2/src/components/ui/ImageCropperModal.tsx)**:
  - Actualizado para usar `ImageStudioModal` internamente, garantizando compatibilidad total en toda la app.
- **[ProductFormModal.tsx](file:///e:/APP/Matum2/src/components/products/ProductFormModal.tsx)**:
  - Se agregó el botón explícito **"Studio de Imagen 🎨"** y se activa automáticamente el studio al tomar/subir fotos de productos.
- **[EditProfilePage.tsx](file:///e:/APP/Matum2/src/pages/profile/EditProfilePage.tsx)**:
  - Integrado el Studio para recortar y optimizar imágenes de avatar antes de guardarlas.

---

## Verificación Realizada

- **Compilación de TypeScript y Vite**: Verificada con `npm run build` sin errores.
- **Detección de Megapíxeles y Memoria**: Probado que las fotos gigantes se escalan por etapas antes del canvas sin provocar desbordamientos de RAM en navegadores o WebViews de Capacitor.
