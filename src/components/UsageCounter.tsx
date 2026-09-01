import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity } from "lucide-react";
import { getUsoStats } from "@/lib/alcosto/db.functions";
import { cn } from "@/lib/utils";

export function UsageCounter({ className }: { className?: string }) {
  const stats = useServerFn(getUsoStats);
  const { data } = useQuery({
    queryKey: ["uso-stats"],
    queryFn: () => stats(),
    staleTime: 30_000,
  });

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
      title="Comparaciones y descargas registradas"
    >
      <Activity className="h-3.5 w-3.5 text-brand" />
      <span>
        Usos registrados:{" "}
        <span className="font-semibold text-foreground">{data?.total ?? "—"}</span>
      </span>
      {data ? (
        <span className="hidden text-muted-foreground/80 sm:inline">
          · {data.comparaciones} comparaciones · {data.descargas} descargas
        </span>
      ) : null}
    </div>
  );
}
