import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  listarTodosTerapeutas, atualizarPlano, buscarUsage, PLANOS, LIMITES_TRIAL, TRIAL_DIAS,
  listarTodasCobrancas, criarCobranca, atualizarCobranca, VALORES_PLANO, salvarAssinaturaTerapeuta,
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

  const [abaAtiva, setAbaAtiva] = useState("contas");

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

  // Financeiro
  const [cobrancas, setCobrancas] = useState([]);
  const [carregandoFin, setCarregandoFin] = useState(false);
  const [modalCobranca, setModalCobranca] = useState(null); // { terapeutaId, nome, email }
  const [novaCobranca, setNovaCobranca] = useState({ valor: "", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10" });
  const [salvandoCob, setSalvandoCob] = useState(false);

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

  const carregarFinanceiro = useCallback(async () => {
    setCarregandoFin(true);
    try {
      const lista = await listarTodasCobrancas();
      setCobrancas(lista);
    } catch {}
    setCarregandoFin(false);
  }, []);

  useEffect(() => {
    if (abaAtiva === "financeiro") carregarFinanceiro();
  }, [abaAtiva, carregarFinanceiro]);

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

  const handleCriarCobranca = async () => {
    const { valor, plano, descricao, recorrente, diaVencimento } = novaCobranca;
    // Se recorrente, vencimento é calculado pelo dia escolhido; senão, usa o campo date
    let vencimento = novaCobranca.vencimento;
    if (recorrente) {
      const hoje = new Date();
      const dia = Number(diaVencimento);
      let v = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      if (v <= hoje) v = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
      vencimento = v.toISOString().slice(0, 10);
    }
    if (!valor || !vencimento) { alert("Preencha valor e vencimento."); return; }
    setSalvandoCob(true);
    try {
      const descFinal = descricao || `Plano ${plano} — ${new Date(vencimento + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
      await criarCobranca({
        terapeutaId: modalCobranca.terapeutaId,
        terapeutaNome: modalCobranca.nome,
        terapeutaEmail: modalCobranca.email,
        valor: parseFloat(valor),
        vencimento,
        plano,
        descricao: descFinal,
        recorrente: !!recorrente,
        diaVencimento: recorrente ? Number(diaVencimento) : null,
      });
      if (recorrente) {
        await salvarAssinaturaTerapeuta(modalCobranca.terapeutaId, {
          ativa: true,
          valor: parseFloat(valor),
          plano,
          diaVencimento: Number(diaVencimento),
          descricao: descricao || `Plano ${plano}`,
          criadaEm: new Date().toISOString().slice(0, 10),
        });
        await carregar(); // atualiza lista de terapeutas com assinaturaSaas
      }
      setModalCobranca(null);
      setNovaCobranca({ valor: "", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10" });
      carregarFinanceiro();
    } catch (e) { alert("Erro: " + e.message); }
    setSalvandoCob(false);
  };

  const handleMarcarPago = async (cob) => {
    await atualizarCobranca(cob.id, { status: "pago", pagoEm: new Date() });
    // Se é recorrente, gera cobrança do próximo mês automaticamente
    if (cob.recorrente && cob.diaVencimento) {
      const hoje = new Date();
      const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, cob.diaVencimento);
      await criarCobranca({
        terapeutaId: cob.terapeutaId,
        terapeutaNome: cob.terapeutaNome,
        terapeutaEmail: cob.terapeutaEmail,
        valor: cob.valor,
        vencimento: prox.toISOString().slice(0, 10),
        plano: cob.plano,
        descricao: `Plano ${cob.plano} — ${prox.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
        recorrente: true,
        diaVencimento: cob.diaVencimento,
      });
    }
    carregarFinanceiro();
  };

  const handleCancelarCobranca = async (cob) => {
    if (!window.confirm("Cancelar esta cobrança?")) return;
    await atualizarCobranca(cob.id, { status: "cancelado" });
    carregarFinanceiro();
  };

  const handleDesmarcarPago = async (cob) => {
    await atualizarCobranca(cob.id, { status: "pendente", pagoEm: null });
    carregarFinanceiro();
  };

  const handleReabrirCobranca = async (cob) => {
    await atualizarCobranca(cob.id, { status: "pendente" });
    carregarFinanceiro();
  };

  const handleExcluirCobranca = async (cob) => {
    if (!window.confirm(`Excluir cobrança de ${cob.terapeutaNome}? Esta ação não pode ser desfeita.`)) return;
    const { deleteDoc, doc: fbDoc } = await import("firebase/firestore");
    const { db } = await import("../../services/firebaseConfig");
    await deleteDoc(fbDoc(db, "cobrancas", cob.id));
    carregarFinanceiro();
  };

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

  // ── Métricas financeiras ─────────────────────────────────
  const cobPendentes  = cobrancas.filter(c => c.status === "pendente");
  const cobPagas      = cobrancas.filter(c => c.status === "pago");
  const mrr           = cobPagas.reduce((s, c) => s + (c.valor || 0), 0);
  const inadimplentes = cobPendentes.filter(c => c.vencimento && new Date(c.vencimento + "T23:59") < new Date());

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

      {/* Abas principais */}
      <div className="admin-abas">
        <button className={`admin-aba${abaAtiva === "contas" ? " ativa" : ""}`} onClick={() => setAbaAtiva("contas")}>
          👥 Contas
        </button>
        <button className={`admin-aba${abaAtiva === "financeiro" ? " ativa" : ""}`} onClick={() => setAbaAtiva("financeiro")}>
          💳 Financeiro
        </button>
      </div>

      {/* ─── ABA CONTAS ─── */}
      {abaAtiva === "contas" && <>
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
      </> /* fim aba contas */}

      {/* ─── ABA FINANCEIRO ─── */}
      {abaAtiva === "financeiro" && (
        <div className="admin-financeiro">

          {/* KPIs */}
          <div className="admin-fin-kpis">
            {[
              { label: "Receita total",       valor: `R$ ${mrr.toFixed(2).replace(".", ",")}`,   cor: "#34a853" },
              { label: "Cobranças pagas",     valor: cobPagas.length,                            cor: "#1a73e8" },
              { label: "Cobranças pendentes", valor: cobPendentes.length,                        cor: "#f9ab00" },
              { label: "Inadimplentes",       valor: inadimplentes.length,                       cor: "#ea4335" },
            ].map(k => (
              <div key={k.label} className="admin-stat-card" style={{ borderTopColor: k.cor }}>
                <span className="admin-stat-valor" style={{ color: k.cor }}>{k.valor}</span>
                <span className="admin-stat-label">{k.label}</span>
              </div>
            ))}
          </div>

          {/* Barra de ações */}
          <div className="admin-fin-toolbar">
            <span className="admin-fin-titulo">Cobranças</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="admin-btn-refresh" onClick={carregarFinanceiro}>↻ Atualizar</button>
              <button
                className="admin-btn admin-btn--ativar"
                onClick={() => {
                  if (terapeutas.length === 0) { alert("Carregue a aba Contas primeiro."); return; }
                  const t = terapeutas[0];
                  setModalCobranca({ terapeutaId: t.id, nome: t.nome, email: t.email });
                  setNovaCobranca({ valor: "79", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10" });
                }}
              >+ Nova cobrança</button>
            </div>
          </div>

          {/* Tabela de cobranças */}
          {carregandoFin ? (
            <p className="admin-vazio">Carregando…</p>
          ) : cobrancas.length === 0 ? (
            <div className="admin-fin-vazio">
              <p>Nenhuma cobrança registrada ainda.</p>
              <p style={{ fontSize: 13, color: "#9aa0a6" }}>Clique em "+ Nova cobrança" para registrar a primeira.</p>
            </div>
          ) : (
            <div className="admin-fin-tabela-wrap">
              <table className="admin-fin-tabela">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Plano</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Pago em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrancas.map(c => {
                    const venc = c.vencimento ? new Date(c.vencimento + "T23:59") : null;
                    const atrasado = c.status === "pendente" && venc && venc < new Date();
                    return (
                      <tr key={c.id} className={atrasado ? "admin-fin-row-atrasado" : ""}>
                        <td>
                          <span className="admin-fin-nome">{c.terapeutaNome || "—"}</span>
                          <span className="admin-fin-email">{c.terapeutaEmail}</span>
                        </td>
                        <td>
                          <span className="admin-fin-plano-badge">{c.plano || "—"}</span>
                          {c.recorrente && <span className="admin-recorrente-badge">🔁</span>}
                        </td>
                        <td className="admin-fin-desc">{c.descricao || "—"}</td>
                        <td className="admin-fin-valor">R$ {Number(c.valor || 0).toFixed(2).replace(".", ",")}</td>
                        <td>{c.vencimento ? new Date(c.vencimento + "T12:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td>
                          <span className={`admin-fin-status admin-fin-status--${c.status}`}>
                            {c.status === "pago" ? "✅ Pago" : c.status === "cancelado" ? "❌ Cancelado" : atrasado ? "⚠️ Atrasado" : "🕐 Pendente"}
                          </span>
                        </td>
                        <td>{c.pagoEm ? new Date(c.pagoEm?.toDate?.() || c.pagoEm).toLocaleDateString("pt-BR") : "—"}</td>
                        <td>
                          <div className="admin-fin-acoes">
                            {c.status === "pendente" && (
                              <>
                                <button className="admin-fin-btn admin-fin-btn--pago" onClick={() => handleMarcarPago(c)}>✅ Marcar pago</button>
                                <button className="admin-fin-btn admin-fin-btn--cancel" onClick={() => handleCancelarCobranca(c)}>Cancelar</button>
                              </>
                            )}
                            {c.status === "pago" && (
                              <button className="admin-fin-btn admin-fin-btn--cancel" onClick={() => handleDesmarcarPago(c)}>↩ Desmarcar</button>
                            )}
                            {c.status === "cancelado" && (
                              <button className="admin-fin-btn admin-fin-btn--gerar" onClick={() => handleReabrirCobranca(c)}>↩ Reabrir</button>
                            )}
                            <button className="admin-fin-btn admin-fin-btn--del" onClick={() => handleExcluirCobranca(c)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Atalhos: gerar cobrança por cliente */}
          <div className="admin-fin-clientes-titulo">Gerar cobrança por cliente</div>
          <div className="admin-fin-clientes">
            {terapeutas.filter(t => t.plano === "ativo").map(t => (
              <div key={t.id} className="admin-fin-cliente-card">
                <div className="admin-fin-cliente-info">
                  <span className="admin-fin-nome">
                    {t.nome}
                    {t.assinaturaSaas?.ativa && (
                      <span className="admin-assin-badge">🔁 Assinatura • todo dia {t.assinaturaSaas.diaVencimento}</span>
                    )}
                  </span>
                  <span className="admin-fin-email">{t.email}</span>
                </div>
                <button
                  className="admin-fin-btn admin-fin-btn--gerar"
                  onClick={() => {
                    const as = t.assinaturaSaas;
                    setModalCobranca({ terapeutaId: t.id, nome: t.nome, email: t.email });
                    setNovaCobranca({
                      valor: as?.valor ? String(as.valor) : "79",
                      vencimento: "",
                      plano: as?.plano || "essencial",
                      descricao: as?.descricao || "",
                      recorrente: false,
                      diaVencimento: as?.diaVencimento ? String(as.diaVencimento) : "10",
                    });
                  }}
                >
                  + Cobrança
                </button>
              </div>
            ))}
            {terapeutas.filter(t => t.plano === "ativo").length === 0 && (
              <p className="admin-vazio">Nenhum cliente com plano ativo. Vá à aba Contas para ativar.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal nova cobrança */}
      {modalCobranca && (
        <div className="admin-overlay" onClick={() => setModalCobranca(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Nova cobrança</h3>
              <button onClick={() => setModalCobranca(null)}>✕</button>
            </div>
            <p className="admin-modal-sub">Cliente: <strong>{modalCobranca.nome}</strong></p>
            <div className="admin-modal-form">
              {/* Toggle recorrente */}
              <label className="admin-modal-toggle">
                <input type="checkbox" checked={novaCobranca.recorrente}
                  onChange={e => setNovaCobranca(n => ({ ...n, recorrente: e.target.checked }))} />
                <span>🔁 Assinatura mensal recorrente</span>
              </label>
              <label>Plano
                <select value={novaCobranca.plano} onChange={e => {
                  const p = e.target.value;
                  setNovaCobranca(n => ({ ...n, plano: p, valor: String(VALORES_PLANO[p] || "") }));
                }}>
                  <option value="essencial">Essencial — R$ 79</option>
                  <option value="profissional">Profissional — R$ 149</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <label>Valor (R$)
                <input type="number" value={novaCobranca.valor} onChange={e => setNovaCobranca(n => ({ ...n, valor: e.target.value }))} min="0" step="1" />
              </label>
              {novaCobranca.recorrente ? (
                <label>Todo dia do mês
                  <input type="number" min={1} max={28} value={novaCobranca.diaVencimento}
                    onChange={e => setNovaCobranca(n => ({ ...n, diaVencimento: e.target.value }))}
                    placeholder="Ex: 10" />
                </label>
              ) : (
                <label>Vencimento
                  <input type="date" value={novaCobranca.vencimento} onChange={e => setNovaCobranca(n => ({ ...n, vencimento: e.target.value }))} />
                </label>
              )}
              <label>Descrição (opcional)
                <input type="text" value={novaCobranca.descricao} onChange={e => setNovaCobranca(n => ({ ...n, descricao: e.target.value }))} placeholder="Ex: Mensalidade julho 2026" />
              </label>
            </div>
            <div className="admin-modal-acoes">
              <button className="admin-btn admin-btn--ativar" onClick={handleCriarCobranca} disabled={salvandoCob}>
                {salvandoCob ? "Salvando…" : novaCobranca.recorrente ? "Criar assinatura" : "Criar cobrança"}
              </button>
              <button className="admin-btn" onClick={() => setModalCobranca(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

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
