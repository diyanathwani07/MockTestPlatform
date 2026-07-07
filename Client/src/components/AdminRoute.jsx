import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const role = localStorage.getItem("role");
  
  return (role === "admin" || role === "superadmin") ? children : <Navigate to="/" />;
}

export default AdminRoute;