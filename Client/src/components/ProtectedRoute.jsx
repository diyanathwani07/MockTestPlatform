import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    if (location.pathname && location.pathname !== "/" && location.pathname !== "/login") {
      sessionStorage.setItem("redirect_after_login", location.pathname + location.search);
    }
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  try {
    const exp = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp;
    if (exp && exp * 1000 < Date.now()) {
      localStorage.clear();
      if (location.pathname && location.pathname !== "/" && location.pathname !== "/login") {
        sessionStorage.setItem("redirect_after_login", location.pathname + location.search);
      }
      return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
    }
  } catch (_) {}

  return children;
}

export default ProtectedRoute;
