import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders a pipe table as a real table", () => {
    render(<Markdown>{"| Op | Cost |\n|---|---|\n| append | O(1) |\n| insert | O(n) |"}</Markdown>);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Op", "Cost"]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "append" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "O(n)" })).toBeInTheDocument();
  });
});
