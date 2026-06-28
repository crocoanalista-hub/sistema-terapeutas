import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { buscarWorkspacePorSlug } from "../../services/slugService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import { criarSolicitacao } from "../../services/solicitacoesService";
import "../../styles/agendamento-publico.css";

const HORAS = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00",
];

const hoje = () => new Date().toISOString().slice(0, 10);

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [config, setConfig] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    dataPreferida: "",
    horaPreferida: "",
    mensagem: "",
  });

  useEffect(() => {
    buscarWorkspacePorSlug(slug)
      .then(async (ws) => {
        if (!ws) { setNaoEncontrado(true); return; }
        setWorkspace(ws);
        const cfg = await buscarConfiguracoes(ws.id).catch(() => ({}));
        setConfig(cfg);
        const r = document.documentElement;
        r.style.setProperty("--cor-primaria", cfg.corPrimaria || "#1a73e8");
        r.style.setProperty("--cor-sidebar", cfg.corSidebar || "#1a2535");
      })
      .finally(() => setCarregando(false));
  }, [slug]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim() || !form.telefone.trim() || !form.dataPreferida || !form.horaPreferida) {
      setErro("Preencha nome, telefone, data e horário.");
      return;
    }
    setEnviando(true);
    try {
      await criarSolicitacao(workspace.id, form);
      setEnviado(true);
    } catch {
      setErro("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <div className="ap-loading">Carregando...</div>;
  if (naoEncontrado) return (
    <div className="ap-not-found">
      <h2>Consultório não encontrado</h2>
      <p>O link <strong>/{slug}</strong> não corresponde a nenhum consultório.</p>
    </div>
  );

  const corPrimaria = config.corPrimaria || "#1a73e8";
  const corSidebar  = config.corSidebar  || "#1a2535";
  const nomeClinica = config.nomeClinica  || workspace?.nome || "Consultório";

  if (enviado) return (
    <div className="ap-page">
      <div className="ap-header" style={{ background: corSidebar }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt="Logo" className="ap-logo-img" />
          : <div className="ap-logo-emoji">🧠</div>}
        <h1 className="ap-clinica">{nomeClinica}</h1>
      </div>
      <div className="ap-body">
        <div className="ap-sucesso">
          <div className="ap-sucesso-icon">✅</div>
          <h2>Solicitação enviada!</h2>
          <p>Recebemos seu pedido de agendamento. Em breve entraremos em contato para confirmar.</p>
          <p className="ap-sucesso-detalhe">
            <strong>Data preferida:</strong> {new Date(form.dataPreferida + "T12:00").toLocaleDateString("pt-BR")} às {form.horaPreferida}
          </p>
          <button className="ap-btn-novo" style={{ background: corPrimaria }} onClick={() => { setEnviado(false); setForm({ nome:"",telefone:"",email:"",dataPreferida:"",horaPreferida:"",mensagem:"" }); }}>
            Nova solicitação
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ap-page">
      {/* Header colorido */}
      <div className="ap-header" style={{ background: corSidebar }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt="Logo" className="ap-logo-img" />
          : <div className="ap-logo-emoji">🧠</div>}
        <div className="ap-header-text">
          <h1 className="ap-clinica">{nomeClinica}</h1>
          <p className="ap-header-sub">Solicite um agendamento</p>
        </div>
      </div>

      <div className="ap-body">
        <div className="ap-card">
          <h2 className="ap-titulo">Agende sua consulta</h2>
          <p className="ap-desc">Preencha o formulário e entraremos em contato para confirmar o horário.</p>

          {erro && <div className="ap-erro">{erro}</div>}

          <form onSubmit={handleSubmit} className="ap-form">
            <div className="ap-row">
              <div className="ap-field">
                <label>Nome completo *</label>
                <input placeholder="Seu nome" value={form.nome} onChange={e => set("nome", e.target.value)} required />
              </div>
              <div className="ap-field">
                <label>Telefone / WhatsApp *</label>
                <input placeholder="(11) 99999-9999" value={form.telefone} onChange={e => set("telefone", e.target.value)} required />
              </div>
            </div>

            <div className="ap-field">
              <label>E-mail <span className="ap-opcional">(opcional)</span></label>
              <input type="email" placeholder="seu@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>

            <div className="ap-row">
              <div className="ap-field">
                <label>Data preferida *</label>
                <input type="date" min={hoje()} value={form.dataPreferida} onChange={e => set("dataPreferida", e.target.value)} required />
              </div>
              <div className="ap-field">
                <label>Horário preferido *</label>
                <select value={form.horaPreferida} onChange={e => set("horaPreferida", e.target.value)} required>
                  <option value="">Selecione</option>
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="ap-field">
              <label>Mensagem <span className="ap-opcional">(opcional)</span></label>
              <textarea
                placeholder="Conte um pouco sobre o que está buscando, ou alguma preferência…"
                rows={3}
                value={form.mensagem}
                onChange={e => set("mensagem", e.target.value)}
              />
            </div>

            {/* Seletor visual de horário */}
            <div className="ap-horas-grid">
              <p className="ap-horas-label">Ou selecione clicando:</p>
              <div className="ap-horas">
                {HORAS.map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`ap-hora-btn ${form.horaPreferida === h ? "ativa" : ""}`}
                    style={form.horaPreferida === h ? { background: corPrimaria, borderColor: corPrimaria } : {}}
                    onClick={() => set("horaPreferida", h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={enviando} className="ap-submit" style={{ background: corPrimaria }}>
              {enviando ? "Enviando..." : "Solicitar agendamento"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
