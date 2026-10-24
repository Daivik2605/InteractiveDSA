import type { HighlighterCore } from "shiki/core";

// Shiki is loaded on first use so the main bundle stays small. The JavaScript regex engine
// needs no WebAssembly, so highlighting also works offline and in tests.
let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, python, light, dark] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("@shikijs/langs/python"),
      import("@shikijs/themes/github-light"),
      import("@shikijs/themes/github-dark"),
    ]);
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      langs: [python.default],
      themes: [light.default, dark.default],
    });
  })();
  return highlighter;
}

/** HTML for Python source with both themes as CSS variables (see index.css). Output is escaped by Shiki. */
export async function highlightPython(code: string): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(code, { lang: "python", themes: { light: "github-light", dark: "github-dark" }, defaultColor: false });
}
