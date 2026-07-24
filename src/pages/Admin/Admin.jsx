import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  listarTodosTerapeutas, atualizarPlano, buscarUsage, PLANOS, LIMITES_TRIAL, TRIAL_DIAS,
  listarTodasCobrancas, criarCobranca, atualizarCobranca, VALORES_PLANO, salvarAssinaturaTerapeuta,
  buscarConfigTrial, salvarConfigTrial, buscarConfigAsaas, salvarConfigAsaas,
} from "../../services/planoService";
import { seedDadosDemo } from "../../services/seedService";
import { criarCobrancaAsaas } from "../../services/asaasService";
import { listarPlanos, salvarPlano, excluirPlano, setMembroPioneiro } from "../../services/planosService";
import { salvarConfiguracoes } from "../../services/configuracoesService";
import ContasCliente from "./ContasCliente";
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

// ── Atividade / inatividade dos terapeutas ───────────────────
const NIVEIS_INATIVIDADE = [
  { id: 0, nome: "Ativo",               emoji: "✓", cor: "#34a853" },
  { id: 1, nome: "1-2 semanas inativo", emoji: "⏱", cor: "#f9ab00" },
  { id: 2, nome: "2-3 semanas inativo", emoji: "⚠", cor: "#ff8f00" },
  { id: 3, nome: "3-4 semanas inativo", emoji: "!", cor: "#ea4335" },
  { id: 4, nome: "Mais de 4 semanas",   emoji: "✕", cor: "#8c1d18" },
  { id: 5, nome: "Sem dados",           emoji: "?", cor: "#5f6368" },
];

const calcularNivelInatividade = (ultimoAcesso) => {
  if (!ultimoAcesso) return { ...NIVEIS_INATIVIDADE[5], diasInativo: null };
  const d = ultimoAcesso?.toDate ? ultimoAcesso.toDate() : new Date(ultimoAcesso);
  const diasInativo = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diasInativo < 7)  return { ...NIVEIS_INATIVIDADE[0], diasInativo };
  if (diasInativo < 14) return { ...NIVEIS_INATIVIDADE[1], diasInativo };
  if (diasInativo < 21) return { ...NIVEIS_INATIVIDADE[2], diasInativo };
  if (diasInativo < 28) return { ...NIVEIS_INATIVIDADE[3], diasInativo };
  return { ...NIVEIS_INATIVIDADE[4], diasInativo };
};

const thFin = { padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "#5f6368", userSelect: "none", whiteSpace: "nowrap" };
const tdFin = { padding: "8px 12px", verticalAlign: "middle" };

const COR_SIT_FIN = {
  pendente:  { bg: "#fef9e7", text: "#f9ab00", label: "Pendente" },
  pago:      { bg: "#e6f4ea", text: "#34a853", label: "Pago" },
  cancelado: { bg: "#f1f3f4", text: "#9aa0a6", label: "Cancelado" },
  vencida:   { bg: "#fce8e6", text: "#ea4335", label: "Vencida" },
};

function FinAcaoBotao({ label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "7px 10px", background: "#fff", border: "1px solid #dadce0",
      borderRadius: 6, fontSize: 12, color: danger ? "#ea4335" : "#3c4043", fontWeight: 500,
      cursor: "pointer", textAlign: "left", transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? "#fce8e6" : "#f1f3f4"}
      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
      {label}
    </button>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [abaAtiva, setAbaAtiva] = useState("contas");

  const [terapeutas, setTerapeutas] = useState([]);
  const [usages, setUsages] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [filtroInatividade, setFiltroInatividade] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [salvando, setSalvando] = useState(null);
  const [seedando, setSeedando] = useState(false);
  const [seedProgresso, setSeedProgresso] = useState("");
  const [seedResultado, setSeedResultado] = useState(null);

  // Config trial
  const [configTrial, setConfigTrial] = useState({
    dias: TRIAL_DIAS,
    pacientes: LIMITES_TRIAL.pacientes,
    agendamentos: LIMITES_TRIAL.agendamentos,
    documentos: LIMITES_TRIAL.documentos,
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [configSalva, setConfigSalva] = useState(false);

  // Config Asaas
  const [configAsaas, setConfigAsaas] = useState({ apiKey: "", sandbox: false, webhookToken: "" });
  const [salvandoAsaas, setSalvandoAsaas] = useState(false);
  const [asaasSalvo, setAsaasSalvo] = useState(false);
  const [mostrarApiKey, setMostrarApiKey] = useState(false);

  // Planos
  const [planos, setPlanos] = useState([]);
  const [editandoPlano, setEditandoPlano] = useState(null); // null | {} | { id, ... }
  const PLANO_VAZIO = { nome: "", preco: "", precoPioneiro: "", descricao: "", recursos: "", destaque: false, ativo: true, ordem: 99 };
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  // Financeiro por cliente
  const [clienteFinanceiro, setClienteFinanceiro] = useState(null); // terapeuta selecionado

  // Financeiro global
  const [cobrancas, setCobrancas] = useState([]);
  const [carregandoFin, setCarregandoFin] = useState(false);
  const [modalCobranca, setModalCobranca] = useState(null); // { terapeutaId, nome, email }
  const [novaCobranca, setNovaCobranca] = useState({ valor: "", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10", cpfCnpj: "", mobilePhone: "", jaRecebido: false, formaPagamento: "pix", dataPagamento: new Date().toISOString().slice(0, 10) });
  const [linkCobrancaCriada, setLinkCobrancaCriada] = useState(null);
  const [salvandoCob, setSalvandoCob] = useState(false);
  const [finFiltro, setFinFiltro] = useState("pendente");
  const [finSelecionadas, setFinSelecionadas] = useState([]);

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
    setErroCarregar(null);
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
    } catch (e) {
      console.error("[Admin] Erro ao carregar terapeutas:", e);
      setErroCarregar(e.message || String(e));
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    buscarConfigTrial().then(cfg => {
      if (cfg) setConfigTrial(c => ({ ...c, ...cfg }));
    }).catch(() => {});
    buscarConfigAsaas().then(cfg => {
      if (cfg) setConfigAsaas(c => ({ ...c, ...cfg }));
    }).catch(() => {});
    listarPlanos().then(setPlanos).catch(() => {});
  }, []);

  const handleSalvarPlano = async (e) => {
    e.preventDefault();
    setSalvandoPlano(true);
    try {
      const dados = {
        ...editandoPlano,
        preco: parseFloat(editandoPlano.preco),
        precoPioneiro: parseFloat(editandoPlano.precoPioneiro) || 0,
        ordem: Number(editandoPlano.ordem) || 99,
        recursos: typeof editandoPlano.recursos === "string"
          ? editandoPlano.recursos.split("\n").map(r => r.trim()).filter(Boolean)
          : editandoPlano.recursos,
      };
      await salvarPlano(dados);
      const lista = await listarPlanos();
      setPlanos(lista);
      setEditandoPlano(null);
    } catch (e) { alert("Erro: " + e.message); }
    setSalvandoPlano(false);
  };

  const handleExcluirPlano = async (id) => {
    if (!window.confirm("Excluir este plano?")) return;
    await excluirPlano(id);
    setPlanos(p => p.filter(x => x.id !== id));
  };

  const handleTogglePioneiro = async (t) => {
    const novo = !t.membroPioneiro;
    await setMembroPioneiro(t.id, novo);
    setTerapeutas(ts => ts.map(x => x.id === t.id ? { ...x, membroPioneiro: novo } : x));
  };

  const handleTogglePaginaProfissional = async (t) => {
    const novo = !t.paginaProfissional;
    await salvarConfiguracoes(t.id, { paginaProfissional: novo });
    setTerapeutas(ts => ts.map(x => x.id === t.id ? { ...x, paginaProfissional: novo } : x));
  };

  const handleSalvarConfigAsaas = async (e) => {
    e.preventDefault();
    setSalvandoAsaas(true);
    await salvarConfigAsaas({
      apiKey: configAsaas.apiKey,
      sandbox: !!configAsaas.sandbox,
      webhookToken: configAsaas.webhookToken,
    });
    setSalvandoAsaas(false);
    setAsaasSalvo(true);
    setTimeout(() => setAsaasSalvo(false), 2500);
  };

  const handleSalvarConfigTrial = async (e) => {
    e.preventDefault();
    setSalvandoConfig(true);
    await salvarConfigTrial({
      dias: Number(configTrial.dias),
      pacientes: Number(configTrial.pacientes),
      agendamentos: Number(configTrial.agendamentos),
      documentos: Number(configTrial.documentos),
    });
    setSalvandoConfig(false);
    setConfigSalva(true);
    setTimeout(() => setConfigSalva(false), 2500);
  };

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
    const { valor, plano, descricao, recorrente, diaVencimento, jaRecebido, formaPagamento, dataPagamento } = novaCobranca;
    let vencimento = novaCobranca.vencimento;
    if (recorrente) {
      const hoje = new Date();
      const dia = Number(diaVencimento);
      let v = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      if (v <= hoje) v = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
      vencimento = v.toISOString().slice(0, 10);
    }
    if (!valor) { alert("Preencha o valor."); return; }
    if (!jaRecebido && !vencimento) { alert("Preencha o vencimento."); return; }

    setSalvandoCob(true);
    try {
      const vencFinal = vencimento || dataPagamento;
      const descFinal = descricao || `Plano ${plano} — ${new Date(vencFinal + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;

      let asaasDados = {};
      if (!jaRecebido) {
        try {
          asaasDados = await criarCobrancaAsaas({
            nome: modalCobranca.nome,
            email: modalCobranca.email,
            cpfCnpj: novaCobranca.cpfCnpj || "",
            mobilePhone: novaCobranca.mobilePhone || "",
            valor: parseFloat(valor),
            vencimento: vencFinal,
            descricao: descFinal,
            externalReference: modalCobranca.terapeutaId,
          });
        } catch (asaasErr) {
          console.warn("[Admin] Asaas erro:", asaasErr.message);
        }
      }

      await criarCobranca({
        terapeutaId: modalCobranca.terapeutaId,
        terapeutaNome: modalCobranca.nome,
        terapeutaEmail: modalCobranca.email,
        valor: parseFloat(valor),
        vencimento: vencFinal,
        plano,
        descricao: descFinal,
        recorrente: !!recorrente,
        diaVencimento: recorrente ? Number(diaVencimento) : null,
        asaasId: asaasDados.asaasId || null,
        linkPagamento: asaasDados.linkPagamento || null,
        pixCopiaECola: asaasDados.pixCopiaECola || null,
        ...(jaRecebido ? {
          status: "pago",
          pagoEm: new Date(dataPagamento + "T12:00:00"),
          formaPagamento,
        } : {}),
      });

      if (recorrente && !jaRecebido) {
        await salvarAssinaturaTerapeuta(modalCobranca.terapeutaId, {
          ativa: true,
          valor: parseFloat(valor),
          plano,
          diaVencimento: Number(diaVencimento),
          descricao: descricao || `Plano ${plano}`,
          criadaEm: new Date().toISOString().slice(0, 10),
        });
        await carregar();
      }

      setModalCobranca(null);
      setNovaCobranca({ valor: "", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10", cpfCnpj: "", mobilePhone: "", jaRecebido: false, formaPagamento: "pix", dataPagamento: new Date().toISOString().slice(0, 10) });
      if (asaasDados.linkPagamento) setLinkCobrancaCriada(asaasDados.linkPagamento);
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

  // ── Atividade / inatividade ──
  const terapeutasComNivel = terapeutas.map(t => ({ ...t, inatividade: calcularNivelInatividade(t.ultimoAcesso) }));
  const distribuicaoInatividade = NIVEIS_INATIVIDADE.reduce((acc, n) => {
    acc[n.id] = terapeutasComNivel.filter(t => t.inatividade.id === n.id).length;
    return acc;
  }, {});
  const terapeutasFiltradosInatividade = filtroInatividade !== null
    ? terapeutasComNivel.filter(t => t.inatividade.id === filtroInatividade)
    : terapeutasComNivel;

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

      {erroCarregar && (
        <div className="admin-seed-resultado" style={{ background: "#fce8e6", color: "#7a1c14", border: "1px solid #f5b7b1" }}>
          ⚠️ Erro ao carregar as contas: <strong>{erroCarregar}</strong>
          <button onClick={() => setErroCarregar(null)}>✕</button>
        </div>
      )}

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
        <button className={`admin-aba${abaAtiva === "atividade" ? " ativa" : ""}`} onClick={() => setAbaAtiva("atividade")}>
          📊 Atividade
        </button>
        <button className={`admin-aba${abaAtiva === "config" ? " ativa" : ""}`} onClick={() => setAbaAtiva("config")}>
          ⚙️ Configurações
        </button>
        <button className={`admin-aba${abaAtiva === "planos" ? " ativa" : ""}`} onClick={() => setAbaAtiva("planos")}>
          💎 Planos
        </button>
        <button className={`admin-aba${abaAtiva === "integracoes" ? " ativa" : ""}`} onClick={() => setAbaAtiva("integracoes")}>
          🔌 Integrações
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

                  {/* Membro Pioneiro */}
                  <div style={{ marginBottom: 12 }}>
                    <button
                      onClick={() => handleTogglePioneiro(t)}
                      className={`admin-btn ${t.membroPioneiro ? "admin-btn--pioneiro-ativo" : "admin-btn--pioneiro"}`}
                    >
                      {t.membroPioneiro ? "⭐ Membro Pioneiro (ativo)" : "☆ Marcar como Pioneiro"}
                    </button>
                    {t.membroPioneiro && (
                      <span style={{ fontSize: 12, color: "#f59e0b", marginLeft: 10 }}>
                        Desconto pioneiro aplicado nas cobranças
                      </span>
                    )}
                  </div>

                  {/* Página Profissional */}
                  <div style={{ marginBottom: 12 }}>
                    <button
                      onClick={() => handleTogglePaginaProfissional(t)}
                      className={`admin-btn ${t.paginaProfissional ? "admin-btn--pioneiro-ativo" : "admin-btn--pioneiro"}`}
                    >
                      {t.paginaProfissional ? "🌐 Página Profissional (ativa)" : "🌐 Liberar Página Profissional"}
                    </button>
                    {t.paginaProfissional && (
                      <span style={{ fontSize: 12, color: "#7c5c3e", marginLeft: 10 }}>
                        Landing page pública ativa no slug
                      </span>
                    )}
                  </div>

                  {/* Financeiro */}
                  <div style={{ marginBottom: 12 }}>
                    <button
                      className="admin-btn admin-btn--ativar"
                      style={{ background: "#1a73e8" }}
                      onClick={() => setClienteFinanceiro(t)}
                    >
                      💰 Ver financeiro
                    </button>
                  </div>

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

      {/* ─── ABA ATIVIDADE ─── */}
      {abaAtiva === "atividade" && (
        <>
          <p className="admin-sub" style={{ margin: "-8px 0 16px" }}>
            Monitore o engajamento dos terapeutas e detecte risco de abandono, com base no último acesso.
          </p>

          <div className="admin-stats">
            {NIVEIS_INATIVIDADE.map(n => {
              const qtd = distribuicaoInatividade[n.id] || 0;
              const total = terapeutasComNivel.length;
              const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
              const selecionado = filtroInatividade === n.id;
              return (
                <div
                  key={n.id}
                  className="admin-stat-card"
                  style={{
                    borderTopColor: n.cor,
                    cursor: "pointer",
                    background: selecionado ? n.cor + "12" : undefined,
                    boxShadow: selecionado ? `0 0 0 2px ${n.cor}55` : undefined,
                  }}
                  onClick={() => setFiltroInatividade(selecionado ? null : n.id)}
                >
                  <span className="admin-stat-valor" style={{ color: n.cor }}>{qtd}</span>
                  <span className="admin-stat-label">{n.emoji} {n.nome}</span>
                  <span style={{ fontSize: 11, color: "#9aa0a6" }}>{pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="admin-lista">
            {terapeutasFiltradosInatividade.length === 0 && <p className="admin-vazio">Nenhum terapeuta nesta categoria.</p>}
            {terapeutasFiltradosInatividade.map(t => (
              <div key={t.id} className="admin-card">
                <div className="admin-card-main">
                  <div className="admin-card-info">
                    <span className="admin-card-nome">{t.nome || "Sem nome"}</span>
                    <span className="admin-card-email">{t.email}</span>
                    {t.slug && <span className="admin-card-slug">/{t.slug}</span>}
                  </div>
                  <div className="admin-card-meta">
                    <span
                      className="admin-badge"
                      style={{ background: t.inatividade.cor + "1a", color: t.inatividade.cor, border: `1px solid ${t.inatividade.cor}` }}
                    >
                      {t.inatividade.emoji} {t.inatividade.nome}
                    </span>
                    <span className="admin-card-data">
                      {t.inatividade.diasInativo === null ? "Nunca acessou" : `${t.inatividade.diasInativo}d inativo`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── ABA FINANCEIRO ─── */}
      {abaAtiva === "financeiro" && (() => {
        const hoje = new Date().toISOString().slice(0, 10);
        const cobrancasFiltradas = cobrancas.filter(c => {
          if (finFiltro === "todas")    return true;
          if (finFiltro === "vencida")  return c.status === "pendente" && c.vencimento && c.vencimento < hoje;
          if (finFiltro === "pago")     return c.status === "pago";
          if (finFiltro === "cancelado")return c.status === "cancelado";
          return c.status === "pendente";
        });
        const totalFiltrado   = cobrancasFiltradas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
        const totalSelecionado = finSelecionadas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
        const nSel = finSelecionadas.length;
        const selUnica = nSel === 1 ? finSelecionadas[0] : null;

        const abrirNovaCobranca = () => {
          if (terapeutas.length === 0) { alert("Carregue a aba Contas primeiro."); return; }
          const t = selUnica ? terapeutas.find(x => x.id === selUnica.terapeutaId) || terapeutas[0] : terapeutas[0];
          setModalCobranca({ terapeutaId: t.id, nome: t.nome, email: t.email });
          setNovaCobranca({ valor: "79", vencimento: "", plano: "essencial", descricao: "", recorrente: false, diaVencimento: "10", cpfCnpj: "", mobilePhone: "", jaRecebido: false, formaPagamento: "pix", dataPagamento: new Date().toISOString().slice(0, 10) });
        };

        const quitarSelecionadas = async () => {
          if (!nSel) return;
          for (const c of finSelecionadas) {
            if (c.status !== "pago") await handleMarcarPago(c);
          }
          setFinSelecionadas([]);
        };

        const cancelarSelecionadas = async () => {
          if (!nSel) { alert("Selecione ao menos uma cobrança."); return; }
          if (!window.confirm(`Cancelar ${nSel} cobrança(s)?`)) return;
          for (const c of finSelecionadas) await atualizarCobranca(c.id, { status: "cancelado" });
          setFinSelecionadas([]);
          carregarFinanceiro();
        };

        const excluirSelecionadas = async () => {
          if (!nSel) { alert("Selecione ao menos uma cobrança."); return; }
          if (!window.confirm(`Excluir ${nSel} cobrança(s)?`)) return;
          const { deleteDoc, doc: fbDoc } = await import("firebase/firestore");
          const { db } = await import("../../services/firebaseConfig");
          for (const c of finSelecionadas) await deleteDoc(fbDoc(db, "cobrancas", c.id));
          setFinSelecionadas([]);
          carregarFinanceiro();
        };

        const toggleSel = (c) => setFinSelecionadas(prev =>
          prev.find(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c]
        );

        const FIN_FILTROS = [
          { val: "pendente",  label: "Pendentes",  n: cobrancas.filter(c => c.status === "pendente").length },
          { val: "pago",      label: "Quitadas",   n: cobrancas.filter(c => c.status === "pago").length },
          { val: "cancelado", label: "Canceladas", n: cobrancas.filter(c => c.status === "cancelado").length },
          { val: "vencida",   label: "Vencidas",   n: cobrancas.filter(c => c.status === "pendente" && c.vencimento && c.vencimento < hoje).length },
          { val: "todas",     label: "Todas",      n: cobrancas.length },
        ];

        const acoes = [
          { label: "+ Incluir",  onClick: abrirNovaCobranca },
          { label: "✓ Quitar",   onClick: quitarSelecionadas },
          { label: "Cancelar",   onClick: cancelarSelecionadas },
          { label: "Excluir",    onClick: excluirSelecionadas, danger: true },
          { label: "↻ Atualizar",onClick: carregarFinanceiro },
        ];

        return (
          <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 220px)", minHeight: 400 }}>

            {/* Tabela */}
            <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid #e8eaed" }}>
              {carregandoFin ? (
                <p style={{ padding: 32, color: "#9aa0a6", fontSize: 13 }}>Carregando…</p>
              ) : cobrancasFiltradas.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#9aa0a6" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💸</div>
                  <div>Nenhuma cobrança neste filtro.</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Clique em "+ Incluir" para criar a primeira.</div>
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #e8eaed", position: "sticky", top: 0 }}>
                        <th style={thFin}>
                          <input type="checkbox" style={{ accentColor: "#1a73e8" }}
                            checked={nSel === cobrancasFiltradas.length && nSel > 0}
                            onChange={e => setFinSelecionadas(e.target.checked ? cobrancasFiltradas : [])} />
                        </th>
                        <th style={thFin}>Cliente</th>
                        <th style={thFin}>Plano</th>
                        <th style={thFin}>Descrição</th>
                        <th style={thFin}>Vencimento</th>
                        <th style={thFin}>Pagamento</th>
                        <th style={thFin}>Valor</th>
                        <th style={thFin}>Situação</th>
                        <th style={thFin}>Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cobrancasFiltradas.map((c, i) => {
                        const vencida = c.status === "pendente" && c.vencimento && c.vencimento < hoje;
                        const sitKey  = vencida ? "vencida" : c.status;
                        const sit     = COR_SIT_FIN[sitKey] || COR_SIT_FIN.pendente;
                        const sel     = !!finSelecionadas.find(x => x.id === c.id);
                        return (
                          <tr key={c.id} onClick={() => toggleSel(c)}
                            style={{ background: sel ? "#e8f0fe" : i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", borderBottom: "1px solid #e8eaed" }}>
                            <td style={tdFin} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={sel} onChange={() => toggleSel(c)} style={{ accentColor: "#1a73e8" }} />
                            </td>
                            <td style={tdFin}>
                              <div style={{ fontWeight: 600, color: "#1a2535", fontSize: 13 }}>{c.terapeutaNome || "—"}</div>
                              <div style={{ fontSize: 11, color: "#9aa0a6" }}>{c.terapeutaEmail}</div>
                            </td>
                            <td style={tdFin}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f3f4", color: "#5f6368", padding: "2px 8px", borderRadius: 12 }}>
                                {c.plano || "—"}
                              </span>
                              {c.recorrente && <span style={{ marginLeft: 4, fontSize: 11 }}>🔁</span>}
                            </td>
                            <td style={{ ...tdFin, color: "#5f6368", maxWidth: 180 }}>{c.descricao || "—"}</td>
                            <td style={{ ...tdFin, color: vencida ? "#ea4335" : "#5f6368", whiteSpace: "nowrap" }}>
                              {c.vencimento ? new Date(c.vencimento + "T12:00").toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td style={{ ...tdFin, color: "#5f6368", fontSize: 12, whiteSpace: "nowrap" }}>
                              {c.pagoEm ? new Date(c.pagoEm?.toDate?.() || c.pagoEm).toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td style={{ ...tdFin, fontWeight: 700, color: "#1a2535", whiteSpace: "nowrap" }}>
                              R$ {Number(c.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={tdFin}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sit.bg, color: sit.text }}>
                                {sit.label}
                              </span>
                            </td>
                            <td style={{ ...tdFin, color: "#9aa0a6", fontSize: 12 }}>
                              {c.formaPagamento || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #e8eaed", display: "flex", justifyContent: "flex-end", gap: 8, fontSize: 13, background: "#f8f9fa" }}>
                    <span style={{ color: "#9aa0a6" }}>{cobrancasFiltradas.length} registro{cobrancasFiltradas.length !== 1 ? "s" : ""} · Total:</span>
                    <span style={{ fontWeight: 700, color: "#1a2535" }}>R$ {totalFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ width: 190, display: "flex", flexDirection: "column", flexShrink: 0, background: "#f8f9fa", overflowY: "auto" }}>

              {/* KPIs compactos */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8eaed", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Receita total",   valor: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: "#34a853" },
                  { label: "Pagas",           valor: cobPagas.length,    cor: "#1a73e8" },
                  { label: "Pendentes",       valor: cobPendentes.length, cor: "#f9ab00" },
                  { label: "Inadimplentes",   valor: inadimplentes.length, cor: "#ea4335" },
                ].map(k => (
                  <div key={k.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <span style={{ color: "#5f6368" }}>{k.label}</span>
                    <span style={{ fontWeight: 700, color: k.cor }}>{k.valor}</span>
                  </div>
                ))}
              </div>

              {/* Ações */}
              <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8eaed" }}>
                Ações
              </div>
              <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 6, borderBottom: "1px solid #e8eaed" }}>
                {acoes.map(a => (
                  <FinAcaoBotao key={a.label} label={a.label} onClick={a.onClick} danger={a.danger} />
                ))}
              </div>

              {/* Filtros */}
              <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8eaed" }}>
                Filtros Rápidos
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2, borderBottom: "1px solid #e8eaed" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5f6368", marginBottom: 8, border: "1px solid #e8eaed", borderRadius: 6, padding: "5px 10px", background: "#fff" }}>
                  Situação
                </div>
                {FIN_FILTROS.map(fi => (
                  <label key={fi.val} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", color: finFiltro === fi.val ? "#1a73e8" : "#5f6368", fontWeight: finFiltro === fi.val ? 700 : 400, padding: "4px 2px" }}>
                    <input type="radio" name="finFiltro" value={fi.val} checked={finFiltro === fi.val} onChange={() => setFinFiltro(fi.val)} style={{ accentColor: "#1a73e8" }} />
                    {fi.label} <span style={{ color: "#9aa0a6", fontSize: 11 }}>({fi.n})</span>
                  </label>
                ))}
              </div>

              {/* Info seleção */}
              {nSel > 0 && (
                <div style={{ margin: "10px", padding: "10px 12px", background: "#e8f0fe", border: "1px solid #c5d8fb", borderRadius: 8, fontSize: 11, color: "#1a73e8" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>{nSel} selecionada{nSel > 1 ? "s" : ""}</div>
                  {selUnica && <div style={{ color: "#5f6368", marginBottom: 4, fontSize: 11 }}>{selUnica.terapeutaNome}</div>}
                  <div style={{ fontWeight: 700, color: "#1a2535" }}>
                    R$ {totalSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <button onClick={() => setFinSelecionadas([])} style={{ marginTop: 8, width: "100%", padding: "4px", background: "none", border: "1px solid #dadce0", borderRadius: 6, color: "#9aa0a6", fontSize: 11, cursor: "pointer" }}>
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal financeiro por cliente */}
      {clienteFinanceiro && (
        <ContasCliente
          cliente={clienteFinanceiro}
          onClose={() => setClienteFinanceiro(null)}
        />
      )}

      {/* Modal nova cobrança */}
      {/* Popup link cobrança criada */}
      {linkCobrancaCriada && (
        <div className="admin-overlay" onClick={() => setLinkCobrancaCriada(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 className="admin-modal-titulo">✅ Cobrança criada no Asaas</h3>
            <p style={{ fontSize: 13, color: "#5f6368", marginBottom: 16 }}>
              Compartilhe o link abaixo com o cliente para que ele realize o pagamento via PIX, boleto ou cartão.
            </p>
            <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 16 }}>
              {linkCobrancaCriada}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="admin-btn admin-btn--ativar" onClick={() => { navigator.clipboard.writeText(linkCobrancaCriada); alert("Link copiado!"); }}>
                📋 Copiar link
              </button>
              <a href={linkCobrancaCriada} target="_blank" rel="noreferrer" className="admin-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Abrir ↗
              </a>
              <button className="admin-btn" onClick={() => setLinkCobrancaCriada(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {modalCobranca && (
        <div className="admin-overlay" onClick={() => setModalCobranca(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Nova cobrança</h3>
              <button onClick={() => setModalCobranca(null)}>✕</button>
            </div>
            <div className="admin-modal-form" style={{ paddingBottom: 0, marginBottom: 0 }}>
              <label style={{ fontWeight: 600 }}>Cliente
                <select
                  value={modalCobranca.terapeutaId}
                  onChange={e => {
                    const t = terapeutas.find(x => x.id === e.target.value);
                    if (t) setModalCobranca({ terapeutaId: t.id, nome: t.nome, email: t.email });
                  }}
                  style={{ marginTop: 4 }}
                >
                  {terapeutas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome || t.email}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-modal-form">
              {/* Seletor de modo */}
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <button type="button"
                  onClick={() => setNovaCobranca(n => ({ ...n, jaRecebido: false }))}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `2px solid ${!novaCobranca.jaRecebido ? "#1a73e8" : "#dadce0"}`, background: !novaCobranca.jaRecebido ? "#e8f0fe" : "#fff", color: !novaCobranca.jaRecebido ? "#1a73e8" : "#5f6368", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  💳 Gerar cobrança
                </button>
                <button type="button"
                  onClick={() => setNovaCobranca(n => ({ ...n, jaRecebido: true, recorrente: false }))}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `2px solid ${novaCobranca.jaRecebido ? "#34a853" : "#dadce0"}`, background: novaCobranca.jaRecebido ? "#e8f5e9" : "#fff", color: novaCobranca.jaRecebido ? "#34a853" : "#5f6368", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  ✅ Já recebi
                </button>
              </div>

              {/* Toggle recorrente — só quando não é jaRecebido */}
              {!novaCobranca.jaRecebido && (
                <label className="admin-modal-toggle">
                  <input type="checkbox" checked={novaCobranca.recorrente}
                    onChange={e => setNovaCobranca(n => ({ ...n, recorrente: e.target.checked }))} />
                  <span>🔁 Assinatura mensal recorrente</span>
                </label>
              )}

              <label>Plano
                <select value={novaCobranca.plano} onChange={e => {
                  const p = e.target.value;
                  setNovaCobranca(n => ({ ...n, plano: p, valor: String(VALORES_PLANO[p] || "") }));
                }}>
                  <option value="essencial">Essencial — R$ 79</option>
                  <option value="profissional">Profissional — R$ 149</option>
                  <option value="pioneiro">Pioneiro — R$ 49</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <label>Valor (R$)
                <input type="number" value={novaCobranca.valor} onChange={e => setNovaCobranca(n => ({ ...n, valor: e.target.value }))} min="0" step="1" />
              </label>

              {novaCobranca.jaRecebido ? (
                <>
                  <label>Forma de recebimento
                    <select value={novaCobranca.formaPagamento} onChange={e => setNovaCobranca(n => ({ ...n, formaPagamento: e.target.value }))}>
                      <option value="pix">Pix</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="transferencia">Transferência bancária</option>
                      <option value="cartao">Cartão</option>
                      <option value="outro">Outro</option>
                    </select>
                  </label>
                  <label>Data do recebimento
                    <input type="date" value={novaCobranca.dataPagamento} onChange={e => setNovaCobranca(n => ({ ...n, dataPagamento: e.target.value }))} />
                  </label>
                </>
              ) : novaCobranca.recorrente ? (
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

              {!novaCobranca.jaRecebido && (
                <>
                  <label>CPF / CNPJ <span style={{ fontSize: 11, color: "#aaa" }}>(necessário para boleto)</span>
                    <input type="text" value={novaCobranca.cpfCnpj} onChange={e => setNovaCobranca(n => ({ ...n, cpfCnpj: e.target.value }))} placeholder="000.000.000-00" />
                  </label>
                  <label>WhatsApp <span style={{ fontSize: 11, color: "#aaa" }}>(opcional)</span>
                    <input type="text" value={novaCobranca.mobilePhone} onChange={e => setNovaCobranca(n => ({ ...n, mobilePhone: e.target.value }))} placeholder="(11) 99999-9999" />
                  </label>
                </>
              )}
            </div>
            <div className="admin-modal-acoes">
              <button className="admin-btn admin-btn--ativar" onClick={handleCriarCobranca} disabled={salvandoCob}>
                {salvandoCob ? "Salvando…" : novaCobranca.jaRecebido ? "✅ Registrar pagamento" : novaCobranca.recorrente ? "Criar assinatura" : "Criar cobrança"}
              </button>
              <button className="admin-btn" onClick={() => setModalCobranca(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA CONFIGURAÇÕES ─── */}
      {abaAtiva === "config" && (
        <div style={{ maxWidth: 560 }}>
          <h3 style={{ margin: "0 0 6px", color: "#1a2535" }}>⚙️ Configurações do Trial</h3>
          <p style={{ margin: "0 0 24px", color: "#888", fontSize: 13 }}>
            Define os limites padrão aplicados a novos usuários no período gratuito.
          </p>

          <form onSubmit={handleSalvarConfigTrial} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { key: "dias",         label: "Duração (dias)",           min: 1, max: 365 },
              { key: "pacientes",    label: "Limite de pacientes",      min: 0 },
              { key: "agendamentos", label: "Limite de agendamentos",   min: 0 },
              { key: "documentos",   label: "Limite de documentos",     min: 0 },
            ].map(({ key, label, min, max }) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2535" }}>{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={configTrial[key]}
                  onChange={e => setConfigTrial(c => ({ ...c, [key]: e.target.value }))}
                  style={{
                    padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0",
                    fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                  required
                />
              </label>
            ))}

            <button
              type="submit"
              disabled={salvandoConfig}
              style={{
                marginTop: 8, padding: "12px 24px", background: "#1a73e8", color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: salvandoConfig ? "not-allowed" : "pointer", opacity: salvandoConfig ? 0.7 : 1,
              }}
            >
              {salvandoConfig ? "Salvando..." : "💾 Salvar configurações"}
            </button>

            {configSalva && (
              <p style={{ color: "#34a853", fontWeight: 600, fontSize: 13, margin: 0 }}>
                ✅ Configurações salvas com sucesso!
              </p>
            )}
          </form>

          <div style={{ marginTop: 32, padding: 16, background: "#f8f9fa", borderRadius: 10, fontSize: 13, color: "#666" }}>
            <strong>Atenção:</strong> as alterações aqui afetam apenas novos usuários que se registrarem. Para alterar os limites de um usuário já existente, edite diretamente na aba <strong>Contas</strong>.
          </div>
        </div>
      )}

      {/* ─── ABA PLANOS ─── */}
      {abaAtiva === "planos" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: "0 0 4px", color: "#1a2535" }}>💎 Planos de assinatura</h3>
              <p style={{ margin: 0, color: "#888", fontSize: 13 }}>Crie e edite os planos oferecidos. O preço pioneiro é aplicado automaticamente para membros marcados como Pioneiro.</p>
            </div>
            <button className="admin-btn admin-btn--ativar" onClick={() => setEditandoPlano({ ...PLANO_VAZIO })}>
              + Novo plano
            </button>
          </div>

          {/* Lista de planos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {planos.map(p => (
              <div key={p.id} style={{ background: "#fff", border: `2px solid ${p.destaque ? "#1a73e8" : "#e8eaed"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                {p.destaque && <span style={{ background: "#1a73e8", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>MAIS POPULAR</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <strong style={{ fontSize: 15, color: "#1a2535" }}>{p.nome}</strong>
                    {!p.ativo && <span style={{ fontSize: 11, color: "#aaa", background: "#f1f3f4", padding: "2px 8px", borderRadius: 20 }}>Inativo</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#5f6368", marginTop: 2 }}>{p.descricao}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1a2535" }}>R$ {Number(p.preco).toFixed(2).replace(".", ",")}</div>
                  <div style={{ fontSize: 12, color: "#f59e0b" }}>⭐ Pioneiro: R$ {Number(p.precoPioneiro).toFixed(2).replace(".", ",")}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="admin-btn" onClick={() => setEditandoPlano({ ...p, recursos: Array.isArray(p.recursos) ? p.recursos.join("\n") : p.recursos })}>✏️ Editar</button>
                  <button className="admin-btn admin-btn--bloquear" onClick={() => handleExcluirPlano(p.id)}>🗑</button>
                </div>
              </div>
            ))}
            {planos.length === 0 && <div style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: 32 }}>Nenhum plano cadastrado.</div>}
          </div>

          {/* Formulário de edição */}
          {editandoPlano && (
            <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 14, padding: 24 }}>
              <h4 style={{ margin: "0 0 18px", color: "#1a2535" }}>{editandoPlano.id ? "Editar plano" : "Novo plano"}</h4>
              <form onSubmit={handleSalvarPlano} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5f6368" }}>Nome do plano</span>
                    <input value={editandoPlano.nome} onChange={e => setEditandoPlano(p => ({ ...p, nome: e.target.value }))} required placeholder="Ex: Essencial" style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14 }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5f6368" }}>Descrição</span>
                    <input value={editandoPlano.descricao} onChange={e => setEditandoPlano(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Ideal para profissional solo" style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14 }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5f6368" }}>Preço (R$)</span>
                    <input type="number" step="0.01" value={editandoPlano.preco} onChange={e => setEditandoPlano(p => ({ ...p, preco: e.target.value }))} required placeholder="79.90" style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14 }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5f6368" }}>⭐ Preço Pioneiro (R$)</span>
                    <input type="number" step="0.01" value={editandoPlano.precoPioneiro} onChange={e => setEditandoPlano(p => ({ ...p, precoPioneiro: e.target.value }))} placeholder="49.90" style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14 }} />
                  </label>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#5f6368" }}>Recursos (um por linha)</span>
                  <textarea rows={4} value={editandoPlano.recursos} onChange={e => setEditandoPlano(p => ({ ...p, recursos: e.target.value }))} placeholder={"Clientes ilimitados\nAgenda\nFinanceiro"} style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14, resize: "vertical" }} />
                </label>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={!!editandoPlano.destaque} onChange={e => setEditandoPlano(p => ({ ...p, destaque: e.target.checked }))} />
                    Destacar como "Mais popular"
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={!!editandoPlano.ativo} onChange={e => setEditandoPlano(p => ({ ...p, ativo: e.target.checked }))} />
                    Plano ativo (visível para usuários)
                  </label>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="admin-btn admin-btn--ativar" disabled={salvandoPlano}>{salvandoPlano ? "Salvando..." : "💾 Salvar plano"}</button>
                  <button type="button" className="admin-btn" onClick={() => setEditandoPlano(null)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA INTEGRAÇÕES ─── */}
      {abaAtiva === "integracoes" && (
        <div style={{ maxWidth: 560 }}>
          <h3 style={{ margin: "0 0 6px", color: "#1a2535" }}>🔌 Integração Asaas</h3>
          <p style={{ margin: "0 0 24px", color: "#888", fontSize: 13 }}>
            Configure a API do Asaas para gerar cobranças com PIX, boleto e cartão automaticamente.
          </p>

          <form onSubmit={handleSalvarConfigAsaas} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#3c4043" }}>Chave da API (access_token)</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={mostrarApiKey ? "text" : "password"}
                  value={configAsaas.apiKey}
                  onChange={e => setConfigAsaas(c => ({ ...c, apiKey: e.target.value }))}
                  placeholder="$aact_..."
                  style={{ flex: 1, border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "monospace" }}
                />
                <button type="button" onClick={() => setMostrarApiKey(v => !v)}
                  style={{ padding: "9px 14px", border: "1px solid #dadce0", borderRadius: 8, background: "#f8f9fa", cursor: "pointer", fontSize: 13 }}>
                  {mostrarApiKey ? "🙈 Ocultar" : "👁 Ver"}
                </button>
              </div>
              <span style={{ fontSize: 11, color: "#aaa" }}>Encontre em: Asaas → Configurações → Integrações → API</span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#3c4043" }}>Token do Webhook</span>
              <input
                type="text"
                value={configAsaas.webhookToken}
                onChange={e => setConfigAsaas(c => ({ ...c, webhookToken: e.target.value }))}
                placeholder="Crie uma senha secreta, ex: novu2026abc"
                style={{ border: "1px solid #dadce0", borderRadius: 8, padding: "9px 12px", fontSize: 14 }}
              />
              <span style={{ fontSize: 11, color: "#aaa" }}>
                URL para cadastrar no Asaas: <strong>https://novu.institutocroco.com.br/api/asaas/webhook?token=<em>{configAsaas.webhookToken || "SEU_TOKEN"}</em></strong>
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!configAsaas.sandbox}
                onChange={e => setConfigAsaas(c => ({ ...c, sandbox: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#3c4043" }}>Modo Sandbox (testes)</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>Ative para usar o ambiente de testes do Asaas. Desative em produção.</div>
              </div>
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 4 }}>
              <button type="submit" className="admin-btn admin-btn--ativar" disabled={salvandoAsaas}>
                {salvandoAsaas ? "Salvando..." : "💾 Salvar configurações"}
              </button>
              {asaasSalvo && (
                <span style={{ color: "#34a853", fontWeight: 600, fontSize: 13 }}>✅ Salvo!</span>
              )}
            </div>
          </form>

          <div style={{ marginTop: 28, background: "#f8f9fa", borderRadius: 10, padding: 16, fontSize: 13, color: "#5f6368", lineHeight: 1.6 }}>
            <strong>Passo a passo para ativar o webhook no Asaas:</strong>
            <ol style={{ margin: "8px 0 0 16px", padding: 0 }}>
              <li>Acesse <strong>Asaas → Configurações → Integrações → Webhooks</strong></li>
              <li>Clique em <strong>Adicionar webhook</strong></li>
              <li>Cole a URL acima com o seu token</li>
              <li>Marque os eventos: <strong>PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_CANCELED</strong></li>
            </ol>
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
          { key: "pacientes",    label: "Clientes" },
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
