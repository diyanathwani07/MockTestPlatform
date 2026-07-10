import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }) {
  const { isAdminUser, loading } = useAuth();
  if (loading) return null;
  return isAdminUser() ? children : <Navigate to="/" />;
}

export default AdminRoute;