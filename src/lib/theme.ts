import type { Settings } from "../types/content";

type Theme = Settings["theme"];

const query = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

/** Sets/removes the `dark` class on <html>. Returns a cleanup that stops following the OS setting. */
export function applyTheme(theme: Theme): () => void {
  const root = document.documentElement;
  const mq = query();
  const apply = () => root.classList.toggle("dark", theme === "dark" || (theme === "system" && !!mq?.matches));
  apply();
  if (theme !== "system" || !mq) return () => {};
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}
