import React, { createContext, useContext, useState, useEffect } from "react";

const PreviewContext = createContext();

export function PreviewProvider({ children }) {
  const [previewMode, setPreviewMode] = useState(() => {
    return localStorage.getItem("previewMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("previewMode", previewMode);
  }, [previewMode]);

  return (
    <PreviewContext.Provider value={{ previewMode, setPreviewMode }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  return useContext(PreviewContext);
}
