import ReactMarkdown, { type Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline dark:text-indigo-300">
      {children}
    </a>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, "");
    const lang = /language-(\w+)/.exec(className ?? "")?.[1];
    if (!lang && !text.includes("\n")) {
      return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-800">{text}</code>;
    }
    if (lang === "python" || lang === "py") return <CodeBlock code={text} />;
    return (
      <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
        <code className="font-mono">{text}</code>
      </pre>
    );
  },
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  h1: ({ children }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 font-semibold">{children}</h4>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-400">{children}</blockquote>,
};

/** Renders user/content markdown. Raw HTML is not allowed (react-markdown's default). */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`break-words text-sm ${className}`}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
