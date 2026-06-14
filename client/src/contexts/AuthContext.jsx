import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [username, setUsername] = useState(localStorage.getItem("username") || null);

  const performLogin = (tokenData, roleData, usernameData) => {
    localStorage.setItem("token", tokenData);
    localStorage.setItem("role", roleData);
    localStorage.setItem("username", usernameData);
    setToken(tokenData);
    setRole(roleData);
    setUsername(usernameData);
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
