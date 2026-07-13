
# ALCOSTO COMPARATOR — Plan de construcción

Aplicación web para comparar listas de precios ALCOSTO en Excel, con historial persistente, dashboard de inteligencia y 10 temas visuales.

## Arquitectura

- **Frontend**: React + TanStack Start + TypeScript + Tailwind + shadcn/ui.
- **Procesamiento Excel**: 100% en el navegador con `xlsx` (SheetJS) para leer y `exceljs` para generar el Excel con colores, filtros, formato moneda y bordes. Equivalente funcional a pandas/openpyxl.
- **Backend/DB**: Lovable Cloud (Supabase) para historial y estadísticas. No se almacenan archivos.
- **IA (reconocimiento de marca desde imágenes en celdas)**: server function con Lovable AI Gateway usando `google/gemini-3.1-flash-image` (multimodal) para extraer el nombre de marca desde las imágenes embebidas en las hojas Excel. Se ejecuta solo cuando se detectan imágenes en las filas; los resultados se cachean por hash de imagen en Supabase para no re-consultar.

## Flujo de usuario

1. Página principal: zona de carga (drag & drop) + lista de archivos con fechas auto-detectadas del nombre.
2. Botones: **Comparar todos (consecutivos)** y **Comparar solo los 2 últimos**.
3. Progreso animado (parseando → detectando marcas por IA → comparando → generando Excel).
4. Vista previa interactiva (tabla con búsqueda, filtros por Estado/Marca/Condición, orden por columna, solo lectura).
5. Dashboard de tarjetas con métricas.
6. Botón grande **Descargar Excel**.
7. Historial (sidebar/página) con re-descarga y borrado.

## Lógica de comparación

- Detectar fecha en nombre de archivo con regex `(\d{2})[.\-/](\d{2})[.\-/](\d{4})`.
- Ordenar archivos cronológicamente y generar N-1 comparaciones consecutivas (o solo la última pareja).
- Normalizar columnas: CODIGO, PART NUMBER, DESCRIPCION, PRECIO INCLUIDO IGV, CONDICION, STATUS (tolerante a variaciones de mayúsculas/espacios).
- Extraer imágenes de marca por fila con `exceljs` → llamar IA en lote → asignar `MARCA`.
- Clave de match: CODIGO → PART NUMBER → DESCRIPCION (en ese orden).
- Estados: SE MANTIENE, PRECIO MODIFICADO, NUEVO PRODUCTO, ELIMINADO, CAMBIÓ CONDICIÓN.
- Condición conservada; solo NUEVO y REFURBISHED válidos.

## Excel generado

Nombre: `Comparativo_Alcosto_DD-MM_vs_DD-MM-AAAA.xlsx`

Hojas: **Resumen**, **Unificado**, **Eliminados**, **Agregados**, **Cambios de precio**.

- Encabezado azul oscuro / texto blanco, fila congelada, autofiltro, tabla Excel, ancho autoajustado, formato moneda, bordes.
- Colores por Estado: verde/amarillo/azul/rojo/morado; refurbished en gris claro.
- Mantiene orden y bloques de marca del archivo más reciente.

## Base de datos (Lovable Cloud)

Tablas:
- `comparaciones` — id, created_at, fecha_base, fecha_nueva, nombre_archivo_generado, total_prev, total_curr, agregados, eliminados, cambios_precio, cambios_condicion, refurbished, nuevos, ms_procesamiento.
- `productos_comparacion` — id, comparacion_id, codigo, part_number, descripcion, marca, condicion_prev, condicion_curr, precio_prev, precio_curr, diferencia, variacion_pct, estado, observacion, orden.
- `marcas_cache` — image_hash (pk), marca, created_at.

RLS abierta (app interna sin auth) con políticas permisivas para `anon` y `authenticated`, más grants explícitos.

## Dashboard de inteligencia

- Tarjetas superiores por comparación activa.
- Página `/dashboard`: evolución de precios por marca (line chart con recharts), top marcas por cambios, tendencia agregados/eliminados por semana, contador NUEVO↔REFURBISHED, buscador global por código/PN/descripción sobre todo el historial, línea de tiempo de listas.

## Historial

Página `/historial` con tabla filtrable/buscable, acciones: Ver (abre vista previa desde datos guardados), Descargar (re-genera Excel desde `productos_comparacion`), Eliminar.

## Temas (10)

Selector en el header (dropdown + persistencia en localStorage). Cada tema define tokens semánticos en `src/styles.css` mediante clases `.theme-<name>` combinadas con `.dark`:
1. Corporativo (azul/blanco/gris + verde éxito) — default claro.
2. Corporativo Oscuro.
3. Océano.
4. Bosque.
5. Atardecer.
6. Grafito.
7. Rosa Pastel.
8. Violeta.
9. Ámbar.
10. Alto Contraste.

Cada tema tiene variante clara y oscura donde aplique; el toggle claro/oscuro es independiente.

## Rutas

- `/` — Comparador (carga + preview + descarga).
- `/historial` — Historial de comparaciones.
- `/dashboard` — Inteligencia comercial.
- Layout con sidebar shadcn colapsable.

## Detalles técnicos

Paquetes a instalar: `xlsx`, `exceljs`, `recharts` (ya presente probablemente), `file-saver`.

Server function `detectBrandsFromImages` (en `src/lib/ai.functions.ts`) recibe array de `{ hash, base64 }`, revisa cache en Supabase, consulta Lovable AI Gateway con Gemini multimodal solo para los hashes nuevos, guarda resultados y devuelve `{ hash → marca }`.

Server functions `saveComparacion`, `listComparaciones`, `getComparacion`, `deleteComparacion` usando cliente publishable del servidor.

## Entregables de esta iteración

1. Habilitar Lovable Cloud y crear migraciones/GRANTs/RLS.
2. Sistema de 10 temas + toggle claro/oscuro.
3. Layout con sidebar y rutas.
4. Página comparador: parseo, detección de marca IA, comparación, preview interactivo, descarga.
5. Historial con re-descarga.
6. Dashboard básico (tarjetas + 2 gráficas + buscador global).
7. Metadatos SEO y sitemap/robots.

Después de aprobar, procedo a construir todo.
