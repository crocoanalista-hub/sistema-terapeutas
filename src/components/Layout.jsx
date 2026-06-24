import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../services/authService";
import "../styles/layout.css";

const Layout = ({ children }) => {
  const { terapeuta } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAtivo = (path) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🧠</div>
          <h2>Consultório</h2>
          <p>{terapeuta?.nome || "Terapeuta"}</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${isAtivo("/dashboard") ? "ativo" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            <span className="nav-icon">🏠</span>
            Dashboard
          </button>
          <button
            className={`nav-item ${isAtivo("/pacientes") ? "ativo" : ""}`}
            onClick={() => navigate("/pacientes")}
          >
            <span className="nav-icon">👥</span>
            Pacientes
          </button>
          <button
            className={`nav-item ${isAtivo("/agenda") ? "ativo" : ""}`}
            onClick={() => navigate("/agenda")}
          >
            <span className="nav-icon">📅</span>
            Agenda
          </button>
          <button
            className={`nav-item ${isAtivo("/historico") ? "ativo" : ""}`}
            onClick={() => navigate("/historico")}
          >
            <span className="nav-icon">📊</span>
            Histórico
          </button>
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
