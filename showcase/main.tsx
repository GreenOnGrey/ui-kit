import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { ToastProvider } from "../src";
import "../src/styles/index.css";
import "./showcase.css";
import { App } from "./App";
import { i18n } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </I18nextProvider>
  </StrictMode>,
);
