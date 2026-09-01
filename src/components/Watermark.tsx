import { Sparkles } from "lucide-react";

export function Watermark() {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/60 px-4 py-4">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span>
            Desarrollado por{" "}
            <a
              href="https://wa.me/51989600490"
              target="_blank"
              rel="noopener noreferrer"
              title="Contactar por WhatsApp"
              className="font-semibold text-foreground/70 underline-offset-4 transition-opacity hover:opacity-100 hover:underline"
            >
              Jeremy David Cruz Centeno
            </a>
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          <span className="font-semibold tracking-wide text-brand">CroosIA</span> · Desarrollo de
          aplicativos web y móviles con Inteligencia Artificial
        </p>
        <a
          href="https://wa.me/51989600490"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        >
          +51 989 600 490
        </a>
      </div>
    </footer>
  );
}

