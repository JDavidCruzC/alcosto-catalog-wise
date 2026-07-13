import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function serverClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ComparedRowSchema = z.object({
  codigo: z.string(),
  partNumber: z.string(),
  descripcion: z.string(),
  marca: z.string(),
  condicionPrev: z.string(),
  condicionCurr: z.string(),
  precioPrev: z.number().nullable(),
  precioCurr: z.number().nullable(),
  diferencia: z.number().nullable(),
  variacionPct: z.number().nullable(),
  estado: z.string(),
  observacion: z.string(),
  orden: z.number(),
});

const SaveSchema = z.object({
  fechaBase: z.string().nullable(),
  fechaNueva: z.string().nullable(),
  fileNameBase: z.string(),
  fileNameNueva: z.string(),
  outputFileName: z.string(),
  totalPrev: z.number(),
  totalCurr: z.number(),
  agregados: z.number(),
  eliminados: z.number(),
  cambiosPrecio: z.number(),
  cambiosCondicion: z.number(),
  refurbished: z.number(),
  nuevos: z.number(),
  msProcesamiento: z.number(),
  rows: z.array(ComparedRowSchema),
});

export const saveComparacion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = serverClient();
    const { data: comp, error } = await sb
      .from("comparaciones")
      .insert({
        fecha_base: data.fechaBase,
        fecha_nueva: data.fechaNueva,
        nombre_archivo_base: data.fileNameBase,
        nombre_archivo_nuevo: data.fileNameNueva,
        nombre_archivo_generado: data.outputFileName,
        total_prev: data.totalPrev,
        total_curr: data.totalCurr,
        agregados: data.agregados,
        eliminados: data.eliminados,
        cambios_precio: data.cambiosPrecio,
        cambios_condicion: data.cambiosCondicion,
        refurbished: data.refurbished,
        nuevos: data.nuevos,
        ms_procesamiento: data.msProcesamiento,
      })
      .select("id")
      .single();
    if (error || !comp) throw new Error(error?.message ?? "Insert failed");

    const CHUNK = 500;
    for (let i = 0; i < data.rows.length; i += CHUNK) {
      const chunk = data.rows.slice(i, i + CHUNK).map((r) => ({
        comparacion_id: comp.id,
        orden: r.orden,
        codigo: r.codigo || null,
        part_number: r.partNumber || null,
        descripcion: r.descripcion || null,
        marca: r.marca || null,
        condicion_prev: r.condicionPrev || null,
        condicion_curr: r.condicionCurr || null,
        precio_prev: r.precioPrev,
        precio_curr: r.precioCurr,
        diferencia: r.diferencia,
        variacion_pct: r.variacionPct,
        estado: r.estado,
        observacion: r.observacion || null,
      }));
      const { error: e2 } = await sb.from("productos_comparacion").insert(chunk);
      if (e2) throw new Error(e2.message);
    }

    return { id: comp.id };
  });

export const listComparaciones = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("comparaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getComparacion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverClient();
    const { data: comp, error } = await sb
      .from("comparaciones")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !comp) throw new Error(error?.message ?? "not found");
    const { data: rows, error: e2 } = await sb
      .from("productos_comparacion")
      .select("*")
      .eq("comparacion_id", data.id)
      .order("orden", { ascending: true });
    if (e2) throw new Error(e2.message);
    return { comp, rows: rows ?? [] };
  });

export const deleteComparacion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverClient();
    const { error } = await sb.from("comparaciones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
