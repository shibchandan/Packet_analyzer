import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import RulesPage from "./pages/RulesPage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import AuditPage from "./pages/AuditPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Navigate } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/analyze", label: "Analyze" },
  { to: "/analytics", label: "Analytics" },
  { to: "/history", label: "History" },
  { to: "/rules", label: "Rules" },
  { to: "/settings", label: "Settings" },
  { to: "/audit", label: "Audit Logs", adminOnly: true }
];

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function MainApp() {
  const { role, logout, username } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="eyebrow">Packet Analyzer</p>
        <h1>DPI Command Center</h1>
        <p className="sidebar-copy">MERN dashboard for capture upload, blocking policy, and flow inspection.</p>
        <nav className="nav">
          {navItems.map((item) => {
            if (item.adminOnly && role !== "admin") return null;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <p className="muted" style={{ fontSize: '0.875rem' }}>Logged in as: <strong>{username}</strong></p>
          <button className="btn" onClick={logout} style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
          <Route path="/results/:jobId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </AuthProvider>
  );
}
