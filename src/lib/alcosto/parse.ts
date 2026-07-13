import ExcelJS from "exceljs";
import type { ParsedFile, ParsedRow, Condicion } from "./types";

export function detectDateFromFilename(name: string): Date | null {
  // Formats: 20.06.2026 | 20-06-2026 | 20_06_2026 | 20/06/2026
  const m = name.match(/(\d{2})[.\-_/](\d{2})[.\-_/](\d{4})/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

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
  const s = String(v ?? "")
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

/** Parse an .xlsx file and return normalized rows + extracted brand images (base64). */
export async function parseAlcostoFile(file: File): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  const arr = await file.arrayBuffer();
  await wb.xlsx.load(arr);

  const ws = wb.worksheets[0];
  if (!ws) return { fileName: file.name, fecha: detectDateFromFilename(file.name), rows: [] };

  // Locate header row (first row that contains "CODIGO" or "DESCRIPCION")
  let headerRow = 1;
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const values = ws.getRow(r).values as unknown[];
    if (values.some((v) => /CODIGO|CÓDIGO|DESCRIPCION|DESCRIPCIÓN|PART/.test(norm(v)))) {
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

  // Extract images per row (brand column). exceljs images have range.tl.nativeRow (0-indexed)
  const images = ws.getImages();
  const imgByRow = new Map<number, { buffer: ArrayBuffer }>();
  const mediaList = (wb.model as unknown as { media: Array<{ index?: number; buffer: ArrayBuffer }> }).media ?? [];
  for (const img of images) {
    const nativeRow = img.range.tl.nativeRow;
    const excelRow = nativeRow + 1;
    if (imgByRow.has(excelRow)) continue;
    const imageIdNum = Number(img.imageId);
    const media = mediaList.find((m) => m.index === imageIdNum) ?? mediaList[imageIdNum];
    if (media?.buffer) imgByRow.set(excelRow, { buffer: media.buffer });
  }


  const rows: ParsedRow[] = [];
  const total = ws.rowCount;
  for (let r = headerRow + 1; r <= total; r++) {
    const row = ws.getRow(r);
    const getVal = (key: string) => {
      const c = colMap[key];
      if (!c) return "";
      const cell = row.getCell(c);
      return cell.value ?? "";
    };
    const codigo = String(getVal("codigo") ?? "").trim();
    const partNumber = String(getVal("partNumber") ?? "").trim();
    const descripcion = String(getVal("descripcion") ?? "").trim();
    const precio = parsePrecio(getVal("precio"));
    const condicion = parseCondicion(getVal("condicion"));
    const status = String(getVal("status") ?? "").trim();
    const marca = String(getVal("marca") ?? "").trim();
    if (!codigo && !partNumber && !descripcion) continue;

    const imgEntry = imgByRow.get(r);
    let imageBase64: string | undefined;
    let imageHash: string | undefined;
    if (imgEntry?.buffer) {
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
      marca,
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
