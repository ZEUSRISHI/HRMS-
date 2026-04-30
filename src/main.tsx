// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./styles/index.css";
import App from "./app/App";
import { ProjectProvider } from "./app/contexts/ProjectContext";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Failed to find root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
