import { useEffect, useState } from "react";
import { highlightPython } from "../lib/highlight";

const box = "overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900";

/** Python source with Shiki highlighting. Shows plain text until the highlighter has loaded. */
export function CodeBlock({ code, label = "Python code" }: { code: string; label?: string }) {
  const [html, setHtml] = useState<{ code: string; html: string } | null>(null);

  useEffect(() => {
    let live = true;
    highlightPython(code)
      .then((h) => live && setHtml({ code, html: h }))
      .catch(() => undefined); // keep the plain-text fallback
    return () => {
      live = false;
    };
  }, [code]);

  if (html && html.code === code) {
    return <div role="region" aria-label={label} className={`${box} [&_pre]:m-0 [&_pre]:bg-transparent`} dangerouslySetInnerHTML={{ __html: html.html }} />;
  }
  return (
    <pre role="region" aria-label={label} className={box}>
      <code className="font-mono">{code}</code>
    </pre>
  );
}
