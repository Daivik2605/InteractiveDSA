import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./app/App";
import { applyTheme } from "./lib/theme";
import "./index.css";

applyTheme("system"); // Phase 2 reads the saved theme from Settings.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
