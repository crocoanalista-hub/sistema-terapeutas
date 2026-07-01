import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  listarTodosTerapeutas, atualizarPlano, buscarUsage, PLANOS, LIMITES_TRIAL, TRIAL_DIAS,
} from "../../services/planoService";
import { seedDadosDemo } from "../../services/seedService";
import "../../styles/admin.css";

const ADMIN_EMAILS = [
  process.env.REACT_APP_ADMIN_EMAIL,
  "igorcroco@gmail.com",
].filter(Boolean);

const isAdmin = (email) => ADMIN_EMAILS.includes(email);

const diasAte = (data) => {
  if (!data) return null;
  const d = data?.toDate ? data.toDate() : new Date(data);
  const diff = d - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatarData = (data) => {
  if (!data) return "—";
  const d = data?.toDate ? data.toDate() : new Date(data);
  return d.toLocaleDateString("pt-BR");
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [terapeutas, setTerapeutas] = useState([]);
  const [usages, setUsages] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [expandido, setExpandido] = useState(null);
  const [salvando, setSalvando] = useState(null);
  const [seedando, setSeedando] = useState(false);
  const [seedProgresso, setSeedProgresso] = useState("");
  const [seedResultado, setSeedResultado] = useState(null);

  // Acesso restrito
  useEffect(() => {
    if (authLoading) return;
    console.log("[Admin] user:", user?.email, "isAdmin:", isAdmin(user?.email), "ADMIN_EMAILS:", ADMIN_EMAILS);
    if (!user || !isAdmin(user.email)) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await listarTodosTerapeutas();
      setTerapeutas(lista);
      // Carrega usage de todos em paralelo
      const entries = await Promise.all(
        lista.map(async (t) => {
          const uso = await buscarUsage(t.id).catch(() => ({ pacientes: 0, agendamentos: 0, documentos: 0 }));
          return [t.id, uso];
        })
      );
      setUsages(Object.fromEntries(entries));
    } catch {}
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAtualizarPlano = async (uid, dados) => {
    setSalvando(uid);
    try {
      await atualizarPlano(uid, dados);
      await carregar();
    } catch (e) { alert("Erro: " + e.message); }
    setSalvando(null);
  };

  const ativarPleno = (t) => handleAtualizarPlano(t.id, { plano: "ativo" });

  const bloquear = (t) => {
    if (window.confirm(`Bloquear ${t.nome}?`)) handleAtualizarPlano(t.id, { plano: "bloqueado" });
  };

  const estenderTrial = (t) => {
    const dias = parseInt(window.prompt("Quantos dias adicionar ao trial?", "10"));
    if (!dias || isNaN(dias)) return;
    const base = t.trialExpira?.toDate ? t.trialExpira.toDate() : new Date(t.trialExpira || Date.now());
    const novaExpiracao = new Date(Math.max(base, new Date()));
    novaExpiracao.setDate(novaExpiracao.getDate() + dias);
    handleAtualizarPlano(t.id, { trialExpira: novaExpiracao });
  };

  const reverterTrial = (t) => {
    const novaExpiracao = new Date();
    novaExpiracao.setDate(novaExpiracao.getDate() + TRIAL_DIAS);
    handleAtualizarPlano(t.id, { plano: "trial", trialExpira: novaExpiracao, limites: LIMITES_TRIAL });
  };

  const atualizarLimites = (t, limites) => handleAtualizarPlano(t.id, { limites });

  // Filtros
  const lista = terapeutas.filter((t) => {
    const matchBusca = !busca || t.nome?.toLowerCase().includes(busca.toLowerCase()) || t.email?.toLowerCase().includes(busca.toLowerCase());
    const plano = t.plano || "trial";
    const expirado = plano === "trial" && t.trialExpira && new Date() > (t.trialExpira?.toDate?.() || new Date(t.trialExpira));
    const planoReal = expirado ? "expirado" : plano;
    const matchFiltro = filtroPlano === "todos" || filtroPlano === planoReal;
    return matchBusca && matchFiltro;
  });

  const stats = {
    total: terapeutas.length,
    trial: terapeutas.filter(t => (t.plano || "trial") === "trial").length,
    ativo: terapeutas.filter(t => t.plano === "ativo").length,
    bloqueado: terapeutas.filter(t => t.plano === "bloqueado").length,
    expirado: terapeutas.filter(t => {
      return (t.plano || "trial") === "trial" && t.trialExpira && new Date() > (t.trialExpira?.toDate?.() || new Date(t.trialExpira));
    }).length,
  };

  if (authLoading || carregando) return <div className="admin-loading">Carregando painel admin...</div>;
  if (!user || !isAdmin(user.email)) return null;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Painel Administrativo</h1>
          <p className="admin-sub">Gestão de contas e planos</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="admin-btn-refresh" onClick={carregar}>↻ Atualizar</button>
          <button
            className="admin-btn-seed"
            onClick={async () => {
              if (!window.confirm("Isso vai APAGAR todos os pacientes, sessões e evoluções atuais e criar dados de demonstração. Continuar?")) return;
              setSeedando(true);
              setSeedResultado(null);
              try {
                const resultado = await seedDadosDemo(user.uid, setSeedProgresso);
                setSeedResultado(resultado);
              } catch (e) {
                alert("Erro ao criar dados: " + e.message);
              } finally {
                setSeedando(false);
                setSeedProgresso("");
              }
            }}
            disabled={seedando}
          >
            {seedando ? `⏳ ${seedProgresso || "Carregando…"}` : "🎭 Carregar dados demo"}
          </button>
        </div>
      </div>

      {seedResultado && (
        <div className="admin-seed-resultado">
          ✅ Dados criados: <strong>{seedResultado.pacientes} clientes</strong> · <strong>{seedResultado.profissionais} profissionais</strong> · <strong>{seedResultado.sessoes} sessões</strong> · <strong>{seedResultado.solicitacoes} solicitações pendentes</strong>
          <button onClick={() => setSeedResultado(null)}>✕</button>
        </div>
      )}

      {/* Cards de stats */}
      <div className="admin-stats">
        {[
          { label: "Total",     valor: stats.total,     cor: "#1a2535" },
          { label: "Trial",     valor: stats.trial,     cor: "#f9ab00" },
          { label: "Ativos",    valor: stats.ativo,     cor: "#34a853" },
          { label: "Expirados", valor: stats.expirado,  cor: "#ff5722" },
          { label: "Bloqueados",valor: stats.bloqueado, cor: "#ea4335" },
        ].map(s => (
          <div key={s.label} className="admin-stat-card" style={{ borderTopColor: s.cor }}>
            <span className="admin-stat-valor" style={{ color: s.cor }}>{s.valor}</span>
            <span className="admin-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="admin-filtros">
        <input
          className="admin-busca"
          placeholder="Buscar por nome ou e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="admin-filtro-abas">
          {["todos","trial","ativo","expirado","bloqueado"].map(f => (
            <button
              key={f}
              className={`admin-filtro-aba ${filtroPlano === f ? "ativa" : ""}`}
              onClick={() => setFiltroPlano(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="admin-filtro-count">
                {f === "todos" ? stats.total : (stats[f] ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="admin-lista">
        {lista.length === 0 && <p className="admin-vazio">Nenhum resultado.</p>}
        {lista.map((t) => {
          const plano = t.plano || "trial";
          const uso = usages[t.id] || {};
          const limites = t.limites || LIMITES_TRIAL;
          const diasTrial = diasAte(t.trialExpira);
          const expirado = plano === "trial" && diasTrial !== null && diasTrial < 0;
          const planoLabel = expirado ? "expirado" : plano;

          return (
            <div key={t.id} className={`admin-card ${expandido === t.id ? "admin-card--open" : ""}`}>
              {/* Linha principal */}
              <div className="admin-card-main" onClick={() => setExpandido(expandido === t.id ? null : t.id)}>
                <div className="admin-card-info">
                  <span className="admin-card-nome">{t.nome || "Sem nome"}</span>
                  <span className="admin-card-email">{t.email}</span>
                  {t.slug && <span className="admin-card-slug">/{t.slug}</span>}
                </div>

                <div className="admin-card-meta">
                  <span className={`admin-badge admin-badge--${planoLabel}`}>
                    {planoLabel === "trial" && diasTrial !== null
                      ? `Trial · ${diasTrial}d`
                      : planoLabel}
                  </span>
                  <span className="admin-card-uso">
                    👥 {uso.pacientes ?? "—"}/{limites.pacientes}
                    &nbsp;·&nbsp;
                    📅 {uso.agendamentos ?? "—"}/{limites.agendamentos}
                    &nbsp;·&nbsp;
                    📄 {uso.documentos ?? "—"}/{limites.documentos}
                  </span>
                  <span className="admin-card-data">{formatarData(t.dataCriacao)}</span>
                  <span className="admin-card-chevron">{expandido === t.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Detalhe expandido */}
              {expandido === t.id && (
                <div className="admin-card-detalhe">
                  <div className="admin-detalhe-grid">
                    <div>
                      <p className="admin-detalhe-label">Cadastro</p>
                      <p className="admin-detalhe-valor">{formatarData(t.dataCriacao)}</p>
                    </div>
                    <div>
                      <p className="admin-detalhe-label">Trial expira</p>
                      <p className="admin-detalhe-valor">{formatarData(t.trialExpira)}</p>
                    </div>
                    <div>
                      <p className="admin-detalhe-label">Plano atual</p>
                      <p className="admin-detalhe-valor">{PLANOS[plano]?.label || plano}</p>
                    </div>
                    <div>
                      <p className="admin-detalhe-label">UID</p>
                      <p className="admin-detalhe-valor admin-detalhe-uid">{t.id}</p>
                    </div>
                  </div>

                  {/* Limites customizáveis (trial) */}
                  {plano !== "ativo" && (
                    <LimitesEditor
                      limites={limites}
                      onSalvar={(novosLimites) => atualizarLimites(t, novosLimites)}
                      salvando={salvando === t.id}
                    />
                  )}

                  {/* Ações */}
                  <div className="admin-acoes">
                    {plano !== "ativo" && (
                      <button
                        className="admin-btn admin-btn--ativar"
                        onClick={() => ativarPleno(t)}
                        disabled={salvando === t.id}
                      >
                        ✅ Ativar plano completo
                      </button>
                    )}
                    {plano === "trial" && (
                      <button
                        className="admin-btn admin-btn--estender"
                        onClick={() => estenderTrial(t)}
                        disabled={salvando === t.id}
                      >
                        ⏳ Estender trial
                      </button>
                    )}
                    {plano === "ativo" && (
                      <button
                        className="admin-btn admin-btn--reverter"
                        onClick={() => reverterTrial(t)}
                        disabled={salvando === t.id}
                      >
                        ↩ Reverter para trial
                      </button>
                    )}
                    {plano !== "bloqueado" && (
                      <button
                        className="admin-btn admin-btn--bloquear"
                        onClick={() => bloquear(t)}
                        disabled={salvando === t.id}
                      >
                        🚫 Bloquear
                      </button>
                    )}
                    {plano === "bloqueado" && (
                      <button
                        className="admin-btn admin-btn--reverter"
                        onClick={() => reverterTrial(t)}
                        disabled={salvando === t.id}
                      >
                        ↩ Reativar (trial)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-componente: editor de limites ─────────────────────────
function LimitesEditor({ limites, onSalvar, salvando }) {
  const [vals, setVals] = useState({ ...limites });
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <button className="admin-btn-limites-toggle" onClick={() => setEditando(true)}>
        ✏️ Personalizar limites do trial
      </button>
    );
  }

  return (
    <div className="admin-limites-editor">
      <p className="admin-limites-titulo">Limites personalizados</p>
      <div className="admin-limites-grid">
        {[
          { key: "pacientes",    label: "Pacientes" },
          { key: "agendamentos", label: "Agendamentos" },
          { key: "documentos",   label: "Documentos" },
        ].map(({ key, label }) => (
          <label key={key} className="admin-limites-field">
            <span>{label}</span>
            <input
              type="number"
              min={0}
              value={vals[key]}
              onChange={(e) => setVals(v => ({ ...v, [key]: parseInt(e.target.value) || 0 }))}
            />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="admin-btn admin-btn--ativar" onClick={() => { onSalvar(vals); setEditando(false); }} disabled={salvando}>
          Salvar limites
        </button>
        <button className="admin-btn" onClick={() => setEditando(false)}>Cancelar</button>
      </div>
    </div>
  );
}
