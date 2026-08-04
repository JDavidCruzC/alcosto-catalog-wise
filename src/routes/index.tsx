import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  Sparkles,
  Tag,
  Timer,
  TrendingUp,
} from "lucide-react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatCard } from "@/components/StatCard";
import { ComparisonPreview } from "@/components/ComparisonPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { processFiles } from "@/lib/alcosto/orchestrator";
import { downloadExcel } from "@/lib/alcosto/generate";
import { saveComparacion } from "@/lib/alcosto/db.functions";
import { AI_ENGINE_VERSION, AI_MODEL_LABEL } from "@/lib/alcosto/ai-config";
import type { ComparisonResult } from "@/lib/alcosto/types";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: ComparadorPage,
});

function toIsoDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function ComparadorPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const active = results[activeIdx];

  const run = async (onlyLast: boolean) => {
    if (files.length < 2) {
      toast.error("Necesitas al menos 2 archivos Excel.");
      return;
    }
    try {
      setBusy(true);
      setResults([]);
      setProgress(10);
      const out = await processFiles(files, onlyLast, {
        onStage: (s) => {
          setStage(s);
          setProgress((p) => Math.min(85, p + 25));
        },
      });
      setProgress(90);
      setStage("Guardando historial…");
      // Persist to Cloud (fire and continue on error)
      await Promise.all(
        out.map((res) =>
          saveComparacion({
            data: {
              fechaBase: toIsoDate(res.fechaBase),
              fechaNueva: toIsoDate(res.fechaNueva),
              fileNameBase: res.fileNameBase,
              fileNameNueva: res.fileNameNueva,
              outputFileName: res.outputFileName,
              totalPrev: res.totalPrev,
              totalCurr: res.totalCurr,
              agregados: res.agregados,
              eliminados: res.eliminados,
              cambiosPrecio: res.cambiosPrecio,
              cambiosCondicion: res.cambiosCondicion,
              refurbished: res.refurbished,
              nuevos: res.nuevos,
              msProcesamiento: res.msProcesamiento,
              rows: res.rows,
            },
          }).catch((e) => {
            console.error("save error", e);
          }),
        ),
      );
      setResults(out);
      setActiveIdx(0);
      setProgress(100);
      setStage("Listo");
      toast.success(`${out.length} comparación${out.length > 1 ? "es" : ""} generada${out.length > 1 ? "s" : ""}.`);
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResults([]);
    setFiles([]);
    setStage("");
    setProgress(0);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-8">
      {/* Hero */}
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Sistema inteligente de comparación · Detección de marcas con IA
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Motor IA: {AI_MODEL_LABEL} · {AI_ENGINE_VERSION}
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Comparador ALCOSTO
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Sube dos o más listas .xlsx. Detectamos la fecha, ordenamos cronológicamente, comparamos por
          código → part number → descripción y generamos un Excel profesional con colores, filtros y
          formato monetario.
        </p>
      </div>

      {results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Cargar archivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileDropzone files={files} onChange={setFiles} />

            {busy && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {stage || "Procesando…"}
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => run(false)}
                disabled={busy || files.length < 2}
                className="min-w-[220px]"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Comparar todas (consecutivas)
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => run(true)}
                disabled={busy || files.length < 2}
              >
                Comparar solo las 2 últimas
              </Button>
              {files.length > 0 && (
                <Button size="lg" variant="ghost" onClick={reset} disabled={busy}>
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && active && (
        <>
          {/* Tabs de comparaciones */}
          {results.length > 1 && (
            <Tabs value={String(activeIdx)} onValueChange={(v) => setActiveIdx(Number(v))}>
              <TabsList className="flex-wrap">
                {results.map((r, i) => (
                  <TabsTrigger key={i} value={String(i)}>
                    {r.fechaBase?.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} →{" "}
                    {r.fechaNueva?.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                  </TabsTrigger>
                ))}
              </TabsList>
              {results.map((_, i) => (
                <TabsContent key={i} value={String(i)} />
              ))}
            </Tabs>
          )}

          {/* Dashboard cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            <StatCard label="Comparados" value={active.totalCurr} icon={Layers} />
            <StatCard label="Nuevos" value={active.agregados} icon={Plus} tone="info" />
            <StatCard label="Eliminados" value={active.eliminados} icon={Minus} tone="destructive" />
            <StatCard label="Cambio precio" value={active.cambiosPrecio} icon={TrendingUp} tone="warning" />
            <StatCard label="Cambio condición" value={active.cambiosCondicion} icon={RefreshCcw} tone="brand" />
            <StatCard label="REFURBISHED" value={active.refurbished} icon={Tag} />
            <StatCard label="NUEVOS" value={active.nuevos} icon={CheckCircle2} tone="success" />
            <StatCard
              label="Procesado en"
              value={`${(active.msProcesamiento / 1000).toFixed(1)}s`}
              icon={Timer}
            />
          </div>

          {/* Action bar */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{active.outputFileName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {active.fileNameBase} → {active.fileNameNueva}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset}>
                  Nueva comparación
                </Button>
                <Button onClick={() => downloadExcel(active)} size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="min-h-[560px]">
            <CardHeader>
              <CardTitle className="text-base">Vista previa · Hoja Unificado</CardTitle>
            </CardHeader>
            <CardContent className="h-[600px]">
              <ComparisonPreview rows={active.rows} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
