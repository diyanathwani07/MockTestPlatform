import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PermissionRoute({ children, permission }) {
  const { hasPermission, loading, token } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/" />;
  const perms = Array.isArray(permission) ? permission : [permission];
  if (!perms.some(p => hasPermission(p))) return <Navigate to="/unauthorized" />;
  return children;
}

export default PermissionRoute;
