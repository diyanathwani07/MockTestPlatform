import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [role, setRole]             = useState(null);
  const [token, setToken]           = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const t    = localStorage.getItem("token");
    const r    = localStorage.getItem("role");
    const p    = localStorage.getItem("permissions");
    const u    = localStorage.getItem("user");
    setToken(t);
    setRole(r);
    setPermissions(p ? JSON.parse(p) : []);
    setUser(u ? JSON.parse(u) : null);
    setLoading(false);
  }, []);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role",  data.user.role);
    localStorage.setItem("permissions", JSON.stringify(data.user.permissions || []));
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setRole(data.user.role);
    setPermissions(data.user.permissions || []);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setPermissions([]);
    setUser(null);
  };

  // Returns true if user has the given permission key OR is superadmin
  const hasPermission = (key) => {
    if (!key) return true;
    if (role === "superadmin") return true;
    if (permissions.includes("full_access")) return true;
    return permissions.includes(key);
  };

  // Returns true if user should see admin panel (Admin or Super Admin)
  const isAdminUser = () => {
    return role === "admin" || role === "superadmin";
  };

  return (
    <AuthContext.Provider value={{ user, role, token, permissions, loading, login, logout, hasPermission, isAdminUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
