export type Condicion = "NUEVO" | "REFURBISHED" | "";

export type EstadoProducto =
  | "SE MANTIENE"
  | "PRECIO MODIFICADO"
  | "NUEVO PRODUCTO"
  | "ELIMINADO"
  | "CAMBIÓ CONDICIÓN";

export interface ParsedRow {
  codigo: string;
  partNumber: string;
  descripcion: string;
  precio: number;
  condicion: Condicion;
  status: string;
  marca: string;
  rowIndex: number;
  imageBase64?: string;
  imageHash?: string;
}

export interface ParsedFile {
  fileName: string;
  fecha: Date | null;
  rows: ParsedRow[];
}

export interface ComparedRow {
  codigo: string;
  partNumber: string;
  descripcion: string;
  marca: string;
  condicionPrev: Condicion;
  condicionCurr: Condicion;
  precioPrev: number | null;
  precioCurr: number | null;
  diferencia: number | null;
  variacionPct: number | null;
  estado: EstadoProducto;
  observacion: string;
  orden: number;
}

export interface ComparisonResult {
  fechaBase: Date | null;
  fechaNueva: Date | null;
  fileNameBase: string;
  fileNameNueva: string;
  outputFileName: string;
  totalPrev: number;
  totalCurr: number;
  agregados: number;
  eliminados: number;
  cambiosPrecio: number;
  cambiosCondicion: number;
  refurbished: number;
  nuevos: number;
  seMantiene: number;
  msProcesamiento: number;
  rows: ComparedRow[];
}
