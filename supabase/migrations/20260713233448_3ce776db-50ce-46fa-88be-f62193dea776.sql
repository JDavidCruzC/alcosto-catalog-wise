
-- comparaciones
CREATE TABLE public.comparaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_base DATE,
  fecha_nueva DATE,
  nombre_archivo_base TEXT,
  nombre_archivo_nuevo TEXT,
  nombre_archivo_generado TEXT NOT NULL,
  total_prev INT NOT NULL DEFAULT 0,
  total_curr INT NOT NULL DEFAULT 0,
  agregados INT NOT NULL DEFAULT 0,
  eliminados INT NOT NULL DEFAULT 0,
  cambios_precio INT NOT NULL DEFAULT 0,
  cambios_condicion INT NOT NULL DEFAULT 0,
  refurbished INT NOT NULL DEFAULT 0,
  nuevos INT NOT NULL DEFAULT 0,
  ms_procesamiento INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comparaciones TO anon, authenticated;
GRANT ALL ON public.comparaciones TO service_role;
ALTER TABLE public.comparaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read comparaciones" ON public.comparaciones FOR SELECT USING (true);
CREATE POLICY "public insert comparaciones" ON public.comparaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "public update comparaciones" ON public.comparaciones FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete comparaciones" ON public.comparaciones FOR DELETE USING (true);

-- productos_comparacion
CREATE TABLE public.productos_comparacion (
  id BIGSERIAL PRIMARY KEY,
  comparacion_id UUID NOT NULL REFERENCES public.comparaciones(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 0,
  codigo TEXT,
  part_number TEXT,
  descripcion TEXT,
  marca TEXT,
  condicion_prev TEXT,
  condicion_curr TEXT,
  precio_prev NUMERIC(14,2),
  precio_curr NUMERIC(14,2),
  diferencia NUMERIC(14,2),
  variacion_pct NUMERIC(10,4),
  estado TEXT NOT NULL,
  observacion TEXT
);
CREATE INDEX idx_prod_comparacion ON public.productos_comparacion(comparacion_id);
CREATE INDEX idx_prod_estado ON public.productos_comparacion(estado);
CREATE INDEX idx_prod_marca ON public.productos_comparacion(marca);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos_comparacion TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.productos_comparacion_id_seq TO anon, authenticated;
GRANT ALL ON public.productos_comparacion TO service_role;
GRANT ALL ON SEQUENCE public.productos_comparacion_id_seq TO service_role;
ALTER TABLE public.productos_comparacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all productos" ON public.productos_comparacion FOR ALL USING (true) WITH CHECK (true);

-- marcas_cache
CREATE TABLE public.marcas_cache (
  image_hash TEXT PRIMARY KEY,
  marca TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marcas_cache TO anon, authenticated;
GRANT ALL ON public.marcas_cache TO service_role;
ALTER TABLE public.marcas_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read marcas_cache" ON public.marcas_cache FOR SELECT USING (true);
CREATE POLICY "public insert marcas_cache" ON public.marcas_cache FOR INSERT WITH CHECK (true);
