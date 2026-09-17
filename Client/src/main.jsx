import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { PreviewProvider } from "./context/PreviewContext";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ExamProvider } from "./context/ExamContext";
import ChangeExamModal from "./components/ChangeExamModal";
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