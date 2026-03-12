import React from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App"; // Main App component
import { ProjectProvider } from "./app/contexts/ProjectContext";
import "./styles/index.css"; // Global styles

// Create the root and render the app wrapped in ProjectProvider
const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Failed to find root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>
);