import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { applyTheme, loadThemePrefs, saveThemePrefs, THEMES, type Mode, type ThemeId } from "@/lib/theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("default");
  const [mode, setMode] = useState<Mode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = loadThemePrefs();
    setTheme(p.theme);
    setMode(p.mode);
    applyTheme(p.theme, p.mode);
    setReady(true);
  }, []);

  const update = (t: ThemeId, m: Mode) => {
    setTheme(t);
    setMode(m);
    applyTheme(t, m);
    saveThemePrefs(t, m);
  };

  if (!ready) return <div className="h-9 w-9" />;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => update(theme, mode === "light" ? "dark" : "light")}
        aria-label="Cambiar modo"
      >
        {mode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Cambiar tema">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Tema visual</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {THEMES.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => update(t.id, mode)}>
              <span
                className="mr-2 inline-block h-4 w-4 rounded-full border border-border"
                style={{ background: t.swatch }}
              />
              <span className="flex-1">{t.name}</span>
              {theme === t.id ? <span className="text-xs text-muted-foreground">Activo</span> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
