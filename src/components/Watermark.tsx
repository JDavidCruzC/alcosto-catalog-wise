import { Sparkles } from "lucide-react";

export function Watermark() {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/60 px-4 py-4">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span>
            Desarrollado por <span className="font-semibold text-foreground">Jeremy David Cruz Centeno</span>
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          <span className="font-semibold tracking-wide text-brand">CroosIA</span> · Desarrollo de
          aplicativos web y móviles con Inteligencia Artificial
        </p>
      </div>
    </footer>
  );
}
