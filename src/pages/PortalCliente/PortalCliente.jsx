import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  buscarWorkspacePorSlug, buscarPacientePorEmail, gerarCodigoAcesso,
  validarCodigo, listarAgendamentosPacientePortal, listarDocumentosPortal,
  cancelarAgendamentoPortal,
} from "../../services/portalClienteService";
import { listarProfissionais } from "../../services/profissionaisService";
import "../../styles/portal-cliente.css";

const ANTECEDENCIA_HORAS = 24;

const fmtData = (iso) => iso ? new Date(iso + "T00:00").toLocaleDateString("pt-BR") : "—";

export default function PortalCliente() {
  const { slug } = useParams();
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars

  const [workspace, setWorkspace] = useState(null);
  const [etapa, setEtapa] = useState("email"); // "email" | "codigo" | "logado"
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pacienteId, setPacienteId] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [aba, setAba] = useState("proximas");
  const [agendamentos, setAgendamentos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [mapaProfissionais, setMapaProfissionais] = useState({});
  const [carregandoDados, setCarregandoDados] = useState(false);

  useEffect(() => {
    const init = async () => {
      const ws = await buscarWorkspacePorSlug(slug);
      if (!ws) { setErro("Consultório não encontrado."); return; }
      setWorkspace(ws);
    };
    init();
  }, [slug]);

  // Recupera sessão salva
  useEffect(() => {
    const saved = sessionStorage.getItem(`portal_${slug}`);
    if (saved) {
      const { pacienteId: pid, paciente: pac } = JSON.parse(saved);
      setPacienteId(pid);
      setPaciente(pac);
      setEtapa("logado");
    }
  }, [slug]);

  useEffect(() => {
    if (etapa === "logado" && workspace) carregarDados();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, workspace]);

  const carregarDados = async () => {
    setCarregandoDados(true);
    const [ags, docs, profs] = await Promise.all([
      listarAgendamentosPacientePortal(workspace.id, pacienteId),
      listarDocumentosPortal(workspace.id, pacienteId),
      listarProfissionais(workspace.id),
    ]);
    setAgendamentos(ags);
    setDocumentos(docs);
    const mapa = {};
    profs.forEach(p => { mapa[p.id] = p; });
    setMapaProfissionais(mapa);
    setCarregandoDados(false);
  };

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setErro(""); setCarregando(true);
    try {
      const pac = await buscarPacientePorEmail(workspace.id, email);
      if (!pac) { setErro("E-mail não encontrado neste consultório."); setCarregando(false); return; }
      const code = await gerarCodigoAcesso(workspace.id, pac.id, email);
      // Em produção: enviar por e-mail. Por ora, exibimos para demonstração:
      setInfo(`Código gerado: ${code} (em produção será enviado por e-mail)`);
      setPacienteId(pac.id);
      setPaciente(pac);
      setEtapa("codigo");
    } catch (err) { setErro("Erro: " + err.message); }
    setCarregando(false);
  };

  const handleValidarCodigo = async (e) => {
    e.preventDefault();
    setErro(""); setCarregando(true);
    try {
      const pid = await validarCodigo(workspace.id, email, codigo);
      if (!pid) { setErro("Código inválido ou expirado."); setCarregando(false); return; }
      sessionStorage.setItem(`portal_${slug}`, JSON.stringify({ pacienteId: pid, paciente }));
      setEtapa("logado");
    } catch (err) { setErro("Erro: " + err.message); }
    setCarregando(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`portal_${slug}`);
    setEtapa("email");
    setPacienteId(null);
    setPaciente(null);
    setEmail("");
    setCodigo("");
  };

  const handleCancelar = async (ag) => {
    const agData = new Date(ag.data + "T" + (ag.hora || "00:00"));
    const diffHoras = (agData - new Date()) / 3600000;
    if (diffHoras < ANTECEDENCIA_HORAS) {
      alert(`Cancelamentos devem ser feitos com pelo menos ${ANTECEDENCIA_HORAS}h de antecedência.`);
      return;
    }
    if (!window.confirm("Cancelar este agendamento?")) return;
    await cancelarAgendamentoPortal(ag.id);
    await carregarDados();
  };

  const hoje = new Date().toISOString().slice(0, 10);
  const proximas = agendamentos.filter(a => a.data >= hoje && a.status !== "cancelado").sort((a, b) => a.data > b.data ? 1 : -1);
  const historico = agendamentos.filter(a => a.data < hoje || a.status === "concluído").sort((a, b) => b.data > a.data ? 1 : -1);

  // ── Tela de login ──
  if (etapa !== "logado") {
    return (
      <div className="portal-page">
        <div className="portal-header">
          <div className="portal-logo">{workspace?.nome || slug}</div>
          <div className="portal-subtitulo">Portal do cliente</div>
        </div>

        <div className="portal-login-card">
          {etapa === "email" ? (
            <>
              <h2 className="portal-login-titulo">Acessar minha área</h2>
              <p className="portal-login-desc">Informe seu e-mail cadastrado para receber um código de acesso.</p>
              {erro && <p className="portal-erro">{erro}</p>}
              <form className="portal-form" onSubmit={handleSolicitarCodigo}>
                <label>E-mail
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </label>
                <button type="submit" className="portal-btn-primary" disabled={carregando || !workspace}>
                  {carregando ? "Verificando..." : "Solicitar código"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="portal-login-titulo">Confirme seu acesso</h2>
              <p className="portal-login-desc">Insira o código enviado para <strong>{email}</strong>. Válido por 15 minutos.</p>
              {erro && <p className="portal-erro">{erro}</p>}
              {info && <p className="portal-info">{info}</p>}
              <form className="portal-form" onSubmit={handleValidarCodigo}>
                <label>Código de 6 dígitos
                  <input type="text" maxLength={6} required value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="000000" style={{ letterSpacing: "0.3em", fontSize: 22, textAlign: "center" }} />
                </label>
                <button type="submit" className="portal-btn-primary" disabled={carregando}>
                  {carregando ? "Verificando..." : "Entrar"}
                </button>
              </form>
              <button className="portal-btn-voltar" onClick={() => { setEtapa("email"); setErro(""); setInfo(""); }}>← Voltar</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Área logada ──
  const abas = [
    { key: "proximas",  label: "📅 Próximas sessões" },
    { key: "historico", label: "🕐 Histórico" },
    { key: "documentos",label: "📄 Documentos" },
  ];

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-logo">{workspace?.nome || slug}</div>
        <div className="portal-subtitulo">Portal do cliente</div>
      </div>

      <div className="portal-app">
        <div className="portal-top-bar">
          <div>
            <p className="portal-welcome">Olá, {paciente?.nome?.split(" ")[0]} 👋</p>
            <p className="portal-welcome-sub">Bem-vindo(a) à sua área exclusiva.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <a href={`/${slug}/agendar`} className="portal-btn-agendar">
              📅 Agendar sessão
            </a>
            <button className="portal-logout" onClick={handleLogout}>Sair</button>
          </div>
        </div>

        <div className="portal-abas">
          {abas.map(a => (
            <button key={a.key} className={`portal-aba${aba === a.key ? " ativa" : ""}`} onClick={() => setAba(a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        {carregandoDados ? <p className="portal-vazio">Carregando...</p> : (
          <>
            {/* Próximas sessões */}
            {aba === "proximas" && (
              <div className="portal-card">
                <h3 className="portal-card-titulo">Próximas sessões</h3>
                {proximas.length === 0 ? (
                  <p className="portal-vazio">Nenhuma sessão agendada.</p>
                ) : proximas.map(ag => {
                  const d = new Date(ag.data + "T00:00");
                  const prof = mapaProfissionais[ag.profissionalId];
                  return (
                    <div key={ag.id} className="portal-sessao-row">
                      <div className="portal-sessao-data">
                        <div className="portal-sessao-data-dia">{d.getDate()}</div>
                        <div className="portal-sessao-data-mes">{d.toLocaleString("pt-BR", { month: "short" })}</div>
                      </div>
                      <div className="portal-sessao-info">
                        <div className="portal-sessao-hora">{ag.hora} · {ag.duracao}min</div>
                        <div className="portal-sessao-prof">{prof?.nome || "Profissional"}</div>
                      </div>
                      <span className={`portal-badge portal-badge--${ag.status}`}>{ag.status}</span>
                      {ag.status === "confirmado" && (
                        <button className="portal-btn-cancel" onClick={() => handleCancelar(ag)}>Cancelar</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Histórico */}
            {aba === "historico" && (
              <div className="portal-card">
                <h3 className="portal-card-titulo">Histórico de sessões</h3>
                {historico.length === 0 ? (
                  <p className="portal-vazio">Nenhuma sessão no histórico.</p>
                ) : historico.map(ag => {
                  const prof = mapaProfissionais[ag.profissionalId];
                  return (
                    <div key={ag.id} className="portal-sessao-row">
                      <div className="portal-sessao-data" style={{ background: "#f1f3f4", color: "#5f6368" }}>
                        <div className="portal-sessao-data-dia">{new Date(ag.data + "T00:00").getDate()}</div>
                        <div className="portal-sessao-data-mes">{new Date(ag.data + "T00:00").toLocaleString("pt-BR", { month: "short" })}</div>
                      </div>
                      <div className="portal-sessao-info">
                        <div className="portal-sessao-hora">{ag.hora} · {ag.duracao}min</div>
                        <div className="portal-sessao-prof">{prof?.nome || "Profissional"}</div>
                      </div>
                      <span className={`portal-badge portal-badge--${ag.status}`}>{ag.status}</span>
                      {ag.valor && <span style={{ fontSize: 13, color: "#34a853", fontWeight: 700 }}>R$ {Number(ag.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Documentos */}
            {aba === "documentos" && (
              <div className="portal-card">
                <h3 className="portal-card-titulo">Documentos compartilhados</h3>
                {documentos.length === 0 ? (
                  <p className="portal-vazio">Nenhum documento compartilhado ainda.</p>
                ) : documentos.map(doc => (
                  <div key={doc.id} className="portal-doc-row">
                    <div className="portal-doc-nome">📄 {doc.tipo || "Documento"}</div>
                    <div className="portal-doc-data">{fmtData(doc.criadoEm?.toDate?.()?.toISOString?.()?.slice(0,10))}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Remarcar */}
            {aba === "remarcar" && (
              <div className="portal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                <p style={{ fontSize: 16, color: "#1a2535", marginBottom: 24 }}>
                  Precisa remarcar uma sessão? Use nossa página de agendamento online.
                </p>
                <a href={`/${slug}/agendar`} className="portal-btn-remarcar">
                  📅 Agendar nova sessão
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
