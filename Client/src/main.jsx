import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";

// shortcut: clear and redirect on 401 token expiry, upgrade if refresh tokens are added
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const msg = String(err.response?.data?.message || "");
      if (
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        localStorage.clear();
        if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
          window.location.href = "/?expired=true";
        }
      }
    }
    return Promise.reject(err);
  }
);
import { ThemeProvider } from "./context/ThemeContext";
import { PreviewProvider } from "./context/PreviewContext";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ExamProvider } from "./context/ExamContext";
import ChangeExamModal from "./components/ChangeExamModal";
import "./index.css";
import "./css/theme.css";
import "./css/themes.css";
import "katex/dist/katex.min.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <PreviewProvider>
      <AuthProvider>
        <ConfirmProvider>
          <SidebarProvider>
            <ExamProvider>
              <App />
              <ChangeExamModal />
            </ExamProvider>
          </SidebarProvider>
        </ConfirmProvider>
      </AuthProvider>
    </PreviewProvider>
  </ThemeProvider>
);