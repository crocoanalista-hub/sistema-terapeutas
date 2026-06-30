import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { buscarWorkspacePorSlug } from "../../services/slugService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import { criarSolicitacao } from "../../services/solicitacoesService";
import { listarAgendamentos } from "../../services/agendamentosService";
import "../../styles/agendamento-publico.css";

const HORAS_PADRAO = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00",
];

const hoje = () => new Date().toISOString().slice(0, 10);

const gerarHorasIntervalo = (inicio, fim, intervaloMin) => {
  const horas = [];
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fim.split(":").map(Number);
  let total = hI * 60 + mI;
  const totalFim = hF * 60 + mF;
  while (total < totalFim) {
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    horas.push(`${h}:${m}`);
    total += intervaloMin;
  }
  return horas;
};

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [config, setConfig] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);

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
        const [cfg, agends] = await Promise.all([
          buscarConfiguracoes(ws.id).catch(() => ({})),
          listarAgendamentos(ws.id).catch(() => []),
        ]);
        setConfig(cfg);
        setAgendamentosExistentes(agends.filter(a => a.status !== "cancelado"));
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
    if (form.dataPreferida < hoje()) {
      setErro("A data selecionada já passou. Escolha uma data futura.");
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

  // Calcula horas disponíveis para a data selecionada (deve ficar antes dos early returns)
  const horasDisponiveis = useMemo(() => {
    if (!form.dataPreferida) return HORAS_PADRAO;
    const horariosFuncionamento = config.horariosFuncionamento;
    const intervaloAgenda = config.intervaloAgenda || 60;

    let horas;
    if (horariosFuncionamento) {
      const diaSemana = new Date(form.dataPreferida + "T12:00").getDay();
      const diaConfig = horariosFuncionamento[diaSemana];
      if (!diaConfig || !diaConfig.ativo) return []; // dia fechado
      horas = gerarHorasIntervalo(diaConfig.inicio, diaConfig.fim, intervaloAgenda);
    } else {
      horas = HORAS_PADRAO;
    }

    // Remove horários já ocupados (todas as salas)
    const ocupados = new Set(
      agendamentosExistentes
        .filter(a => a.data === form.dataPreferida)
        .map(a => a.hora)
    );

    // Considera "ocupado" apenas se TODAS as salas estiverem tomadas
    // Para agendamento público (sem sala), bloqueia se há qualquer agendamento naquele horário
    return horas.map(h => ({ hora: h, ocupado: ocupados.has(h) }));
  }, [form.dataPreferida, config, agendamentosExistentes]);

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
          <p className="ap-desc">Preencha o formulário e entraremos em contato para confirmar seu horário.</p>

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

            <div className="ap-field">
              <label>Data preferida *</label>
              <input
                type="date"
                min={hoje()}
                value={form.dataPreferida}
                onChange={e => { set("dataPreferida", e.target.value); set("horaPreferida", ""); }}
                required
              />
            </div>

            {form.dataPreferida && (
              horasDisponiveis.length === 0 ? (
                <div className="ap-dia-fechado">
                  ❌ Este dia não tem horários disponíveis. Escolha outra data.
                </div>
              ) : (
                <div className="ap-field">
                  <label>Horário preferido *</label>
                  <div className="ap-horas">
                    {horasDisponiveis.map(({ hora, ocupado }) => (
                      <button
                        key={hora}
                        type="button"
                        disabled={ocupado}
                        className={`ap-hora-btn${form.horaPreferida === hora ? " ativa" : ""}${ocupado ? " ocupado" : ""}`}
                        style={form.horaPreferida === hora ? { background: corPrimaria, borderColor: corPrimaria } : {}}
                        onClick={() => !ocupado && set("horaPreferida", hora)}
                        title={ocupado ? "Horário indisponível" : hora}
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                  {form.horaPreferida && (
                    <p className="ap-hora-selecionada">✅ Horário selecionado: <strong>{form.horaPreferida}</strong></p>
                  )}
                </div>
              )
            )}

            <div className="ap-field">
              <label>Mensagem <span className="ap-opcional">(opcional)</span></label>
              <textarea
                placeholder="Conte um pouco sobre o que está buscando, ou alguma preferência…"
                rows={3}
                value={form.mensagem}
                onChange={e => set("mensagem", e.target.value)}
              />
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
