import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import type { ComparedRow, EstadoProducto } from "@/lib/alcosto/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ESTADOS: (EstadoProducto | "TODOS")[] = [
  "TODOS",
  "SE MANTIENE",
  "PRECIO MODIFICADO",
  "NUEVO PRODUCTO",
  "ELIMINADO",
  "CAMBIÓ CONDICIÓN",
];
const CONDS = ["TODAS", "NUEVO", "REFURBISHED"] as const;

const estadoPill: Record<EstadoProducto, string> = {
  "SE MANTIENE": "status-mantiene",
  "PRECIO MODIFICADO": "status-precio",
  "NUEVO PRODUCTO": "status-nuevo",
  ELIMINADO: "status-eliminado",
  "CAMBIÓ CONDICIÓN": "status-condicion",
};

const rowTint: Record<EstadoProducto, string> = {
  "SE MANTIENE": "bg-[color-mix(in_oklab,var(--success)_12%,transparent)]",
  "PRECIO MODIFICADO": "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)]",
  "NUEVO PRODUCTO": "bg-[color-mix(in_oklab,var(--info)_14%,transparent)]",
  ELIMINADO: "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)]",
  "CAMBIÓ CONDICIÓN": "bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]",
};

type SortKey = "orden" | "marca" | "codigo" | "descripcion" | "precioCurr" | "estado";

function fmtMoney(n: number | null) {
  if (n == null || n === 0) return "—";
  return n.toLocaleString("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 });
}

export function ComparisonPreview({ rows }: { rows: ComparedRow[] }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<(EstadoProducto | "TODOS")>("TODOS");
  const [cond, setCond] = useState<(typeof CONDS)[number]>("TODAS");
  const [marca, setMarca] = useState<string>("TODAS");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "orden", dir: 1 });

  const marcas = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.marca && s.add(r.marca));
    return ["TODAS", ...Array.from(s).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toUpperCase();
    let out = rows.filter((r) => {
      if (estado !== "TODOS" && r.estado !== estado) return false;
      if (cond !== "TODAS" && r.condicionCurr !== cond && r.condicionPrev !== cond) return false;
      if (marca !== "TODAS" && r.marca !== marca) return false;
      if (term) {
        const hay = `${r.codigo} ${r.partNumber} ${r.descripcion} ${r.marca}`.toUpperCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
    return out;
  }, [rows, q, estado, cond, marca, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap", className)} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn("h-3 w-3 opacity-40", sort.key === k && "opacity-100")} />
      </span>
    </TableHead>
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código, part number, descripción…"
            className="pl-9"
          />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoProducto | "TODOS")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cond} onValueChange={(v) => setCond(v as (typeof CONDS)[number])}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Condición" />
          </SelectTrigger>
          <SelectContent>
            {CONDS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {marcas.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} filas</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <Th k="marca">Marca</Th>
              <Th k="codigo">Código</Th>
              <TableHead>Part Number</TableHead>
              <Th k="descripcion">Descripción</Th>
              <TableHead>Condición Anterior</TableHead>
              <TableHead>Condición Actual</TableHead>
              <TableHead className="text-right">Precio Anterior</TableHead>
              <Th k="precioCurr" className="text-right">Precio Actual</Th>
              <Th k="estado">Estado</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 2000).map((r, i) => (
              <TableRow key={`${r.codigo}-${r.partNumber}-${i}`} className={cn(rowTint[r.estado])}>
                <TableCell className="text-xs font-semibold uppercase">{r.marca || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                <TableCell className="font-mono text-xs">{r.partNumber}</TableCell>
                <TableCell className="max-w-[420px] truncate" title={r.descripcion}>
                  {r.descripcion}
                </TableCell>
                <TableCell className="text-xs">{r.condicionPrev || "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.condicionCurr === "REFURBISHED" ? (
                    <Badge variant="secondary">REFURB</Badge>
                  ) : (
                    r.condicionCurr || "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtMoney(r.precioPrev)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtMoney(r.precioCurr)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      estadoPill[r.estado],
                    )}
                  >
                    {r.estado}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 2000 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            Mostrando primeras 2 000 filas. Descarga el Excel para verlas todas.
          </div>
        ) : null}
      </div>
    </div>
  );
}
