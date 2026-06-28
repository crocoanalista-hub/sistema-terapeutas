import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buscarPaciente } from "../../services/pacientesService";
import { listarAgendamentosPaciente } from "../../services/agendamentosService";
import {
  buscarConfigFinanceira, salvarConfigFinanceira, adicionarSessoesPacote,
} from "../../services/pagamentosPacienteService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/detalhe-paciente.css";

const STATUS_COR = {
  confirmado:  { bg: "#d4edda", text: "#155724" },
  "concluído": { bg: "#cfe2ff", text: "#084298" },
  cancelado:   { bg: "#f8d7da", text: "#721c24" },
  falta:       { bg: "#fff3cd", text: "#856404" },
};

const METODOS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Transferência", "Plano de saúde"];
const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DetalhePaciente() {
  const { user, workspaceId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [carregando, setCarregando] = useState(true);
  const [paciente, setPaciente] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("dados");

  // Financeiro
  const [cfg, setCfg] = useState(null);
  const [editandoCfg, setEditandoCfg] = useState(false);
  const [cfgRascunho, setCfgRascunho] = useState({});
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [adicionandoPacote, setAdicionandoPacote] = useState(false);
  const [qntPacote, setQntPacote] = useState(10);

  useEffect(() => { carregarDados(); }, [id, user]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [dadosPaciente, cfgFin] = await Promise.all([
        buscarPaciente(id),
        buscarConfigFinanceira(id),
      ]);
      setPaciente(dadosPaciente);
      setCfg(cfgFin);
      setCfgRascunho(cfgFin);
      if (workspaceId) {
        const ag = await listarAgendamentosPaciente(workspaceId, id);
        setAgendamentos(ag);
      }
    } catch (err) {
      setErro("Erro ao carregar dados: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarCfg = async () => {
    setSalvandoCfg(true);
    try {
      await salvarConfigFinanceira(id, cfgRascunho);
      setCfg(cfgRascunho);
      setEditandoCfg(false);
    } catch (e) { alert("Erro: " + e.message); }
    setSalvandoCfg(false);
  };

  const handleAdicionarPacote = async () => {
    setAdicionandoPacote(true);
    try {
      await adicionarSessoesPacote(id, Number(qntPacote));
      const nova = await buscarConfigFinanceira(id);
      setCfg(nova);
      setCfgRascunho(nova);
    } catch (e) { alert("Erro: " + e.message); }
    setAdicionandoPacote(false);
  };

  if (carregando) return <div className="dp-loading">Carregando...</div>;
  if (!paciente) return (
    <div className="dp-not-found">
      <p>Paciente não encontrado.</p>
      <button onClick={() => navigate("/pacientes")}>Voltar</button>
    </div>
  );

  // Stats
  const concluidas = agendamentos.filter(a => a.status === "concluído").length;
  const faltas     = agendamentos.filter(a => a.status === "falta").length;
  const totalPago  = agendamentos.reduce((s, a) => s + (a.pago && a.valor ? a.valor : 0), 0);
  const aReceber   = agendamentos.filter(a => a.status === "concluído" && !a.pago)
                                 .reduce((s, a) => s + (a.valor || cfg?.valorSessao || 0), 0);

  const atalhos = [
    { label: "📝 Evolução Clínica", cor: "#9b59b6", rota: `/pacientes/${id}/evolucao` },
    { label: "📋 Anamnese",          cor: "#16a085", rota: `/pacientes/${id}/anamnese` },
    { label: "📅 Marcar Sessão",     cor: "#27ae60", rota: `/agenda/marcar` },
    { label: "✏️ Editar Dados",      cor: "#f39c12", rota: `/pacientes/${id}/editar` },
  ];

  return (
    <div className="dp-page">
      {/* Header */}
      <div className="dp-header">
        <button className="dp-back" onClick={() => navigate("/pacientes")}>←</button>
        <h2 className="dp-nome">{paciente.nome}</h2>
        {paciente.telefone && (
          <a
            href={`https://wa.me/55${paciente.telefone.replace(/\D/g,"")}`}
            target="_blank" rel="noreferrer"
            className="dp-wpp-btn"
          >💬 WhatsApp</a>
        )}
      </div>

      {erro && <div className="dp-erro">{erro}</div>}

      {/* Atalhos */}
      <div className="dp-atalhos">
        {atalhos.map((a) => (
          <button key={a.label} onClick={() => navigate(a.rota)}
            className="dp-atalho" style={{ borderColor: a.cor, color: a.cor }}
            onMouseEnter={e => { e.currentTarget.style.background = a.cor; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = a.cor; }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Stats rápidos */}
      <div className="dp-stats">
        {[
          { label: "Sessões",     valor: concluidas,      cor: "#1a73e8" },
          { label: "Faltas",      valor: faltas,          cor: "#ea4335" },
          { label: "Recebido",    valor: moeda(totalPago),cor: "#34a853" },
          { label: "A receber",   valor: moeda(aReceber), cor: "#f9ab00" },
          ...(cfg?.tipoCobranca === "pacote_prepago"
            ? [{ label: "Saldo sessões", valor: cfg.saldoSessoes ?? 0, cor: "#9c27b0" }]
            : []),
        ].map(s => (
          <div key={s.label} className="dp-stat" style={{ borderTopColor: s.cor }}>
            <span className="dp-stat-valor" style={{ color: s.cor }}>{s.valor}</span>
            <span className="dp-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="dp-abas">
        {["dados","financeiro","historico"].map(a => (
          <button key={a} className={`dp-aba ${aba === a ? "ativa" : ""}`} onClick={() => setAba(a)}>
            {a === "dados" ? "Dados" : a === "financeiro" ? "💳 Financeiro" : "📅 Histórico"}
          </button>
        ))}
      </div>

      {/* ── Aba Dados ─────────────────────────────────────── */}
      {aba === "dados" && (
        <div className="dp-card">
          <h3 className="dp-card-titulo">Dados Cadastrais</h3>
          <div className="dp-grid2">
            <div><p className="dp-field-label">E-mail</p><p className="dp-field-val">{paciente.email || "—"}</p></div>
            <div><p className="dp-field-label">Telefone</p><p className="dp-field-val">{paciente.telefone || "—"}</p></div>
            <div>
              <p className="dp-field-label">Data de Nascimento</p>
              <p className="dp-field-val">{paciente.dataNascimento ? new Date(paciente.dataNascimento + "T00:00").toLocaleDateString("pt-BR") : "—"}</p>
            </div>
            <div>
              <p className="dp-field-label">Cadastrado em</p>
              <p className="dp-field-val">{new Date(paciente.dataCriacao?.toDate?.() || paciente.dataCriacao).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
          {paciente.observacoes && (
            <div className="dp-obs">
              <p className="dp-field-label">Observações</p>
              <p className="dp-field-val">{paciente.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Aba Financeiro ────────────────────────────────── */}
      {aba === "financeiro" && (
        <div className="dp-card">
          <div className="dp-card-head">
            <h3 className="dp-card-titulo">Configurações Financeiras</h3>
            {!editandoCfg && (
              <button className="dp-btn-edit" onClick={() => setEditandoCfg(true)}>✏️ Editar</button>
            )}
          </div>

          {!editandoCfg ? (
            <div className="dp-fin-view">
              <div className="dp-grid2">
                <div><p className="dp-field-label">Valor da sessão</p><p className="dp-field-val">{cfg?.valorSessao ? moeda(cfg.valorSessao) : "—"}</p></div>
                <div><p className="dp-field-label">Desconto</p><p className="dp-field-val">{cfg?.desconto ? `${cfg.desconto}%` : "—"}</p></div>
                <div><p className="dp-field-label">Método de pagamento</p><p className="dp-field-val">{cfg?.metodoPagamento || "—"}</p></div>
                <div><p className="dp-field-label">Tipo de cobrança</p><p className="dp-field-val">{cfg?.tipoCobranca === "pacote_prepago" ? "Pacote pré-pago" : "Por sessão"}</p></div>
              </div>
              {cfg?.observacoes && <div className="dp-obs"><p className="dp-field-label">Observações</p><p className="dp-field-val">{cfg.observacoes}</p></div>}

              {cfg?.tipoCobranca === "pacote_prepago" && (
                <div className="dp-pacote-box">
                  <div className="dp-pacote-saldo">
                    <span className="dp-pacote-num">{cfg.saldoSessoes ?? 0}</span>
                    <span className="dp-pacote-de">/ {cfg.totalSessoesPacote ?? 0} sessões restantes</span>
                  </div>
                  <div className="dp-pacote-add">
                    <input type="number" min={1} value={qntPacote} onChange={e => setQntPacote(e.target.value)}
                      className="dp-pacote-input" />
                    <button onClick={handleAdicionarPacote} disabled={adicionandoPacote} className="dp-btn-primary">
                      {adicionandoPacote ? "Adicionando..." : "+ Adicionar sessões"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dp-fin-form">
              <div className="dp-grid2">
                <div>
                  <label className="dp-field-label">Valor da sessão (R$)</label>
                  <input className="dp-input" type="number" step="0.01" value={cfgRascunho.valorSessao}
                    onChange={e => setCfgRascunho(c => ({ ...c, valorSessao: e.target.value }))} />
                </div>
                <div>
                  <label className="dp-field-label">Desconto (%)</label>
                  <input className="dp-input" type="number" min={0} max={100} value={cfgRascunho.desconto}
                    onChange={e => setCfgRascunho(c => ({ ...c, desconto: e.target.value }))} />
                </div>
                <div>
                  <label className="dp-field-label">Método de pagamento</label>
                  <select className="dp-input" value={cfgRascunho.metodoPagamento}
                    onChange={e => setCfgRascunho(c => ({ ...c, metodoPagamento: e.target.value }))}>
                    {METODOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="dp-field-label">Tipo de cobrança</label>
                  <select className="dp-input" value={cfgRascunho.tipoCobranca}
                    onChange={e => setCfgRascunho(c => ({ ...c, tipoCobranca: e.target.value }))}>
                    <option value="sessao">Por sessão</option>
                    <option value="pacote_prepago">Pacote pré-pago</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="dp-field-label">Observações financeiras</label>
                <textarea className="dp-input" rows={2} value={cfgRascunho.observacoes}
                  onChange={e => setCfgRascunho(c => ({ ...c, observacoes: e.target.value }))} />
              </div>
              <div className="dp-fin-acoes">
                <button onClick={handleSalvarCfg} disabled={salvandoCfg} className="dp-btn-primary">
                  {salvandoCfg ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => { setEditandoCfg(false); setCfgRascunho(cfg); }} className="dp-btn-sec">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Aba Histórico ─────────────────────────────────── */}
      {aba === "historico" && (
        <div className="dp-card">
          <h3 className="dp-card-titulo">Histórico de Agendamentos ({agendamentos.length})</h3>
          {agendamentos.length === 0 ? (
            <p className="dp-vazio">Nenhum agendamento ainda.</p>
          ) : (
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Data</th><th>Hora</th><th>Duração</th><th>Status</th><th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((ag) => {
                  const cor = STATUS_COR[ag.status] || STATUS_COR.confirmado;
                  return (
                    <tr key={ag.id}>
                      <td>{new Date(ag.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                      <td>{ag.hora}</td>
                      <td>{ag.duracao} min</td>
                      <td><span className="dp-badge" style={{ background: cor.bg, color: cor.text }}>{ag.status}</span></td>
                      <td>{ag.valor ? moeda(ag.valor) : "—"}{ag.pago ? " ✅" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
