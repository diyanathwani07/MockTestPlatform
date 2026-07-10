import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { PreviewProvider } from "./context/PreviewContext";
import { AuthProvider } from "./context/AuthContext";
import "./css/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <PreviewProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PreviewProvider>
  </ThemeProvider>
);