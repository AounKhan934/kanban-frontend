import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { applyTheme, getStoredTheme } from "./lib/theme";
import "./index.css";

// Apply the saved color theme before the first paint so there's no flash
// of the default theme while React boots.
applyTheme(getStoredTheme());

// HashRouter (URLs like /#/board/<id>) rather than BrowserRouter — it
// keeps the open board in the URL, and refreshing (or bookmarking, or
// sharing the link) lands back on that board, all without needing any
// server-side rewrite rule for a plain static-file host.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
