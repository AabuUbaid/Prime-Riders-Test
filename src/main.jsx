import React from "react";
import ReactDOM from "react-dom/client";
import { installStorageShim } from "./storage";
import AuthGate from "./AuthGate";
import App from "./App";
import "./index.css";

installStorageShim();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
