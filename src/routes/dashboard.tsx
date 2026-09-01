import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Tag,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { listComparaciones } from "@/lib/alcosto/db.functions";
import { UsageCounter } from "@/components/UsageCounter";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const list = useServerFn(listComparaciones);
  const { data } = useQuery({ queryKey: ["historial"], queryFn: () => list() });

  const stats = useMemo(() => {
    const arr = data ?? [];
    const totals = arr.reduce(
      (acc, c) => {
        acc.agregados += c.agregados;
        acc.eliminados += c.eliminados;
        acc.cambios_precio += c.cambios_precio;
        acc.refurbished += c.refurbished;
        acc.nuevos += c.nuevos;
        return acc;
      },
      { agregados: 0, eliminados: 0, cambios_precio: 0, refurbished: 0, nuevos: 0 },
    );
    return { totals, count: arr.length };
  }, [data]);

  const chartData = useMemo(() => {
    return [...(data ?? [])]
      .slice()
      .reverse()
      .map((c) => ({
        fecha: c.fecha_nueva ?? new Date(c.created_at).toISOString().slice(0, 10),
        agregados: c.agregados,
        eliminados: c.eliminados,
        cambios: c.cambios_precio,
        refurb: c.refurbished,
      }));
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inteligencia comercial</h1>
          <p className="text-sm text-muted-foreground">
            Métricas agregadas sobre todas las comparaciones realizadas.
          </p>
        </div>
        <div className="ml-auto hidden md:block">
          <UsageCounter />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Comparaciones" value={stats.count} icon={BarChart3} tone="brand" />
        <StatCard label="Productos nuevos totales" value={stats.totals.agregados} icon={Plus} tone="info" />
        <StatCard label="Eliminados totales" value={stats.totals.eliminados} icon={Minus} tone="destructive" />
        <StatCard label="Cambios de precio" value={stats.totals.cambios_precio} icon={TrendingUp} tone="warning" />
        <StatCard label="REFURBISHED" value={stats.totals.refurbished} icon={Tag} tone="default" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución por fecha</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 40%)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="agregados" stroke="var(--info)" strokeWidth={2} />
              <Line type="monotone" dataKey="eliminados" stroke="var(--destructive)" strokeWidth={2} />
              <Line type="monotone" dataKey="cambios" stroke="var(--warning)" strokeWidth={2} />
              <Line type="monotone" dataKey="refurb" stroke="var(--brand)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volumen por comparación</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 40%)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="agregados" fill="var(--info)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="eliminados" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cambios" fill="var(--warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {stats.count === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no hay datos. Realiza una comparación para poblar el dashboard.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
