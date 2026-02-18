import App from "./app/App"; // no need for .tsx
import "./styles/index.css";

import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<App />);
