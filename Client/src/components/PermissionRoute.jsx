import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PermissionRoute({ children, permission }) {
  const { hasPermission, loading, token } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/" />;
  if (!hasPermission(permission)) return <Navigate to="/unauthorized" />;
  return children;
}

export default PermissionRoute;
