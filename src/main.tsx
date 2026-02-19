import App from "./app/App"; // no need for .tsx
import "./styles/index.css";
import { ProjectProvider } from "./app/contexts/ProjectContext";

import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<App />);
<ProjectProvider>
  <App />
</ProjectProvider>