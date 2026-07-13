import type {
  ComparisonResult,
  ComparedRow,
  ParsedFile,
  ParsedRow,
  Condicion,
  EstadoProducto,
} from "./types";

const keyCodigo = (r: ParsedRow) => (r.codigo || "").trim().toUpperCase();
const keyPN = (r: ParsedRow) => (r.partNumber || "").trim().toUpperCase();
const keyDesc = (r: ParsedRow) => (r.descripcion || "").trim().toUpperCase();

function fmtDMY(d: Date | null): string {
  if (!d) return "SD";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}
function fmtDMYYear(d: Date | null): string {
  if (!d) return "SD";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function compareFiles(prev: ParsedFile, curr: ParsedFile): ComparisonResult {
  const t0 = performance.now();

  const prevByCode = new Map<string, ParsedRow>();
  const prevByPN = new Map<string, ParsedRow>();
  const prevByDesc = new Map<string, ParsedRow>();
  for (const r of prev.rows) {
    if (keyCodigo(r)) prevByCode.set(keyCodigo(r), r);
    if (keyPN(r)) prevByPN.set(keyPN(r), r);
    if (keyDesc(r)) prevByDesc.set(keyDesc(r), r);
  }

  const matchedPrev = new Set<ParsedRow>();
  const rows: ComparedRow[] = [];
  let agregados = 0,
    eliminados = 0,
    cambiosPrecio = 0,
    cambiosCondicion = 0,
    refurbished = 0,
    nuevos = 0,
    seMantiene = 0;

  const findPrev = (r: ParsedRow): ParsedRow | undefined => {
    if (keyCodigo(r) && prevByCode.has(keyCodigo(r))) return prevByCode.get(keyCodigo(r));
    if (keyPN(r) && prevByPN.has(keyPN(r))) return prevByPN.get(keyPN(r));
    if (keyDesc(r) && prevByDesc.has(keyDesc(r))) return prevByDesc.get(keyDesc(r));
    return undefined;
  };

  // Iterate current file preserving order (bloques de marca)
  curr.rows.forEach((r, idx) => {
    const p = findPrev(r);
    let estado: EstadoProducto;
    let observacion = "";
    let precioPrev: number | null = null;
    let condicionPrev: Condicion = "";
    if (p) {
      matchedPrev.add(p);
      precioPrev = p.precio || 0;
      condicionPrev = p.condicion;
      const precioChanged = Math.abs((p.precio || 0) - (r.precio || 0)) > 0.005;
      const condChanged = p.condicion !== r.condicion && p.condicion !== "" && r.condicion !== "";
      if (condChanged) {
        estado = "CAMBIÓ CONDICIÓN";
        observacion = `${p.condicion} → ${r.condicion}`;
        cambiosCondicion++;
      } else if (precioChanged) {
        estado = "PRECIO MODIFICADO";
        const diff = (r.precio || 0) - (p.precio || 0);
        observacion = diff > 0 ? "Subió de precio" : "Bajó de precio";
        cambiosPrecio++;
      } else {
        estado = "SE MANTIENE";
        seMantiene++;
      }
    } else {
      estado = "NUEVO PRODUCTO";
      observacion = "Ingreso nuevo";
      agregados++;
    }

    if (r.condicion === "REFURBISHED") refurbished++;
    if (r.condicion === "NUEVO") nuevos++;

    const diferencia =
      precioPrev != null && r.precio != null ? Number(((r.precio || 0) - precioPrev).toFixed(2)) : null;
    const variacionPct =
      precioPrev && precioPrev !== 0 && diferencia != null
        ? Number(((diferencia / precioPrev) * 100).toFixed(2))
        : null;

    rows.push({
      codigo: r.codigo,
      partNumber: r.partNumber,
      descripcion: r.descripcion,
      marca: r.marca,
      condicionPrev,
      condicionCurr: r.condicion,
      precioPrev,
      precioCurr: r.precio ?? null,
      diferencia,
      variacionPct,
      estado,
      observacion,
      orden: idx,
    });
  });

  // Eliminados: los que estaban antes y no están ahora
  let ordEliminado = rows.length;
  for (const p of prev.rows) {
    if (matchedPrev.has(p)) continue;
    eliminados++;
    rows.push({
      codigo: p.codigo,
      partNumber: p.partNumber,
      descripcion: p.descripcion,
      marca: p.marca,
      condicionPrev: p.condicion,
      condicionCurr: "",
      precioPrev: p.precio ?? null,
      precioCurr: null,
      diferencia: null,
      variacionPct: null,
      estado: "ELIMINADO",
      observacion: "Ya no aparece en la lista",
      orden: ordEliminado++,
    });
  }

  const outputFileName = `Comparativo_Alcosto_${fmtDMY(prev.fecha)}_vs_${fmtDMYYear(curr.fecha)}.xlsx`;

  return {
    fechaBase: prev.fecha,
    fechaNueva: curr.fecha,
    fileNameBase: prev.fileName,
    fileNameNueva: curr.fileName,
    outputFileName,
    totalPrev: prev.rows.length,
    totalCurr: curr.rows.length,
    agregados,
    eliminados,
    cambiosPrecio,
    cambiosCondicion,
    refurbished,
    nuevos,
    seMantiene,
    msProcesamiento: Math.round(performance.now() - t0),
    rows,
  };
}
