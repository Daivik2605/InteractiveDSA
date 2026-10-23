import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { NAV_ITEMS } from "./Layout";

const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe("app shell", () => {
  it("shows the six nav links and an empty sidebar slot", () => {
    renderAt();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => a.textContent)).toEqual(
      ["Today", "Calendar", "Weeks", "Problems", "Dashboard", "Settings"],
    );
    expect(NAV_ITEMS).toHaveLength(6);
    expect(screen.getByTestId("calendar-sidebar-slot")).toBeEmptyDOMElement();
  });

  it("renders an empty page per route and marks the active link", async () => {
    renderAt();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    for (const name of ["Calendar", "Weeks", "Problems", "Dashboard", "Settings"]) {
      await userEvent.click(screen.getByRole("link", { name }));
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
  });

  it("keeps the sidebar slot on every page", async () => {
    renderAt("/settings");
    expect(screen.getByTestId("calendar-sidebar-slot")).toBeInTheDocument();
  });
});
