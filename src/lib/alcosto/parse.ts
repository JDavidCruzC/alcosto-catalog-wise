import ExcelJS from "exceljs";
import type { ParsedFile, ParsedRow, Condicion } from "./types";

export function detectDateFromFilename(name: string): Date | null {
  const m = name.match(/(\d{2})[.\-_/](\d{2})[.\-_/](\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

/** Extract plain text from an ExcelJS cell.value (handles richText, hyperlink, formula results). */
function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray((o as { richText?: unknown }).richText)) {
      return ((o as { richText: Array<{ text?: string }> }).richText)
        .map((r) => r.text ?? "")
        .join("");
    }
    if (typeof o.text === "string") return o.text as string;
    if (o.text && typeof (o.text as { richText?: unknown }).richText !== "undefined") {
      const rt = (o.text as { richText: Array<{ text?: string }> }).richText;
      return rt.map((r) => r.text ?? "").join("");
    }
    if (typeof o.result === "string") return o.result as string;
    if (typeof o.result === "number") return String(o.result);
    if (typeof o.formula === "string" && typeof o.result !== "undefined") return cellText(o.result);
  }
  return "";
}

const norm = (s: unknown) =>
  cellText(s).replace(/\s+/g, " ").trim().toUpperCase();

const HEADER_MAP: Record<string, string> = {
  CODIGO: "codigo",
  "CÓDIGO": "codigo",
  COD: "codigo",
  "PART NUMBER": "partNumber",
  "PART#": "partNumber",
  "PART NO": "partNumber",
  PN: "partNumber",
  "PART NO.": "partNumber",
  DESCRIPCION: "descripcion",
  "DESCRIPCIÓN": "descripcion",
  DESCRIPTION: "descripcion",
  "PRECIO INCLUIDO IGV": "precio",
  "PRECIO IGV": "precio",
  "PRECIO CON IGV": "precio",
  PRECIO: "precio",
  "P. VENTA": "precio",
  "P VENTA": "precio",
  CONDICION: "condicion",
  "CONDICIÓN": "condicion",
  ESTADO: "condicion",
  STATUS: "status",
  MARCA: "marca",
  BRAND: "marca",
};

function parseCondicion(v: unknown): Condicion {
  const u = norm(v);
  if (u.includes("REFURB")) return "REFURBISHED";
  if (u === "NUEVO" || u === "NEW" || u === "N") return "NUEVO";
  return "";
}

function parsePrecio(v: unknown): number {
  if (typeof v === "number") return v;
  const raw = cellText(v);
  const s = raw
    .replace(/[^\d.,\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function sha1(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function parseAlcostoFile(file: File): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  const arr = await file.arrayBuffer();
  await wb.xlsx.load(arr);

  const ws = wb.worksheets[0];
  if (!ws) return { fileName: file.name, fecha: detectDateFromFilename(file.name), rows: [] };

  // Locate header row (scan more rows because ALCOSTO has banners on top)
  let headerRow = 1;
  const scanMax = Math.min(30, ws.rowCount);
  for (let r = 1; r <= scanMax; r++) {
    const values = ws.getRow(r).values as unknown[];
    const joined = values.map((v) => norm(v)).join(" | ");
    if (/CODIGO|CÓDIGO/.test(joined) && /PART/.test(joined) && /DESCRIPCION|DESCRIPCIÓN/.test(joined)) {
      headerRow = r;
      break;
    }
  }

  const headerVals = ws.getRow(headerRow).values as unknown[];
  const colMap: Record<string, number> = {};
  for (let c = 1; c < headerVals.length; c++) {
    const key = HEADER_MAP[norm(headerVals[c])];
    if (key && !(key in colMap)) colMap[key] = c;
  }

  // Map each row to an image spanning that row (logo banners span multiple rows)
  const images = ws.getImages();
  const mediaList =
    (wb.model as unknown as { media: Array<{ index?: number; buffer: ArrayBuffer }> }).media ?? [];
  const imgByRow = new Map<number, { buffer: ArrayBuffer }>();
  for (const img of images) {
    const startRow = img.range.tl.nativeRow + 1;
    const endRow = Math.max(startRow, Math.floor(img.range.br.nativeRow) + 1);
    const imageIdNum = Number(img.imageId);
    const media = mediaList.find((m) => m.index === imageIdNum) ?? mediaList[imageIdNum];
    if (!media?.buffer) continue;
    for (let rr = startRow; rr <= endRow; rr++) {
      if (!imgByRow.has(rr)) imgByRow.set(rr, { buffer: media.buffer });
    }
  }

  // Two-pass: first scan for image banners/section headers, then rows.
  // We iterate top-down and keep a rolling "currentMarca" context that updates on:
  //   - a section-label row (codigo === partNumber === descripcion, no price/condicion)
  //   - a logo image banner (image spans this row and no text in codigo)
  const rows: ParsedRow[] = [];
  let currentMarca = "";
  let pendingImageHash: string | undefined; // if a banner has no visible marca, AI will fill it later
  let pendingImageBase64: string | undefined;

  const total = ws.rowCount;
  for (let r = headerRow + 1; r <= total; r++) {
    const row = ws.getRow(r);
    const getVal = (key: string) => {
      const c = colMap[key];
      if (!c) return "";
      return row.getCell(c).value;
    };
    const codigo = cellText(getVal("codigo")).trim();
    const partNumber = cellText(getVal("partNumber")).trim();
    const descripcion = cellText(getVal("descripcion")).trim();
    const precio = parsePrecio(getVal("precio"));
    const condicion = parseCondicion(getVal("condicion"));
    const status = cellText(getVal("status")).trim();
    const marca = cellText(getVal("marca")).trim();

    const emptyCore = !codigo && !partNumber && !descripcion;

    // Repeated header inside the sheet ("CODIGO / PART NUMBER / DESCRIPCION")
    if (norm(codigo) === "CODIGO" && norm(partNumber) === "PART NUMBER") continue;

    // Image banner row: has an image and no product data — mark as context
    const imgEntry = imgByRow.get(r);
    if (imgEntry && emptyCore) {
      const buf = imgEntry.buffer;
      pendingImageHash = await sha1(buf);
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      pendingImageBase64 = btoa(binary);
      // If the same row has explicit marca text, use it directly
      if (marca) currentMarca = marca.toUpperCase();
      continue;
    }

    if (emptyCore) continue;

    // Section-label row: codigo == partNumber == descripcion (e.g. "AMAZON AMAZON AMAZON",
    // "IPADS IPADS IPADS", "M1 M1 M1", "Flip 7 Flip 7 Flip 7"). Not a product.
    const isSection =
      codigo &&
      norm(codigo) === norm(partNumber) &&
      norm(codigo) === norm(descripcion) &&
      precio === 0 &&
      !condicion;
    if (isSection) {
      currentMarca = codigo.toUpperCase();
      // Clear pending image context — text label wins.
      pendingImageHash = undefined;
      pendingImageBase64 = undefined;
      continue;
    }

    // Also skip rows that look like a category header spanning ("CODIGO PART NUMBER DESCRIPCION" reused)
    if (norm(descripcion) === "DESCRIPCION" || norm(descripcion) === "DESCRIPCIÓN") continue;

    // Attach any logo image on this exact product row for AI enrichment (fallback)
    let imageBase64: string | undefined = pendingImageBase64;
    let imageHash: string | undefined = pendingImageHash;
    if (imgEntry) {
      const buf = imgEntry.buffer;
      imageHash = await sha1(buf);
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      imageBase64 = btoa(binary);
    }

    rows.push({
      codigo,
      partNumber,
      descripcion,
      precio,
      condicion,
      status,
      marca: marca || currentMarca,
      rowIndex: r,
      imageBase64,
      imageHash,
    });
  }

  return {
    fileName: file.name,
    fecha: detectDateFromFilename(file.name),
    rows,
  };
}
