import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@model-sync/ui/styles.css";
import "./desktop.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
