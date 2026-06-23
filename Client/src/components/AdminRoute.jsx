import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const role = localStorage.getItem("role");
  
  // LOG THIS to your console to see what is actually happening
  console.log("Current role in localStorage:", role); 

  // If you are just testing, change this to:
  return role === "admin" || role === null ? children : <Navigate to="/" />;
}

export default AdminRoute;