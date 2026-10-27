import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" />;

  try {
    const exp = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp;
    if (exp && exp * 1000 < Date.now()) {
      localStorage.clear();
      return <Navigate to="/" />;
    }
  } catch (_) {}

  return children;
}

export default ProtectedRoute;