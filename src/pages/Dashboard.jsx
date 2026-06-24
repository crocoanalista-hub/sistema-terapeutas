import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listarPacientes } from "../services/pacientesService";
import { listarAgendamentos } from "../services/agendamentosService";

const Dashboard = () => {
  const { terapeuta, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pacientes: 0, hoje: 0, semana: 0 });

  useEffect(() => {
    if (user) carregarStats();
  }, [user]);

  const carregarStats = async () => {
    try {
      const [pacs, agends] = await Promise.all([
        listarPacientes(user.uid),
        listarAgendamentos(user.uid),
      ]);

      const hoje = new Date();
      const hojeStr = formatDate(hoje);
      const semanaStr = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(d.getDate() + i);
        return formatDate(d);
      });

      setStats({
        pacientes: pacs.length,
        hoje: agends.filter(
          (a) => a.data === hojeStr && a.status === "confirmado"
        ).length,
        semana: agends.filter(
          (a) => semanaStr.includes(a.data) && a.status === "confirmado"
        ).length,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const cards = [
    {
      cor: "#3498db",
      icone: "👥",
      titulo: "Pacientes",
      valor: stats.pacientes,
      sub: "cadastrados",
      rota: "/pacientes",
    },
    {
      cor: "#27ae60",
      icone: "📅",
      titulo: "Sessões hoje",
      valor: stats.hoje,
      sub: "confirmadas",
      rota: "/agenda",
    },
    {
      cor: "#f39c12",
      icone: "🗓️",
      titulo: "Esta semana",
      valor: stats.semana,
      sub: "confirmadas",
      rota: "/agenda",
    },
  ];

  const atalhos = [
    { label: "+ Novo Paciente", cor: "#3498db", rota: "/pacientes/novo" },
    { label: "+ Nova Sessão", cor: "#27ae60", rota: "/agenda/marcar" },
    { label: "Ver Agenda", cor: "#f39c12", rota: "/agenda" },
    { label: "Histórico", cor: "#9b59b6", rota: "/historico" },
  ];

  return (
    <div style={{ maxWidth: "960px" }}>
      <h1 style={{ margin: "0 0 8px 0", color: "#1a2535", fontSize: "26px" }}>
        Olá, {terapeuta?.nome || "Terapeuta"}!
      </h1>
      <p style={{ margin: "0 0 32px 0", color: "#888", fontSize: "14px" }}>
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {cards.map((c) => (
          <div
            key={c.titulo}
            onClick={() => navigate(c.rota)}
            style={{
              backgroundColor: c.cor,
              padding: "24px",
              borderRadius: "10px",
              color: "white",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{c.icone}</div>
            <div
              style={{ fontSize: "32px", fontWeight: "800", lineHeight: 1 }}
            >
              {c.valor}
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.85 }}>
              {c.titulo} · {c.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <h3 style={{ margin: "0 0 16px 0", color: "#1a2535", fontSize: "16px" }}>
        Atalhos rápidos
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        {atalhos.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.rota)}
            style={{
              padding: "14px 16px",
              backgroundColor: "white",
              border: `2px solid ${a.cor}`,
              borderRadius: "8px",
              color: a.cor,
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = a.cor;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = a.cor;
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
