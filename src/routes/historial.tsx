import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, Eye, Loader2, Search, Trash2, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ComparisonPreview } from "@/components/ComparisonPreview";
import { deleteComparacion, getComparacion, listComparaciones } from "@/lib/alcosto/db.functions";
import { downloadExcel } from "@/lib/alcosto/generate";
import type { ComparisonResult, ComparedRow, EstadoProducto, Condicion } from "@/lib/alcosto/types";

export const Route = createFileRoute("/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  const qc = useQueryClient();
  const list = useServerFn(listComparaciones);
  const get = useServerFn(getComparacion);
  const del = useServerFn(deleteComparacion);

  const [q, setQ] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewResult, setViewResult] = useState<ComparisonResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["historial"],
    queryFn: () => list(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Comparación eliminada");
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e) => toast.error("Error: " + (e as Error).message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((c) =>
      `${c.nombre_archivo_generado} ${c.nombre_archivo_base ?? ""} ${c.nombre_archivo_nuevo ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [data, q]);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const { comp, rows } = await get({ data: { id } });
      const result: ComparisonResult = {
        fechaBase: comp.fecha_base ? new Date(comp.fecha_base) : null,
        fechaNueva: comp.fecha_nueva ? new Date(comp.fecha_nueva) : null,
        fileNameBase: comp.nombre_archivo_base ?? "",
        fileNameNueva: comp.nombre_archivo_nuevo ?? "",
        outputFileName: comp.nombre_archivo_generado,
        totalPrev: comp.total_prev,
        totalCurr: comp.total_curr,
        agregados: comp.agregados,
        eliminados: comp.eliminados,
        cambiosPrecio: comp.cambios_precio,
        cambiosCondicion: comp.cambios_condicion,
        refurbished: comp.refurbished,
        nuevos: comp.nuevos,
        seMantiene:
          comp.total_curr - comp.agregados - comp.cambios_precio - comp.cambios_condicion,
        msProcesamiento: comp.ms_procesamiento,
        rows: rows.map<ComparedRow>((r) => ({
          codigo: r.codigo ?? "",
          partNumber: r.part_number ?? "",
          descripcion: r.descripcion ?? "",
          marca: r.marca ?? "",
          condicionPrev: (r.condicion_prev ?? "") as Condicion,
          condicionCurr: (r.condicion_curr ?? "") as Condicion,
          precioPrev: r.precio_prev == null ? null : Number(r.precio_prev),
          precioCurr: r.precio_curr == null ? null : Number(r.precio_curr),
          diferencia: r.diferencia == null ? null : Number(r.diferencia),
          variacionPct: r.variacion_pct == null ? null : Number(r.variacion_pct),
          estado: r.estado as EstadoProducto,
          observacion: r.observacion ?? "",
          orden: r.orden,
        })),
      };
      await downloadExcel(result);
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HistoryIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de comparaciones</h1>
          <p className="text-sm text-muted-foreground">
            Vuelve a descargar cualquier Excel o elimina registros antiguos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            {isLoading ? "Cargando…" : `${filtered.length} comparaciones`}
          </CardTitle>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar archivo…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Base → Nuevo</TableHead>
                <TableHead className="text-right">Nuevos</TableHead>
                <TableHead className="text-right">Eliminados</TableHead>
                <TableHead className="text-right">Cambios ↑↓</TableHead>
                <TableHead className="text-right">REFURB</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("es-PE")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{c.nombre_archivo_generado}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.fecha_base ?? "?"} → {c.fecha_nueva ?? "?"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.agregados}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.eliminados}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.cambios_precio}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.refurbished}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.total_curr}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingId === c.id}
                        onClick={() => handleDownload(c.id)}
                      >
                        {downloadingId === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta comparación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminarán todos los productos asociados. No puede deshacerse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(c.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No hay comparaciones aún. Genera una desde el comparador.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
