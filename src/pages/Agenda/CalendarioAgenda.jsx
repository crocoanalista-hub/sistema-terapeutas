import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarAgendamentos,
  reagendarSessao,
  cancelarSessao,
  marcarComoConcluido,
  marcarFalta,
} from "../../services/agendamentosService";
import { listarPacientes } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/agenda.css";

const STATUS_COR = {
  confirmado: { bg: "#d4edda", text: "#155724" },
  "concluído": { bg: "#cfe2ff", text: "#084298" },
  cancelado: { bg: "#f8d7da", text: "#721c24" },
  falta: { bg: "#fff3cd", text: "#856404" },
};

const DIAS_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getInicioSemana = (data) => {
  const d = new Date(data);
  const dia = d.getDay();
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d;
};

const getDiasSemana = (ref) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(getInicioSemana(ref));
    d.setDate(d.getDate() + i);
    return d;
  });

const getDiasMes = (ref) => {
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const offset = primeiroDia.getDay() === 0 ? 6 : primeiroDia.getDay() - 1;
  const inicio = new Date(primeiroDia);
  inicio.setDate(inicio.getDate() - offset);
  const dias = [];
  const cur = new Date(inicio);
  while (dias.length < 42) {
    dias.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return { dias, mes, ano };
};

const gerarLinkWhatsApp = (telefone, nome, data, hora) => {
  const tel = telefone.replace(/\D/g, "");
  const dataFormatada = parseLocalDate(data).toLocaleDateString("pt-BR");
  const msg = encodeURIComponent(
    `Olá ${nome}! Lembrando sua sessão no dia ${dataFormatada} às ${hora}. Por favor, confirme sua presença. 😊`
  );
  return `https://wa.me/55${tel}?text=${msg}`;
};

const CalendarioAgenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vista, setVista] = useState("semana");
  const [dataRef, setDataRef] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [mapaPacientes, setMapaPacientes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [diaSel, setDiaSel] = useState(null);

  const [modalReagendar, setModalReagendar] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalConcluir, setModalConcluir] = useState(null);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obsConclusao, setObsConclusao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (user) carregarDados();
  }, [user]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [agends, pacs] = await Promise.all([
        listarAgendamentos(user.uid),
        listarPacientes(user.uid),
      ]);
      setAgendamentos(agends);
      const mapa = {};
      pacs.forEach((p) => { mapa[p.id] = { nome: p.nome, telefone: p.telefone || "" }; });
      setMapaPacientes(mapa);
    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setCarregando(false);
    }
  };

  const navSemana = (dir) => {
    const d = new Date(dataRef);
    d.setDate(d.getDate() + dir * 7);
    setDataRef(d);
  };

  const navMes = (dir) => {
    const d = new Date(dataRef);
    d.setMonth(d.getMonth() + dir);
    setDataRef(d);
  };

  const agendsByDate = {};
  agendamentos.forEach((a) => {
    if (!agendsByDate[a.data]) agendsByDate[a.data] = [];
    agendsByDate[a.data].push(a);
  });

  // --- Ações ---
  const handleReagendar = async () => {
    if (!novaData || !novaHora) return;
    setSalvando(true);
    try {
      await reagendarSessao(modalReagendar.id, novaData, novaHora);
      setModalReagendar(null);
      await carregarDados();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleCancelar = async () => {
    setSalvando(true);
    try {
      await cancelarSessao(modalCancelar.id, motivo);
      setModalCancelar(null);
      setMotivo("");
      await carregarDados();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleConcluir = async () => {
    setSalvando(true);
    try {
      await marcarComoConcluido(modalConcluir.id, obsConclusao);
      setModalConcluir(null);
      setObsConclusao("");
      await carregarDados();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleFalta = async (agend) => {
    if (!window.confirm("Marcar falta para esta sessão?")) return;
    try {
      await marcarFalta(agend.id);
      await carregarDados();
    } catch (err) { alert(err.message); }
  };

  // --- Render do card ---
  const renderCard = (agend) => {
    const cor = STATUS_COR[agend.status] || STATUS_COR.confirmado;
    const pac = mapaPacientes[agend.pacienteId] || { nome: "Paciente", telefone: "" };
    const podeAcionar = agend.status === "confirmado";

    return (
      <div key={agend.id} className="agenda-card">
        <div className="agenda-card-header">
          <span className="agenda-card-hora">{agend.hora}</span>
          <span className="agenda-card-status" style={{ backgroundColor: cor.bg, color: cor.text }}>
            {agend.status}
          </span>
        </div>

        <p className="agenda-card-paciente">{pac.nome}</p>

        {agend.duracao && <p className="agenda-card-duracao">{agend.duracao} min</p>}

        {agend.linkAtendimento && (
          <a
            href={agend.linkAtendimento}
            target="_blank"
            rel="noreferrer"
            className="agenda-card-link"
          >
            🔗 Entrar na sessão online
          </a>
        )}

        {agend.observacoes && (
          <p className="agenda-card-obs">{agend.observacoes}</p>
        )}

        {podeAcionar && (
          <div className="agenda-card-acoes">
            {pac.telefone && (
              <a
                href={gerarLinkWhatsApp(pac.telefone, pac.nome, agend.data, agend.hora)}
                target="_blank"
                rel="noreferrer"
                className="btn-ag btn-whatsapp"
                title="Confirmar via WhatsApp"
              >
                WhatsApp
              </a>
            )}
            <button
              className="btn-ag btn-reagendar"
              onClick={() => { setModalReagendar(agend); setNovaData(agend.data); setNovaHora(agend.hora); }}
            >
              Reagendar
            </button>
            <button className="btn-ag btn-concluir" onClick={() => setModalConcluir(agend)}>
              Concluir
            </button>
            <button className="btn-ag btn-falta" onClick={() => handleFalta(agend)}>
              Falta
            </button>
            <button className="btn-ag btn-cancelar-ag" onClick={() => setModalCancelar(agend)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Semana ---
  const renderSemana = () => {
    const dias = getDiasSemana(dataRef);
    const hoje = formatDate(new Date());
    return (
      <div className="agenda-semana">
        {dias.map((dia, i) => {
          const dataStr = formatDate(dia);
          const agends = (agendsByDate[dataStr] || []).sort((a, b) => a.hora.localeCompare(b.hora));
          const isHoje = dataStr === hoje;
          return (
            <div key={dataStr} className={`semana-dia ${isHoje ? "hoje" : ""}`}>
              <div className="semana-dia-header">
                <span className="semana-dia-nome">{DIAS_CURTO[i]}</span>
                <span className={`semana-dia-num ${isHoje ? "hoje" : ""}`}>{dia.getDate()}</span>
              </div>
              <div className="semana-dia-agends">
                {agends.length === 0 ? <p className="semana-vazio">–</p> : agends.map(renderCard)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Mês ---
  const renderMes = () => {
    const { dias, mes } = getDiasMes(dataRef);
    const hoje = formatDate(new Date());
    const agendsDiaSel = diaSel
      ? (agendsByDate[diaSel] || []).sort((a, b) => a.hora.localeCompare(b.hora))
      : [];

    return (
      <>
        <div className="agenda-mes-grid">
          {DIAS_CURTO.map((d) => <div key={d} className="mes-header-dia">{d}</div>)}
          {dias.map((dia) => {
            const dataStr = formatDate(dia);
            const isMesAtual = dia.getMonth() === mes;
            const isHoje = dataStr === hoje;
            const isSelecionado = dataStr === diaSel;
            const agends = agendsByDate[dataStr] || [];
            return (
              <div
                key={dataStr}
                className={`mes-dia ${!isMesAtual ? "outro-mes" : ""} ${isHoje ? "hoje" : ""} ${isSelecionado ? "selecionado" : ""}`}
                onClick={() => setDiaSel(dataStr === diaSel ? null : dataStr)}
              >
                <span className="mes-dia-num">{dia.getDate()}</span>
                {agends.length > 0 && <span className="mes-badge">{agends.length}</span>}
              </div>
            );
          })}
        </div>
        {diaSel && (
          <div className="mes-detalhe">
            <h4>
              {parseLocalDate(diaSel).toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </h4>
            {agendsDiaSel.length === 0
              ? <p className="semana-vazio">Nenhuma sessão neste dia.</p>
              : agendsDiaSel.map(renderCard)}
          </div>
        )}
      </>
    );
  };

  const labelPeriodo =
    vista === "semana"
      ? (() => {
          const dias = getDiasSemana(dataRef);
          const ini = dias[0];
          const fim = dias[6];
          return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} – ${fim.getDate()} ${MESES[fim.getMonth()].slice(0, 3)} ${fim.getFullYear()}`;
        })()
      : `${MESES[dataRef.getMonth()]} ${dataRef.getFullYear()}`;

  return (
    <div className="agenda-container">
      <div className="agenda-header">
        <h2>Agenda</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-lista-espera" onClick={() => navigate("/agenda/lista-espera")}>
            Lista de Espera
          </button>
          <button className="btn-nova-sessao" onClick={() => navigate("/agenda/marcar")}>
            + Nova Sessão
          </button>
        </div>
      </div>

      <div className="agenda-toolbar">
        <div className="agenda-vista-toggle">
          <button className={`btn-vista ${vista === "semana" ? "ativo" : ""}`} onClick={() => setVista("semana")}>
            Semana
          </button>
          <button className={`btn-vista ${vista === "mes" ? "ativo" : ""}`} onClick={() => setVista("mes")}>
            Mês
          </button>
        </div>

        <div className="agenda-nav">
          <button className="btn-nav" onClick={() => vista === "semana" ? navSemana(-1) : navMes(-1)}>‹</button>
          <span className="agenda-periodo">{labelPeriodo}</span>
          <button className="btn-nav" onClick={() => vista === "semana" ? navSemana(1) : navMes(1)}>›</button>
        </div>

        <button className="btn-hoje" onClick={() => setDataRef(new Date())}>Hoje</button>
      </div>

      {carregando ? (
        <p className="carregando-agenda">Carregando agendamentos...</p>
      ) : vista === "semana" ? renderSemana() : renderMes()}

      {/* Modal Reagendar */}
      {modalReagendar && (
        <div className="modal-overlay" onClick={() => setModalReagendar(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Reagendar Sessão</h3>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
              Paciente: <strong>{mapaPacientes[modalReagendar.pacienteId]?.nome}</strong>
            </p>
            <div className="form-group">
              <label>Nova Data</label>
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Novo Horário</label>
              <input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
            </div>
            <div className="modal-buttons">
              <button className="btn-modal-cancelar" onClick={() => setModalReagendar(null)}>Cancelar</button>
              <button className="btn-modal-confirmar" onClick={handleReagendar} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar */}
      {modalCancelar && (
        <div className="modal-overlay" onClick={() => setModalCancelar(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Cancelar Sessão</h3>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
              Paciente: <strong>{mapaPacientes[modalCancelar.pacienteId]?.nome}</strong><br />
              Data: <strong>{modalCancelar.data} às {modalCancelar.hora}</strong>
            </p>
            <div className="form-group">
              <label>Motivo (opcional)</label>
              <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo do cancelamento..." />
            </div>
            <div className="modal-buttons">
              <button className="btn-modal-cancelar" onClick={() => setModalCancelar(null)}>Voltar</button>
              <button className="btn-modal-deletar" onClick={handleCancelar} disabled={salvando}>
                {salvando ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Concluir */}
      {modalConcluir && (
        <div className="modal-overlay" onClick={() => setModalConcluir(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Concluir Sessão</h3>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
              Paciente: <strong>{mapaPacientes[modalConcluir.pacienteId]?.nome}</strong>
            </p>
            <div className="form-group">
              <label>Observações da sessão (opcional)</label>
              <textarea rows="3" value={obsConclusao} onChange={(e) => setObsConclusao(e.target.value)}
                placeholder="Anotações sobre a sessão..." />
            </div>
            <div className="modal-buttons">
              <button className="btn-modal-cancelar" onClick={() => setModalConcluir(null)}>Cancelar</button>
              <button className="btn-modal-confirmar" onClick={handleConcluir} disabled={salvando}>
                {salvando ? "Salvando..." : "Marcar como Concluída"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioAgenda;
