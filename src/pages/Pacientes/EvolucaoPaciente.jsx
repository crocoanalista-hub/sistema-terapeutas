import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listarEvolucoes,
  adicionarEvolucao,
  atualizarEvolucao,
  deletarEvolucao,
} from "../../services/evolucaoService";
import { buscarPaciente } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";
import "../../styles/prontuario.css";

/* ------------------------------------------------------------------ */
/*  Constantes                                                          */
/* ------------------------------------------------------------------ */

const HUMOR_OPCOES = [
  { nivel: 1, emoji: "😔", label: "Muito triste" },
  { nivel: 2, emoji: "😟", label: "Triste" },
  { nivel: 3, emoji: "😐", label: "Neutro" },
  { nivel: 4, emoji: "🙂", label: "Bem" },
  { nivel: 5, emoji: "😊", label: "Muito bem" },
];

const TIPO_OPCOES = ["Individual", "Casal", "Grupo", "Online"];

const DADOS_INICIAIS = {
  data: new Date().toISOString().slice(0, 10),
  tipo: "Individual",
  humor: null,
  queixa: "",
  conteudo: "",
  intervencao: "",
  plano: "",
};

/* ------------------------------------------------------------------ */
/*  Sub-componente: Seção dobrável                                      */
/* ------------------------------------------------------------------ */

const Secao = ({ titulo, icone, conteudo }) => {
  const [aberta, setAberta] = useState(false);

  if (!conteudo || !conteudo.trim()) return null;

  return (
    <div className="prontuario-section">
      <button
        className="prontuario-section-toggle"
        onClick={() => setAberta((v) => !v)}
        type="button"
      >
        <span>{icone}</span>
        <span>{titulo}</span>
        <span className={`prontuario-section-chevron ${aberta ? "aberto" : ""}`}>▼</span>
      </button>
      {aberta && (
        <div className="prontuario-section-body">{conteudo}</div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-componente: Card de evolução                                    */
/* ------------------------------------------------------------------ */

const EvolucaoCard = ({ evol, onEditar, onDeletar }) => {
  const dataFormatada = new Date(evol.data + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const humorOpcao = evol.humor
    ? HUMOR_OPCOES.find((h) => h.nivel === evol.humor)
    : null;

  // Registro legado: só tem conteudo, sem campos estruturados
  const ehLegado =
    !evol.queixa && !evol.intervencao && !evol.plano && !evol.tipo && !evol.humor;

  return (
    <div className="prontuario-card">
      <div className="prontuario-card-header">
        <div className="prontuario-card-meta">
          <span className="prontuario-card-data">📅 {dataFormatada}</span>
          {evol.tipo && (
            <span className="prontuario-card-tipo">{evol.tipo}</span>
          )}
          {humorOpcao && (
            <span
              className="prontuario-card-humor"
              title={humorOpcao.label}
            >
              {humorOpcao.emoji}
            </span>
          )}
        </div>
        <div className="prontuario-card-actions">
          <button className="btn-editar-card" onClick={() => onEditar(evol)}>
            Editar
          </button>
          <button className="btn-deletar-card" onClick={() => onDeletar(evol)}>
            Excluir
          </button>
        </div>
      </div>

      {ehLegado ? (
        /* Registro antigo — exibe conteudo direto */
        <div className="prontuario-conteudo-simples">{evol.conteudo}</div>
      ) : (
        <div className="prontuario-sections">
          <Secao titulo="Queixa / Motivo da sessão" icone="💬" conteudo={evol.queixa} />
          <Secao titulo="Evolução / Observações clínicas" icone="📝" conteudo={evol.conteudo} />
          <Secao titulo="Intervenções realizadas" icone="🛠" conteudo={evol.intervencao} />
          <Secao titulo="Plano para próxima sessão" icone="🎯" conteudo={evol.plano} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Componente principal                                                */
/* ------------------------------------------------------------------ */

const EvolucaoPaciente = () => {
  const { user, workspaceId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente]     = useState(null);
  const [evolucoes, setEvolucoes]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando]     = useState(null);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [dados, setDados]           = useState({ ...DADOS_INICIAIS });

  useEffect(() => {
    if (workspaceId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, workspaceId]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [pac, evols] = await Promise.all([
        buscarPaciente(id),
        listarEvolucoes(workspaceId, id),
      ]);
      setPaciente(pac);
      setEvolucoes(evols);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const resetForm = () => {
    setDados({ ...DADOS_INICIAIS, data: new Date().toISOString().slice(0, 10) });
    setEditando(null);
    setErro("");
  };

  const abrirNovaEvolucao = () => {
    resetForm();
    setMostrarForm(true);
  };

  const handleEditar = (evol) => {
    setEditando(evol);
    setDados({
      data:        evol.data        || new Date().toISOString().slice(0, 10),
      tipo:        evol.tipo        || "Individual",
      humor:       evol.humor       || null,
      queixa:      evol.queixa      || "",
      conteudo:    evol.conteudo    || "",
      intervencao: evol.intervencao || "",
      plano:       evol.plano       || "",
    });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeletar = async (evol) => {
    if (!window.confirm("Excluir esta evolução? Esta ação não pode ser desfeita.")) return;
    try {
      await deletarEvolucao(evol.id);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!dados.conteudo.trim() && !dados.queixa.trim()) {
      setErro("Preencha pelo menos o campo de Evolução ou Queixa.");
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await atualizarEvolucao(editando.id, dados);
      } else {
        await adicionarEvolucao(workspaceId, id, dados);
      }
      resetForm();
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = () => {
    setMostrarForm(false);
    resetForm();
  };

  const set = (campo) => (e) =>
    setDados((prev) => ({ ...prev, [campo]: e.target.value }));

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div className="prontuario-header">
        <button className="btn-voltar" onClick={() => navigate(`/pacientes/${id}`)}>
          ←
        </button>
        <div className="prontuario-header-info">
          <h2>
            Prontuário
            {evolucoes.length > 0 && (
              <span className="prontuario-sessoes-badge">
                {evolucoes.length} {evolucoes.length === 1 ? "sessão" : "sessões"}
              </span>
            )}
          </h2>
          {paciente && <p>{paciente.nome}</p>}
        </div>
        <button className="btn-nova-evolucao" onClick={abrirNovaEvolucao}>
          + Nova Evolução
        </button>
      </div>

      {erro && (
        <div className="erro-message" style={{ marginTop: "12px" }}>{erro}</div>
      )}

      {/* Formulário */}
      {mostrarForm && (
        <div className="prontuario-form-box">
          <h3>{editando ? "Editar Evolução" : "Nova Evolução"}</h3>
          <form onSubmit={handleSalvar}>

            {/* Linha 1: Data + Tipo */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Data da sessão <span className="obrigatorio">*</span></label>
                <input
                  type="date"
                  value={dados.data}
                  onChange={set("data")}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo de atendimento</label>
                <select value={dados.tipo} onChange={set("tipo")}>
                  {TIPO_OPCOES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Humor */}
            <div className="form-group">
              <label className="humor-label">Humor do paciente</label>
              <div className="humor-scale">
                {HUMOR_OPCOES.map((h) => (
                  <button
                    key={h.nivel}
                    type="button"
                    data-nivel={h.nivel}
                    className={`humor-btn ${dados.humor === h.nivel ? "ativo" : ""}`}
                    title={h.label}
                    onClick={() =>
                      setDados((prev) => ({
                        ...prev,
                        humor: prev.humor === h.nivel ? null : h.nivel,
                      }))
                    }
                  >
                    {h.emoji}
                    <span className="humor-num">{h.nivel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Queixa */}
            <div className="form-group">
              <label>Queixa / Motivo da sessão</label>
              <textarea
                rows="3"
                value={dados.queixa}
                onChange={set("queixa")}
                placeholder="Descreva o motivo principal relatado pelo paciente..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Evolução */}
            <div className="form-group">
              <label>
                Evolução / Observações clínicas <span className="obrigatorio">*</span>
              </label>
              <textarea
                rows="7"
                value={dados.conteudo}
                onChange={set("conteudo")}
                placeholder="Temas trabalhados, dinâmica da sessão, observações clínicas relevantes..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Intervenção */}
            <div className="form-group">
              <label>Intervenções realizadas</label>
              <textarea
                rows="3"
                value={dados.intervencao}
                onChange={set("intervencao")}
                placeholder="Técnicas e intervenções aplicadas durante a sessão..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Plano */}
            <div className="form-group">
              <label>Plano para próxima sessão</label>
              <textarea
                rows="3"
                value={dados.plano}
                onChange={set("plano")}
                placeholder="Objetivos, tarefas ou temas a abordar na próxima sessão..."
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="form-buttons">
              <button type="button" className="btn-cancelar" onClick={cancelar}>
                Cancelar
              </button>
              <button type="submit" className="btn-salvar" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : editando
                  ? "Salvar Alterações"
                  : "Salvar Evolução"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      {carregando ? (
        <p style={{ color: "#999", marginTop: "20px" }}>Carregando...</p>
      ) : evolucoes.length === 0 ? (
        <div className="prontuario-vazio">
          <div style={{ fontSize: "40px" }}>📋</div>
          <p>Nenhuma evolução registrada ainda.<br />Clique em "Nova Evolução" para começar.</p>
        </div>
      ) : (
        <div className="prontuario-timeline">
          {evolucoes.map((evol) => (
            <EvolucaoCard
              key={evol.id}
              evol={evol}
              onEditar={handleEditar}
              onDeletar={handleDeletar}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EvolucaoPaciente;
