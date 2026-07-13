import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const InputSchema = z.object({
  items: z.array(z.object({ hash: z.string().min(1), base64: z.string().min(1) })).max(80),
});

export const detectBrandsFromImages = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const results: Record<string, string> = {};
    if (data.items.length === 0) return { brands: results };

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 1) Check cache
    const hashes = [...new Set(data.items.map((i) => i.hash))];
    const { data: cached } = await supabase
      .from("marcas_cache")
      .select("image_hash, marca")
      .in("image_hash", hashes);
    for (const row of cached ?? []) results[row.image_hash] = row.marca;

    const pending = data.items.filter((i) => !(i.hash in results));
    if (pending.length === 0) return { brands: results };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      // fallback: unknown
      for (const p of pending) results[p.hash] = "";
      return { brands: results };
    }

    // 2) Call Lovable AI Gateway (Gemini vision) in small batches
    const CHUNK = 6;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      const content: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: "Estas imágenes son logotipos de marcas de productos electrónicos/tecnología. Devuelve UN JSON array (misma longitud y orden que las imágenes) con SOLO el nombre canónico de la marca en mayúsculas (por ejemplo: APPLE, SAMSUNG, HP, DELL, LENOVO, LG, SONY, XIAOMI, HUAWEI). Si no puedes reconocer una, devuelve cadena vacía. Responde solo con el array JSON, sin texto extra.",
        },
      ];
      for (const p of chunk) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/png;base64,${p.base64}` },
        });
      }

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content }],
          }),
        });
        if (!resp.ok) {
          console.error("[ai] gateway error", resp.status, await resp.text());
          for (const p of chunk) results[p.hash] = "";
          continue;
        }
        const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = json.choices?.[0]?.message?.content ?? "";
        const arrMatch = text.match(/\[[\s\S]*\]/);
        let arr: string[] = [];
        try {
          arr = arrMatch ? (JSON.parse(arrMatch[0]) as string[]) : [];
        } catch {
          arr = [];
        }
        chunk.forEach((p, idx) => {
          const marca = String(arr[idx] ?? "").toUpperCase().trim();
          results[p.hash] = marca;
        });
        const toInsert = chunk
          .filter((p) => results[p.hash])
          .map((p) => ({ image_hash: p.hash, marca: results[p.hash] }));
        if (toInsert.length > 0) {
          await supabase.from("marcas_cache").upsert(toInsert, { onConflict: "image_hash" });
        }
      } catch (err) {
        console.error("[ai] exception", err);
        for (const p of chunk) results[p.hash] = "";
      }
    }

    return { brands: results };
  });
