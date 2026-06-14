import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import RulesPage from "./pages/RulesPage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/analyze", label: "Analyze" },
  { to: "/analytics", label: "Analytics" },
  { to: "/history", label: "History" },
  { to: "/rules", label: "Rules" },
  { to: "/settings", label: "Settings" }
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="eyebrow">Packet Analyzer</p>
        <h1>DPI Command Center</h1>
        <p className="sidebar-copy">MERN dashboard for capture upload, blocking policy, and flow inspection.</p>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/results/:jobId" element={<ResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}
