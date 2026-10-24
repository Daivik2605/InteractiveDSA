import type { ComponentType } from "react";

/**
 * Visualizer components a question's optional `visual` can name (SPEC 3.6). Phase 5 registers the
 * real ones here; until then a question whose component isn't registered simply shows no diagram.
 */
export const visualRegistry: Record<string, ComponentType<Record<string, unknown>>> = {};

export function QuestionVisual({ visual }: { visual?: { component: string; props: Record<string, unknown> } }) {
  const Component = visual ? visualRegistry[visual.component] : undefined;
  return Component && visual ? <Component {...visual.props} /> : null;
}
