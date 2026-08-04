import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { AI_MODEL_ID, KNOWN_BRANDS, canonicalBrand } from "./ai-config";

const InputSchema = z.object({
  items: z
    .array(
      z.object({
        hash: z.string().min(1),
        base64: z.string().min(1),
        descripcion: z.string().optional().default(""),
      }),
    )
    .max(120),
});

export const detectBrandsFromImages = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const results: Record<string, string> = {};
    if (data.items.length === 0) return { brands: results, model: AI_MODEL_ID };

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 1) Caché persistente por hash de imagen
    const hashes = [...new Set(data.items.map((i) => i.hash))];
    for (let i = 0; i < hashes.length; i += 200) {
      const { data: cached } = await supabase
        .from("marcas_cache")
        .select("image_hash, marca")
        .in("image_hash", hashes.slice(i, i + 200));
      for (const row of cached ?? []) results[row.image_hash] = row.marca;
    }

    const pending = data.items.filter((i) => !(i.hash in results));
    if (pending.length === 0) return { brands: results, model: AI_MODEL_ID };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      for (const p of pending) results[p.hash] = "";
      return { brands: results, model: AI_MODEL_ID };
    }

    const SYSTEM = [
      "Eres un experto en identificación de marcas comerciales a partir de logotipos.",
      "Recibes una o varias imágenes recortadas de un catálogo de productos de tecnología, cómputo y electrodomésticos.",
      "Cada imagen suele ser el LOGOTIPO de la marca (a veces también la foto del producto).",
      "Devuelve el nombre CANÓNICO de la marca en MAYÚSCULAS, sin sufijos legales (Inc, S.A., Corp) ni modelos.",
      "Si la imagen muestra un producto, deduce la marca por el logo impreso, tipografía o forma característica.",
      "Si realmente no se distingue ninguna marca, devuelve cadena vacía \"\".",
      `Marcas frecuentes en este catálogo: ${KNOWN_BRANDS.join(", ")}.`,
      "Si la marca no está en la lista pero la reconoces con certeza, devuélvela igual.",
      'Responde EXCLUSIVAMENTE con un JSON: {"marcas":[{"i":0,"marca":"HP"}, ...]} usando el índice indicado antes de cada imagen.',
    ].join("\n");

    // 2) Lotes pequeños = mayor precisión por imagen
    const CHUNK = 4;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      const content: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: `Identifica la marca de cada una de las ${chunk.length} imágenes siguientes. Usa la descripción del producto como pista adicional solo si la imagen es ambigua.`,
        },
      ];
      chunk.forEach((p, idx) => {
        content.push({
          type: "text",
          text: `Imagen índice ${idx}${p.descripcion ? ` · descripción del producto: "${p.descripcion.slice(0, 160)}"` : ""}`,
        });
        content.push({
          type: "image_url",
          image_url: { url: `data:image/png;base64,${p.base64}` },
        });
      });

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: AI_MODEL_ID,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!resp.ok) {
          console.error("[ai] gateway error", resp.status, await resp.text());
          for (const p of chunk) results[p.hash] = "";
          continue;
        }
        const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = json.choices?.[0]?.message?.content ?? "";
        const objMatch = text.match(/\{[\s\S]*\}/);
        let parsed: { marcas?: Array<{ i?: number; marca?: string }> } = {};
        try {
          parsed = objMatch ? JSON.parse(objMatch[0]) : {};
        } catch {
          parsed = {};
        }
        const byIndex = new Map<number, string>();
        for (const m of parsed.marcas ?? []) {
          if (typeof m?.i === "number") byIndex.set(m.i, String(m.marca ?? ""));
        }

        chunk.forEach((p, idx) => {
          const raw = byIndex.get(idx) ?? "";
          const marca = canonicalBrand(raw) || canonicalBrand(p.descripcion);
          results[p.hash] = marca;
        });

        const toInsert = chunk
          .filter((p) => results[p.hash])
          .map((p) => ({ image_hash: p.hash, marca: results[p.hash]! }));
        if (toInsert.length > 0) {
          await supabase
            .from("marcas_cache")
            .upsert(toInsert, { onConflict: "image_hash", ignoreDuplicates: true });
        }
      } catch (err) {
        console.error("[ai] exception", err);
        for (const p of chunk) results[p.hash] = canonicalBrand(p.descripcion);
      }
    }

    return { brands: results, model: AI_MODEL_ID };
  });
