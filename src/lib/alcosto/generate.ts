import ExcelJS from "exceljs";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;
import type { ComparisonResult, ComparedRow } from "./types";

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF14315C" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  color: { argb: "FFFFFFFF" },
  bold: true,
  size: 11,
};
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD9D9D9" } },
  bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
  left: { style: "thin", color: { argb: "FFD9D9D9" } },
  right: { style: "thin", color: { argb: "FFD9D9D9" } },
};

const COLOR_MANTIENE = "FFB7F0C4"; // verde intenso
const COLOR_PRECIO = "FFFFE28A"; // amarillo intenso
const COLOR_NUEVO = "FFA9CBFF"; // azul intenso
const COLOR_ELIMINADO = "FFFFA8A8"; // rojo intenso
const COLOR_CONDICION = "FFD8CBFF"; // morado
const COLOR_REFURB = "FFE5E7EB"; // gris claro

function colorForEstado(estado: string): string | undefined {
  switch (estado) {
    case "SE MANTIENE":
      return COLOR_MANTIENE;
    case "PRECIO MODIFICADO":
      return COLOR_PRECIO;
    case "NUEVO PRODUCTO":
      return COLOR_NUEVO;
    case "ELIMINADO":
      return COLOR_ELIMINADO;
    case "CAMBIÓ CONDICIÓN":
      return COLOR_CONDICION;
    default:
      return undefined;
  }
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
  row.height = 26;
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value == null ? "" : String(cell.value);
      max = Math.max(max, Math.min(60, v.length + 2));
    });
    col.width = max;
  });
}

function addUnificado(wb: ExcelJS.Workbook, res: ComparisonResult) {
  const ws = wb.addWorksheet("Unificado", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Marca", key: "marca" },
    { header: "Código", key: "codigo" },
    { header: "Part Number", key: "pn" },
    { header: "Descripción", key: "descripcion" },
    { header: "Condición Anterior", key: "condPrev" },
    { header: "Condición Actual", key: "condCurr" },
    { header: "Precio Anterior", key: "precioPrev" },
    { header: "Precio Actual", key: "precioCurr" },
    { header: "Estado", key: "estado" },
  ];
  styleHeader(ws.getRow(1));

  res.rows.forEach((r) => {
    const row = ws.addRow({
      marca: r.marca,
      codigo: r.codigo,
      pn: r.partNumber,
      descripcion: r.descripcion,
      condPrev: r.condicionPrev,
      condCurr: r.condicionCurr,
      precioPrev: r.precioPrev,
      precioCurr: r.precioCurr,
      estado: r.estado,
    });
    const argb = colorForEstado(r.estado);
    if (argb) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        cell.border = BORDER;
      });
    }
    if (r.condicionCurr === "REFURBISHED") {
      row.getCell("condCurr").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_REFURB } };
      row.getCell("condCurr").font = { bold: true };
    }
    row.getCell("precioPrev").numFmt = '"S/ "#,##0.00;[Red]"S/ -"#,##0.00';
    row.getCell("precioCurr").numFmt = '"S/ "#,##0.00;[Red]"S/ -"#,##0.00';
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  autoWidth(ws);
}

function addFilteredSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: ComparedRow[],
  estadoColor: string | undefined,
) {
  if (rows.length === 0) return;
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Código", key: "codigo" },
    { header: "Part Number", key: "pn" },
    { header: "Descripción", key: "descripcion" },
    { header: "Marca", key: "marca" },
    { header: "Condición", key: "cond" },
    { header: "Precio Anterior", key: "precioPrev" },
    { header: "Precio Actual", key: "precioCurr" },
    { header: "Diferencia", key: "diferencia" },
    { header: "Variación %", key: "variacion" },
    { header: "Observación", key: "observacion" },
  ];
  styleHeader(ws.getRow(1));
  rows.forEach((r) => {
    const row = ws.addRow({
      codigo: r.codigo,
      pn: r.partNumber,
      descripcion: r.descripcion,
      marca: r.marca,
      cond: r.condicionCurr || r.condicionPrev,
      precioPrev: r.precioPrev,
      precioCurr: r.precioCurr,
      diferencia: r.diferencia,
      variacion: r.variacionPct != null ? r.variacionPct / 100 : null,
      observacion: r.observacion,
    });
    if (estadoColor) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: estadoColor } };
        c.border = BORDER;
      });
    }
    row.getCell("precioPrev").numFmt = '"S/ "#,##0.00';
    row.getCell("precioCurr").numFmt = '"S/ "#,##0.00';
    row.getCell("diferencia").numFmt = '"S/ "#,##0.00;[Red]"S/ -"#,##0.00';
    row.getCell("variacion").numFmt = "0.00%;[Red]-0.00%";
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  autoWidth(ws);
}

function addResumen(wb: ExcelJS.Workbook, res: ComparisonResult) {
  const ws = wb.addWorksheet("Resumen");
  ws.columns = [
    { header: "Métrica", key: "k", width: 40 },
    { header: "Valor", key: "v", width: 20 },
  ];
  styleHeader(ws.getRow(1));
  const rows = [
    ["Archivo base", res.fileNameBase],
    ["Archivo nuevo", res.fileNameNueva],
    ["Productos anteriores", res.totalPrev],
    ["Productos actuales", res.totalCurr],
    ["Productos agregados", res.agregados],
    ["Productos eliminados", res.eliminados],
    ["Cambios de precio", res.cambiosPrecio],
    ["Cambios de condición", res.cambiosCondicion],
    ["REFURBISHED (actual)", res.refurbished],
    ["NUEVOS (actual)", res.nuevos],
    ["Se mantienen", res.seMantiene],
    ["Tiempo procesamiento (ms)", res.msProcesamiento],
  ] as const;
  rows.forEach(([k, v]) => {
    const row = ws.addRow({ k, v });
    row.eachCell((c) => (c.border = BORDER));
  });

  ws.addRow([]);
  const legendHeader = ws.addRow(["Leyenda de colores", ""]);
  legendHeader.getCell(1).font = { bold: true };
  const legend: [string, string][] = [
    ["Se mantiene", COLOR_MANTIENE],
    ["Precio modificado", COLOR_PRECIO],
    ["Nuevo producto", COLOR_NUEVO],
    ["Eliminado", COLOR_ELIMINADO],
    ["Cambio condición", COLOR_CONDICION],
    ["Refurbished", COLOR_REFURB],
  ];
  legend.forEach(([label, argb]) => {
    const r = ws.addRow([label, ""]);
    r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    r.eachCell((c) => (c.border = BORDER));
  });
}

export async function generateExcel(res: ComparisonResult): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ALCOSTO Comparator";
  wb.created = new Date();

  addResumen(wb, res);
  addUnificado(wb, res);
  addFilteredSheet(
    wb,
    "Agregados",
    res.rows.filter((r) => r.estado === "NUEVO PRODUCTO"),
    COLOR_NUEVO,
  );
  addFilteredSheet(
    wb,
    "Eliminados",
    res.rows.filter((r) => r.estado === "ELIMINADO"),
    COLOR_ELIMINADO,
  );
  addFilteredSheet(
    wb,
    "Cambios de precio",
    res.rows.filter((r) => r.estado === "PRECIO MODIFICADO"),
    COLOR_PRECIO,
  );

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadExcel(res: ComparisonResult) {
  const blob = await generateExcel(res);
  saveAs(blob, res.outputFileName);
}
