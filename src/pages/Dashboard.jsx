import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listarPacientes } from "../services/pacientesService";
import { listarAgendamentos } from "../services/agendamentosService";
import { listarItens } from "../services/estoqueService";
import "../styles/estoque.css";

const Dashboard = () => {
  const { terapeuta, workspaceId, slug } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pacientes: 0, hoje: 0, semana: 0 });
  const [itensAlerta, setItensAlerta] = useState([]);

  useEffect(() => {
    if (workspaceId) {
      carregarStats();
      listarItens(workspaceId).then(itens =>
        setItensAlerta(itens.filter(i => Number(i.quantidade || 0) < Number(i.quantidadeMinima || 0)))
      ).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const carregarStats = async () => {
    try {
      const [pacs, agends] = await Promise.all([
        listarPacientes(workspaceId),
        listarAgendamentos(workspaceId),
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

      {/* Alerta estoque */}
      {itensAlerta.length > 0 && (
        <div className="dash-alerta-estoque" onClick={() => navigate("/estoque")}>
          ⚠️ <strong>{itensAlerta.length} item{itensAlerta.length > 1 ? "s" : ""} abaixo do estoque mínimo:</strong>
          &nbsp;{itensAlerta.slice(0, 3).map(i => i.nome).join(", ")}{itensAlerta.length > 3 ? "..." : ""}
          &nbsp;— <span style={{ textDecoration: "underline" }}>Ver estoque</span>
        </div>
      )}

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

      {/* Portal do cliente */}
      {slug && (
        <div style={{
          marginTop: 28,
          background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
          borderRadius: 14,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
              🌐 Portal do Cliente
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
              Seus clientes acessam sessões, histórico e documentos por aqui
            </div>
            <div style={{
              marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.6)",
              fontFamily: "monospace", background: "rgba(0,0,0,0.2)",
              display: "inline-block", padding: "3px 10px", borderRadius: 6,
            }}>
              {window.location.origin}/{slug}/cliente
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/${slug}/cliente`);
                alert("Link copiado!");
              }}
              style={{
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff", borderRadius: 8, padding: "9px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              📋 Copiar link
            </button>
            <a
              href={`/${slug}/cliente`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#fff", color: "#1a73e8",
                borderRadius: 8, padding: "9px 16px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                display: "inline-flex", alignItems: "center",
              }}
            >
              Abrir portal ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
