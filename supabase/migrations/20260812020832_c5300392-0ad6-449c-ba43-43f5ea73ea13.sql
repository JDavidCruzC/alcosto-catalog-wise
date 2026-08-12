CREATE TABLE public.uso_eventos (
  id bigserial PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('comparacion','descarga')),
  comparacion_id uuid REFERENCES public.comparaciones(id) ON DELETE SET NULL,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.uso_eventos TO anon;
GRANT SELECT, INSERT ON public.uso_eventos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.uso_eventos_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.uso_eventos_id_seq TO authenticated;
GRANT ALL ON public.uso_eventos TO service_role;
GRANT ALL ON SEQUENCE public.uso_eventos_id_seq TO service_role;
ALTER TABLE public.uso_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read uso_eventos" ON public.uso_eventos FOR SELECT USING (true);
CREATE POLICY "public insert uso_eventos" ON public.uso_eventos FOR INSERT WITH CHECK (true);
CREATE INDEX uso_eventos_tipo_idx ON public.uso_eventos (tipo, created_at DESC);
INSERT INTO public.uso_eventos (tipo, comparacion_id, detalle, created_at)
SELECT 'comparacion', c.id, c.nombre_archivo_generado, c.created_at FROM public.comparaciones c;