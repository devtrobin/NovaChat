import React from "react";
import { createRoot } from "react-dom/client";

import "./renderer/i18n";
import App from "./renderer/App";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root in index.html");

createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
