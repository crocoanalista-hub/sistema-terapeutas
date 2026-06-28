import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracoes } from "../hooks/useConfiguracoes";
import { logout } from "../services/authService";
import "../styles/layout.css";

const NAV = [
  { label: "Dashboard", icon: "🏠", rota: "/dashboard" },
  { label: "Pacientes", icon: "👥", rota: "/pacientes" },
  { label: "Agenda", icon: "📅", rota: "/agenda" },
  { label: "Financeiro", icon: "💰", rota: "/financeiro" },
  { label: "Documentos", icon: "📄", rota: "/documentos" },
  { label: "Histórico", icon: "📊", rota: "/historico" },
  { label: "Configurações", icon: "⚙️", rota: "/configuracoes" },
];

const Layout = ({ children }) => {
  const { terapeuta, workspaceId } = useAuth();
  const { config } = useConfiguracoes(workspaceId);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAtivo = (rota) =>
    rota === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(rota);

  return (
    <div className="layout">
      <aside className="sidebar" style={{ background: config.corSidebar }}>
        <div className="sidebar-header">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="sidebar-logo-img" />
          ) : (
            <div className="sidebar-logo">🧠</div>
          )}
          <h2>{config.nomeClinica || "Consultório"}</h2>
          <p>{terapeuta?.nome || "Terapeuta"}</p>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.rota}
              className={`nav-item ${isAtivo(item.rota) ? "ativo" : ""}`}
              onClick={() => navigate(item.rota)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="conteudo">{children}</main>
    </div>
  );
};

export default Layout;
