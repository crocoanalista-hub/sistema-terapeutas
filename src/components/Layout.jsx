import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracoes } from "../hooks/useConfiguracoes";
import { useSolicitacoes } from "../hooks/useSolicitacoes";
import { logout } from "../services/authService";
import TrialBanner from "./TrialBanner";
import InstallPrompt from "./InstallPrompt";
import "../styles/layout.css";

const NAV = [
  { label: "Dashboard",    icon: "🏠", rota: "/dashboard" },
  { label: "Pacientes",    icon: "👥", rota: "/pacientes" },
  { label: "Agenda",       icon: "📅", rota: "/agenda" },
  { label: "Financeiro",   icon: "💰", rota: "/financeiro" },
  { label: "Documentos",   icon: "📄", rota: "/documentos" },
  { label: "Histórico",    icon: "📊", rota: "/historico" },
  { label: "Estoque",      icon: "📦", rota: "/estoque" },
  { label: "Configurações",icon: "⚙️", rota: "/configuracoes" },
];

// Itens visíveis na bottom nav (os 4 principais + "Mais")
const NAV_BOTTOM = [
  { label: "Início",    icon: "🏠", rota: "/dashboard" },
  { label: "Pacientes", icon: "👥", rota: "/pacientes" },
  { label: "Agenda",    icon: "📅", rota: "/agenda" },
  { label: "Financeiro",icon: "💰", rota: "/financeiro" },
];

const Layout = ({ children }) => {
  const { terapeuta, workspaceId } = useAuth();
  const { config } = useConfiguracoes(workspaceId);
  const { pendentes, total } = useSolicitacoes(workspaceId);
  const navigate = useNavigate();
  const location = useLocation();

  const [notifAberta, setNotifAberta] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [vistas, setVistas] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("solVistas") || "[]")); }
    catch { return new Set(); }
  });
  const notifRef = useRef(null);

  // Fecha painel ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifAberta(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Novas = ainda não vistas nesta sessão
  const novas = pendentes.filter(s => !vistas.has(s.id));

  const marcarComoVistas = () => {
    const novoSet = new Set([...vistas, ...pendentes.map(s => s.id)]);
    setVistas(novoSet);
    localStorage.setItem("solVistas", JSON.stringify([...novoSet]));
  };

  const handleAbrirNotif = () => {
    setNotifAberta(v => !v);
    if (!notifAberta) marcarComoVistas();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAtivo = (rota) =>
    rota === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(rota);

  const fmtData = (s) => {
    if (!s.dataPreferida) return "";
    return new Date(s.dataPreferida + "T12:00").toLocaleDateString("pt-BR");
  };

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
          <p
            onClick={() => navigate("/minha-conta")}
            style={{ cursor: "pointer", textDecoration: "underline", opacity: 0.8 }}
            title="Minha Conta"
          >
            {terapeuta?.nome || "Terapeuta"}
          </p>
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
              {item.rota === "/agenda" && total > 0 && (
                <span className="nav-badge">{total > 9 ? "9+" : total}</span>
              )}
            </button>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="conteudo">
        {/* Barra superior com sino de notificações */}
        <div className="topbar">
          <div className="topbar-right" ref={notifRef}>
            <button
              className={`notif-btn${novas.length > 0 ? " nova" : ""}`}
              onClick={handleAbrirNotif}
              title="Solicitações de agendamento"
            >
              🔔
              {novas.length > 0 && (
                <span className="notif-dot">{novas.length > 9 ? "9+" : novas.length}</span>
              )}
            </button>

            {notifAberta && (
              <div className="notif-painel">
                <div className="notif-header">
                  <span>Solicitações pendentes</span>
                  {total > 0 && (
                    <span className="notif-count">{total}</span>
                  )}
                </div>

                {total === 0 ? (
                  <div className="notif-vazio">
                    <span>✅</span>
                    <p>Nenhuma solicitação pendente</p>
                  </div>
                ) : (
                  <div className="notif-lista">
                    {pendentes.map(s => (
                      <div
                        key={s.id}
                        className="notif-item"
                        onClick={() => { navigate("/agenda"); setNotifAberta(false); }}
                      >
                        <div className="notif-item-nome">{s.nome}</div>
                        <div className="notif-item-detalhe">
                          {fmtData(s) && <span>📅 {fmtData(s)}</span>}
                          {s.horaPreferida && <span>⏰ {s.horaPreferida}</span>}
                        </div>
                        {s.telefone && (
                          <div className="notif-item-tel">📱 {s.telefone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="notif-ver-todos"
                  onClick={() => { navigate("/agenda"); setNotifAberta(false); }}
                >
                  Ver na agenda →
                </button>
              </div>
            )}
          </div>
        </div>

        <TrialBanner />
        {children}
        <InstallPrompt />
      </main>

      {/* ── Bottom Nav (mobile) ── */}
      <nav className="bottom-nav">
        {NAV_BOTTOM.map((item) => (
          <button
            key={item.rota}
            className={`bottom-nav-item${isAtivo(item.rota) ? " ativo" : ""}`}
            onClick={() => navigate(item.rota)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {item.rota === "/agenda" && total > 0 && (
              <span className="bottom-nav-badge">{total > 9 ? "9+" : total}</span>
            )}
          </button>
        ))}
        <button
          className={`bottom-nav-item${maisAberto ? " ativo" : ""}`}
          onClick={() => setMaisAberto(v => !v)}
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Mais</span>
        </button>
      </nav>

      {/* ── More menu overlay ── */}
      {maisAberto && (
        <>
          <div className="bottom-more-overlay" onClick={() => setMaisAberto(false)} />
          <div className="bottom-more-menu">
            {NAV.filter(item => !NAV_BOTTOM.find(b => b.rota === item.rota)).map((item) => (
              <button
                key={item.rota}
                className={`bottom-more-item${isAtivo(item.rota) ? " ativo" : ""}`}
                onClick={() => { navigate(item.rota); setMaisAberto(false); }}
              >
                <span className="bottom-more-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button
              className={`bottom-more-item${isAtivo("/minha-conta") ? " ativo" : ""}`}
              onClick={() => { navigate("/minha-conta"); setMaisAberto(false); }}
            >
              <span className="bottom-more-icon">👤</span>
              Minha Conta
            </button>
            <button className="bottom-more-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Layout;
