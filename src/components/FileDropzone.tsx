import { useCallback, useState } from "react";
import { FileSpreadsheet, UploadCloud, X, Calendar } from "lucide-react";
import { detectDateFromFilename } from "@/lib/alcosto/parse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

export function FileDropzone({ files, onChange }: Props) {
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list).filter((f) => /\.xlsx?$/i.test(f.name));
      const dedup = new Map<string, File>();
      [...files, ...incoming].forEach((f) => dedup.set(`${f.name}-${f.size}`, f));
      onChange(Array.from(dedup.values()));
    },
    [files, onChange],
  );

  const remove = (idx: number) => {
    const next = [...files];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="text-base font-medium">Arrastra tus archivos ALCOSTO .xlsx aquí</p>
          <p className="text-sm text-muted-foreground">
            o haz clic para seleccionar. La fecha se detecta automáticamente del nombre.
          </p>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {files
            .map((f, i) => ({ f, i, fecha: detectDateFromFilename(f.name) }))
            .sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0))
            .map(({ f, i, fecha }) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {fecha
                      ? fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
                      : "Sin fecha detectada"}
                    <span>·</span>
                    <span>{(f.size / 1024).toFixed(1)} KB</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Quitar">
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
