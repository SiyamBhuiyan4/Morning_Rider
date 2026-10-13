import { Moon, Sun } from "lucide-react";
import { setLang, setTheme, t, useLang, useTheme } from "../lib/prefs";
import { cx } from "./ui";

/** Night-mode and language switches. `onDark` styles them for the navy backgrounds. */
export function Prefs({ onDark, className }: { onDark?: boolean; className?: string }) {
  const theme = useTheme();
  const lang = useLang();
  const btn = cx(
    "grid h-9 place-items-center rounded-xl px-2.5 text-xs font-bold transition",
    onDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
  );
  return (
    <div className={cx("flex items-center gap-1.5", className)}>
      <button
        className={cx(btn, "w-9 px-0")}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? t("Day mode") : t("Night mode")}
        aria-label={theme === "dark" ? t("Day mode") : t("Night mode")}
      >
        {theme === "dark" ? <Sun className="size-4 text-sun" /> : <Moon className="size-4" />}
      </button>
      <button className={btn} onClick={() => setLang(lang === "bn" ? "en" : "bn")} title={t("English / বাংলা")}>
        {lang === "bn" ? "EN" : "বাংলা"}
      </button>
    </div>
  );
}
