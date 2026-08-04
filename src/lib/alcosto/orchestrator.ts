import { parseAlcostoFile } from "./parse";
import { compareFiles } from "./compare";
import { detectBrandsFromImages } from "./ai.functions";
import { canonicalBrand } from "./ai-config";
import type { ComparisonResult, ParsedFile } from "./types";

/** Enrich rows with brand: use existing marca col > AI on logo image > text heuristic */
async function enrichBrands(file: ParsedFile): Promise<void> {
  const missing = file.rows.filter((r) => !r.marca && r.imageBase64 && r.imageHash);
  const byHash = new Map<string, string>();
  const uniqueItems: { hash: string; base64: string; descripcion: string }[] = [];
  for (const r of missing) {
    if (!r.imageHash || !r.imageBase64) continue;
    if (!byHash.has(r.imageHash)) {
      byHash.set(r.imageHash, "");
      uniqueItems.push({ hash: r.imageHash, base64: r.imageBase64, descripcion: r.descripcion });
    }
  }
  if (uniqueItems.length > 0) {
    try {
      const { brands } = await detectBrandsFromImages({ data: { items: uniqueItems } });
      for (const [h, m] of Object.entries(brands)) byHash.set(h, canonicalBrand(m));
    } catch (err) {
      console.error("[brand] AI failed", err);
    }
  }
  for (const r of file.rows) {
    if (r.marca) r.marca = canonicalBrand(r.marca) || r.marca;
    if (!r.marca) {
      if (r.imageHash && byHash.get(r.imageHash)) r.marca = byHash.get(r.imageHash) ?? "";
      if (!r.marca) r.marca = canonicalBrand(r.descripcion);
    }
    // strip image payload after use
    r.imageBase64 = undefined;
  }
}

export interface PipelineHooks {
  onStage?: (stage: string) => void;
}

export async function processFiles(
  files: File[],
  onlyLastTwo: boolean,
  hooks: PipelineHooks = {},
): Promise<ComparisonResult[]> {
  hooks.onStage?.("Leyendo archivos Excel…");
  const parsed = await Promise.all(files.map((f) => parseAlcostoFile(f)));
  parsed.sort((a, b) => {
    const ta = a.fecha?.getTime() ?? 0;
    const tb = b.fecha?.getTime() ?? 0;
    return ta - tb;
  });

  hooks.onStage?.("Detectando marcas con IA…");
  for (const p of parsed) await enrichBrands(p);

  const pairs: [ParsedFile, ParsedFile][] = [];
  if (onlyLastTwo || parsed.length === 2) {
    if (parsed.length >= 2) pairs.push([parsed[parsed.length - 2], parsed[parsed.length - 1]]);
  } else {
    for (let i = 0; i < parsed.length - 1; i++) pairs.push([parsed[i], parsed[i + 1]]);
  }

  hooks.onStage?.("Comparando…");
  return pairs.map(([a, b]) => compareFiles(a, b));
}
