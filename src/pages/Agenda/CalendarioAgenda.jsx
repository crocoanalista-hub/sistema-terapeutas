import React, { useState, useEffect, useRef } from "react";
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

// ─── constantes ───────────────────────────────────────────────
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 64; // px por hora
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CORES = {
  confirmado: { bg: "#e8f0fe", border: "#4285f4", text: "#1a73e8" },
  "concluído": { bg: "#e6f4ea", border: "#34a853", text: "#137333" },
  cancelado:   { bg: "#f1f3f4", border: "#9aa0a6", text: "#5f6368" },
  falta:       { bg: "#fef7e0", border: "#f9ab00", text: "#b06000" },
};

// ─── helpers ──────────────────────────────────────────────────
const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseLocal = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const horaParaPx = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
};

const agoraParaPx = () => {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  if (h < START_HOUR || h >= END_HOUR) return null;
  return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
};

const semanaInicio = (ref) => {
  const d = new Date(ref);
  const dia = d.getDay();
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d;
};

const diasDaSemana = (ref) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaInicio(ref));
    d.setDate(d.getDate() + i);
    return d;
  });

const diasDoMes = (ref) => {
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const offset = primeiro.getDay() === 0 ? 6 : primeiro.getDay() - 1;
  const inicio = new Date(primeiro);
  inicio.setDate(inicio.getDate() - offset);
  const dias = [];
  const cur = new Date(inicio);
  while (dias.length < 42) { dias.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return { dias, mes };
};

const whatsappLink = (tel, nome, data, hora) => {
  const t = tel.replace(/\D/g, "");
  const d = parseLocal(data).toLocaleDateString("pt-BR");
  const msg = encodeURIComponent(`Olá ${nome}! Sua sessão é dia ${d} às ${hora}. Confirme sua presença 😊`);
  return `https://wa.me/55${t}?text=${msg}`;
};

// ═════════════════════════════════════════════════════════════
const CalendarioAgenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [vista, setVista] = useState("semana");
  const [dataRef, setDataRef] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [mapaPac, setMapaPac] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [nowY, setNowY] = useState(agoraParaPx());

  const [eventoAtivo, setEventoAtivo] = useState(null);
  const [modalReagendar, setModalReagendar] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalConcluir, setModalConcluir] = useState(null);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obsConc, setObsConc] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Atualiza linha do agora a cada minuto
  useEffect(() => {
    const t = setInterval(() => setNowY(agoraParaPx()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  // Scroll para horário atual ao carregar
  useEffect(() => {
    if (!carregando && scrollRef.current && nowY !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 120);
    }
  }, [carregando]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [agends, pacs] = await Promise.all([
        listarAgendamentos(user.uid),
        listarPacientes(user.uid),
      ]);
      setAgendamentos(agends);
      const mapa = {};
      pacs.forEach((p) => { mapa[p.id] = { nome: p.nome, telefone: p.telefone || "" }; });
      setMapaPac(mapa);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  // Agrupado por data
  const porData = {};
  agendamentos.forEach((a) => {
    if (!porData[a.data]) porData[a.data] = [];
    porData[a.data].push(a);
  });

  // ─── ações ────────────────────────────────────────────────
  const fecharModais = () => {
    setModalReagendar(null);
    setModalCancelar(null);
    setModalConcluir(null);
  };

  const handleReagendar = async () => {
    if (!novaData || !novaHora) return;
    setSalvando(true);
    try {
      await reagendarSessao(modalReagendar.id, novaData, novaHora);
      fecharModais(); setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleCancelar = async () => {
    setSalvando(true);
    try {
      await cancelarSessao(modalCancelar.id, motivo);
      fecharModais(); setMotivo(""); setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleConcluir = async () => {
    setSalvando(true);
    try {
      await marcarComoConcluido(modalConcluir.id, obsConc);
      fecharModais(); setObsConc(""); setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleFalta = async (agend) => {
    if (!window.confirm("Marcar falta para esta sessão?")) return;
    try {
      await marcarFalta(agend.id);
      setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
  };

  // ─── label do período ─────────────────────────────────────
  const labelPeriodo = vista === "semana"
    ? (() => {
        const dias = diasDaSemana(dataRef);
        const ini = dias[0], fim = dias[6];
        if (ini.getMonth() === fim.getMonth()) {
          return `${ini.getDate()}–${fim.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
        }
        return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0,3)} – ${fim.getDate()} ${MESES[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
      })()
    : `${MESES[dataRef.getMonth()]} ${dataRef.getFullYear()}`;

  // ─── VISÃO SEMANA ─────────────────────────────────────────
  const renderSemana = () => {
    const dias = diasDaSemana(dataRef);
    const hoje = fmt(new Date());

    return (
      <div className="gc-semana-wrapper">
        {/* Cabeçalho dos dias */}
        <div className="gc-semana-header">
          <div className="gc-corner" />
          {dias.map((dia) => {
            const ds = fmt(dia);
            const isHoje = ds === hoje;
            const label = DIAS_LABEL[dia.getDay()];
            return (
              <div key={ds} className="gc-day-header-col">
                <span className="gc-day-header-nome">{label}</span>
                <span className={`gc-day-header-num${isHoje ? " hoje" : ""}`}>
                  {dia.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Corpo com scroll */}
        <div className="gc-semana-body" ref={scrollRef}>
          {/* Labels de hora */}
          <div className="gc-time-col">
            {HOURS.map((h) => (
              <div key={h} className="gc-time-label" style={{ height: HOUR_HEIGHT }}>
                <span>{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Grade + colunas dos dias */}
          <div className="gc-days-area" style={{ height: TOTAL_HEIGHT }}>
            {/* Linhas horizontais das horas */}
            {HOURS.map((_, i) => (
              <div key={i} className="gc-hline" style={{ top: i * HOUR_HEIGHT }} />
            ))}

            {/* Colunas dos dias */}
            {dias.map((dia) => {
              const ds = fmt(dia);
              const isHoje = ds === hoje;
              const events = (porData[ds] || []).sort((a, b) => a.hora.localeCompare(b.hora));

              return (
                <div
                  key={ds}
                  className={`gc-day-col${isHoje ? " hoje" : ""}`}
                  onClick={() => navigate(`/agenda/marcar?data=${ds}`)}
                >
                  {/* Linha do horário atual */}
                  {isHoje && nowY !== null && (
                    <div className="gc-now-line" style={{ top: nowY }}>
                      <div className="gc-now-dot" />
                    </div>
                  )}

                  {/* Eventos */}
                  {events.map((agend) => {
                    const top = horaParaPx(agend.hora);
                    const height = Math.max(((agend.duracao || 60) / 60) * HOUR_HEIGHT - 2, 20);
                    const cor = CORES[agend.status] || CORES.confirmado;
                    const pac = mapaPac[agend.pacienteId];
                    const curto = height < 38;

                    return (
                      <div
                        key={agend.id}
                        className="gc-event"
                        style={{ top, height, background: cor.bg, borderLeftColor: cor.border, color: cor.text }}
                        onClick={(e) => { e.stopPropagation(); setEventoAtivo(agend); }}
                      >
                        {curto ? (
                          <span className="gc-event-curto">{agend.hora} {pac?.nome}</span>
                        ) : (
                          <>
                            <span className="gc-event-nome">{pac?.nome || "Paciente"}</span>
                            <span className="gc-event-hora">{agend.hora} · {agend.duracao || 60}min</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── VISÃO MÊS ────────────────────────────────────────────
  const renderMes = () => {
    const { dias, mes } = diasDoMes(dataRef);
    const hoje = fmt(new Date());
    const DIAS_HEADER = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

    return (
      <div className="gc-mes-wrapper">
        <div className="gc-mes-dias-header">
          {DIAS_HEADER.map((d) => <div key={d} className="gc-mes-header-dia">{d}</div>)}
        </div>
        <div className="gc-mes-grid">
          {dias.map((dia) => {
            const ds = fmt(dia);
            const isMes = dia.getMonth() === mes;
            const isHoje = ds === hoje;
            const events = (porData[ds] || []).sort((a, b) => a.hora.localeCompare(b.hora));
            const visivel = events.slice(0, 3);
            const extra = events.length - 3;

            return (
              <div key={ds} className={`gc-mes-dia${!isMes ? " outro-mes" : ""}${isHoje ? " hoje" : ""}`}>
                <span className={`gc-mes-num${isHoje ? " hoje" : ""}`}>{dia.getDate()}</span>
                <div className="gc-mes-events">
                  {visivel.map((agend) => {
                    const cor = CORES[agend.status] || CORES.confirmado;
                    const pac = mapaPac[agend.pacienteId];
                    return (
                      <div
                        key={agend.id}
                        className="gc-mes-event"
                        style={{ background: cor.border }}
                        onClick={(e) => { e.stopPropagation(); setEventoAtivo(agend); }}
                      >
                        {agend.hora} {pac?.nome}
                      </div>
                    );
                  })}
                  {extra > 0 && <div className="gc-mes-mais">+{extra} mais</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── MODAL DO EVENTO ──────────────────────────────────────
  const renderModalEvento = () => {
    if (!eventoAtivo) return null;
    const a = eventoAtivo;
    const pac = mapaPac[a.pacienteId];
    const cor = CORES[a.status] || CORES.confirmado;
    const confirmado = a.status === "confirmado";
    const dataFmt = parseLocal(a.data).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });

    return (
      <div className="gc-overlay" onClick={() => setEventoAtivo(null)}>
        <div className="gc-ev-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-ev-modal-top" style={{ borderTopColor: cor.border }}>
            <div>
              <h3 className="gc-ev-nome">{pac?.nome || "Paciente"}</h3>
              <p className="gc-ev-data" style={{ textTransform: "capitalize" }}>{dataFmt}</p>
              <p className="gc-ev-hora">{a.hora} · {a.duracao || 60} minutos</p>
            </div>
            <button className="gc-ev-close" onClick={() => setEventoAtivo(null)}>✕</button>
          </div>

          <div className="gc-ev-modal-body">
            <span className="gc-status-badge" style={{ background: cor.bg, color: cor.text }}>
              {a.status}
            </span>
            {a.valor && <p className="gc-ev-info">💰 R$ {Number(a.valor).toFixed(2).replace(".", ",")}</p>}
            {a.linkAtendimento && (
              <a href={a.linkAtendimento} target="_blank" rel="noreferrer" className="gc-link-sessao">
                🔗 Entrar na sessão online
              </a>
            )}
            {a.observacoes && <p className="gc-ev-info">📝 {a.observacoes}</p>}
          </div>

          {confirmado && (
            <div className="gc-ev-actions">
              {pac?.telefone && (
                <a href={whatsappLink(pac.telefone, pac.nome, a.data, a.hora)}
                   target="_blank" rel="noreferrer" className="gc-act-btn whatsapp">
                  WhatsApp
                </a>
              )}
              <button className="gc-act-btn reagendar"
                onClick={() => { setModalReagendar(a); setNovaData(a.data); setNovaHora(a.hora); }}>
                Reagendar
              </button>
              <button className="gc-act-btn concluir" onClick={() => setModalConcluir(a)}>
                Concluir
              </button>
              <button className="gc-act-btn falta" onClick={() => handleFalta(a)}>
                Falta
              </button>
              <button className="gc-act-btn cancelar" onClick={() => setModalCancelar(a)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── MODAIS DE AÇÃO ───────────────────────────────────────
  const Modal = ({ titulo, onClose, children }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="gc-container">
      {/* Toolbar */}
      <div className="gc-toolbar">
        <div className="gc-toolbar-left">
          <button className="gc-btn-hoje" onClick={() => setDataRef(new Date())}>Hoje</button>
          <div className="gc-nav-group">
            <button className="gc-nav-btn" onClick={() => vista === "semana" ? setDataRef(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n; }) : setDataRef(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n; })}>‹</button>
            <button className="gc-nav-btn" onClick={() => vista === "semana" ? setDataRef(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n; }) : setDataRef(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n; })}>›</button>
          </div>
          <h2 className="gc-periodo">{labelPeriodo}</h2>
        </div>
        <div className="gc-toolbar-right">
          <div className="gc-toggle">
            <button className={`gc-toggle-btn${vista === "semana" ? " ativo" : ""}`} onClick={() => setVista("semana")}>Semana</button>
            <button className={`gc-toggle-btn${vista === "mes" ? " ativo" : ""}`} onClick={() => setVista("mes")}>Mês</button>
          </div>
          <button className="gc-btn-espera" onClick={() => navigate("/agenda/lista-espera")}>Lista de Espera</button>
          <button className="gc-btn-novo" onClick={() => navigate("/agenda/marcar")}>+ Nova Sessão</button>
        </div>
      </div>

      {/* Corpo */}
      {carregando
        ? <div className="gc-loading">Carregando agenda...</div>
        : vista === "semana" ? renderSemana() : renderMes()
      }

      {/* Modal evento */}
      {renderModalEvento()}

      {/* Modal Reagendar */}
      {modalReagendar && (
        <Modal titulo="Reagendar Sessão" onClose={() => setModalReagendar(null)}>
          <p style={{ color:"#666", fontSize:"14px", marginBottom:"16px" }}>
            Paciente: <strong>{mapaPac[modalReagendar.pacienteId]?.nome}</strong>
          </p>
          <div className="form-group"><label>Nova Data</label>
            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} /></div>
          <div className="form-group"><label>Novo Horário</label>
            <input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} /></div>
          <div className="modal-buttons">
            <button className="btn-modal-cancelar" onClick={() => setModalReagendar(null)}>Cancelar</button>
            <button className="btn-modal-confirmar" onClick={handleReagendar} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Cancelar */}
      {modalCancelar && (
        <Modal titulo="Cancelar Sessão" onClose={() => setModalCancelar(null)}>
          <p style={{ color:"#666", fontSize:"14px", marginBottom:"16px" }}>
            Paciente: <strong>{mapaPac[modalCancelar.pacienteId]?.nome}</strong><br />
            <strong>{modalCancelar.data} às {modalCancelar.hora}</strong>
          </p>
          <div className="form-group"><label>Motivo (opcional)</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do cancelamento..." /></div>
          <div className="modal-buttons">
            <button className="btn-modal-cancelar" onClick={() => setModalCancelar(null)}>Voltar</button>
            <button className="btn-modal-deletar" onClick={handleCancelar} disabled={salvando}>
              {salvando ? "Cancelando..." : "Confirmar Cancelamento"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Concluir */}
      {modalConcluir && (
        <Modal titulo="Concluir Sessão" onClose={() => setModalConcluir(null)}>
          <p style={{ color:"#666", fontSize:"14px", marginBottom:"16px" }}>
            Paciente: <strong>{mapaPac[modalConcluir.pacienteId]?.nome}</strong>
          </p>
          <div className="form-group"><label>Observações da sessão (opcional)</label>
            <textarea rows="3" value={obsConc} onChange={(e) => setObsConc(e.target.value)} placeholder="Anotações sobre a sessão..." /></div>
          <div className="modal-buttons">
            <button className="btn-modal-cancelar" onClick={() => setModalConcluir(null)}>Cancelar</button>
            <button className="btn-modal-confirmar" onClick={handleConcluir} disabled={salvando}>
              {salvando ? "Salvando..." : "Marcar como Concluída"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarioAgenda;
