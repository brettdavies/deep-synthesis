/// <reference types="vite/client" />

/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { createRoot } from "react-dom/client";
// StrictMode commented out temporarily to reduce redundant operations on initial load
// See: https://reactjs.org/docs/strict-mode.html#detecting-unexpected-side-effects
// import { StrictMode } from "react";
import { App } from "./App";

// Import the CSS files
import "./styles/globals.css";
import "./styles/markdown.css";

const elem = document.getElementById("root")!;
const app = (
  // <StrictMode>
    <App />
  // </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
