import type { ReactNode } from "react";

export function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-4 text-slate-600 dark:text-slate-400">{children ?? "Nothing here yet."}</div>
    </section>
  );
}
