// Per-week markdown lessons, bundled as raw text: content/concepts/week-NN.md and content/templates/week-NN.md.
// Components never hard-code lesson text; a week with no file simply has no lesson yet.

const load = (files: Record<string, string>): ReadonlyMap<number, string> =>
  new Map(
    Object.entries(files).flatMap(([path, text]) => {
      const m = /week-(\d{2})\.md$/.exec(path);
      return m ? [[Number(m[1]), text] as const] : [];
    }),
  );

const concepts = load(import.meta.glob("../../content/concepts/week-*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>);
const templates = load(import.meta.glob("../../content/templates/week-*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>);

export const conceptsMarkdown = (week: number): string | undefined => concepts.get(week);
export const templatesMarkdown = (week: number): string | undefined => templates.get(week);
