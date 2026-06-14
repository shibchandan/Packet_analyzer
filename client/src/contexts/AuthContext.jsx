import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Bypass Auth: Always logged in as Admin
  const [token, setToken] = useState("local-admin-token");
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("admin");

  const performLogin = (tokenData, roleData, usernameData) => {
    // No-op
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setToken(null);
    setRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, username, performLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
