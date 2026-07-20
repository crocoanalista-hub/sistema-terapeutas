import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarAgendamentos,
  reagendarSessao,
  cancelarSessao,
  marcarComoConcluido,
  marcarFalta,
  marcarComoPago,
  editarSessaoConcluida,
  cancelarRecorrencia,
} from "../../services/agendamentosService";
import { listarPacientes, adicionarPaciente } from "../../services/pacientesService";
import { listarSalas } from "../../services/salasService";
import { listarProfissionais } from "../../services/profissionaisService";
import { listarSolicitacoes, atualizarStatusSolicitacao } from "../../services/solicitacoesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/agenda.css";

// ─── constantes ───────────────────────────────────────────────
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CORES_STATUS = {
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

// Converte px (relativo ao topo da grade) em "HH:MM" arredondado a 15min
const pxParaHora = (py) => {
  const minutosTotal = (py / HOUR_HEIGHT) * 60;
  const arredondado = Math.round(minutosTotal / 15) * 15;
  const h = Math.floor(arredondado / 60) + START_HOUR;
  const m = arredondado % 60;
  const hFinal = Math.max(START_HOUR, Math.min(END_HOUR - 1, h));
  return `${String(hFinal).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const pxParaMinutos = (py) => {
  const min = (py / HOUR_HEIGHT) * 60;
  return Math.round(min / 15) * 15;
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

// ─── Modal genérico (FORA do componente — evita bug de re-render) ──
const Modal = ({ titulo, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
      <h3>{titulo}</h3>
      {children}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════
const CalendarioAgenda = () => {
  const { workspaceId } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [vista, setVista] = useState("dia");
  const [dataRef, setDataRef] = useState(new Date());

  // Navega para o período anterior/seguinte (dia, semana ou mês, conforme a vista atual)
  const navegarPeriodo = (delta) => {
    setDataRef(d => {
      const n = new Date(d);
      if (vista === "semana") n.setDate(n.getDate() + 7 * delta);
      else if (vista === "dia") n.setDate(n.getDate() + delta);
      else n.setMonth(n.getMonth() + delta);
      return n;
    });
  };
  const [agendamentos, setAgendamentos] = useState([]);
  const [mapaPac, setMapaPac] = useState({});
  const [salas, setSalas] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [nowY, setNowY] = useState(agoraParaPx());

  // Filtros
  const [filtroSala, setFiltroSala] = useState(null);
  const [filtroProfissional, setFiltroProfissional] = useState(null);

  const [eventoAtivo, setEventoAtivo] = useState(null);
  const [valorPago, setValorPago] = useState("");

  // Drag-to-create
  const [drag, setDrag] = useState(null); // { ds, startY, endY }
  const dragRef = useRef(null);

  // Drag-to-reschedule (arrastar um evento existente pra cima/baixo)
  const [arrastandoEvento, setArrastandoEvento] = useState(null); // { id, deltaY }
  const arrastarEventoRef = useRef(null);
  const ultimoArrasteEventoRef = useRef(false);

  const [modalReagendar, setModalReagendar] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalConcluir, setModalConcluir] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalFalta, setModalFalta] = useState(null);
  const [faltaCobrarTaxa, setFaltaCobrarTaxa] = useState(false);
  const [faltaValorTaxa, setFaltaValorTaxa] = useState("");
  const [modalCancelarRecorrencia, setModalCancelarRecorrencia] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [mostrarSolicitacoes, setMostrarSolicitacoes] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obsConc, setObsConc] = useState("");
  // Pagamento no modal concluir
  const [pagarNaConclusao, setPagarNaConclusao] = useState(false);
  const [valorConclusao, setValorConclusao] = useState("");
  // Edição de sessão concluída
  const [editObs, setEditObs] = useState("");
  const [editPago, setEditPago] = useState(false);
  const [editValor, setEditValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowY(agoraParaPx()), 60000);
    return () => clearInterval(t);
  }, []);

  // ─── Drag-to-create (vertical) + swipe de navegação (horizontal, touch) ──
  // No touch, o gesto começa "indefinido": só decidimos se é arraste (criar
  // sessão) ou swipe (trocar de dia/semana) quando o movimento é claro o
  // suficiente pra saber se foi mais horizontal ou mais vertical.
  useEffect(() => {
    const getY = (e, colEl) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = colEl.getBoundingClientRect();
      return Math.max(0, Math.min(clientY - rect.top, TOTAL_HEIGHT));
    };

    const onMove = (e) => {
      if (!dragRef.current) return;
      const isTouch = !!e.touches;
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;

      if (isTouch && dragRef.current.modo == null) {
        const dx = clientX - dragRef.current.startX;
        const dy = getY(e, dragRef.current.colEl) - dragRef.current.startY;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // movimento pequeno demais pra decidir ainda
        if (Math.abs(dx) > Math.abs(dy)) {
          dragRef.current.modo = "swipe";
        } else {
          dragRef.current.modo = "drag";
          setDrag({ ds: dragRef.current.ds, startY: dragRef.current.startY, endY: dragRef.current.startY });
        }
      }

      if (dragRef.current.modo === "swipe") {
        dragRef.current.endX = clientX;
        return;
      }

      if (e.cancelable) e.preventDefault();
      const y = getY(e, dragRef.current.colEl);
      dragRef.current.endY = y;
      setDrag(d => d ? { ...d, endY: y } : null);
    };

    const onEnd = () => {
      if (!dragRef.current) return;
      const { modo, ds, startY, endY, startX, endX } = dragRef.current;
      dragRef.current = null;
      setDrag(null);

      if (modo === "swipe") {
        const dx = (endX ?? startX) - startX;
        if (Math.abs(dx) > 50) navegarPeriodo(dx > 0 ? -1 : 1);
        return;
      }
      if (modo !== "drag") return;
      if (Math.abs(endY - startY) < 15) return;
      const topY    = Math.min(startY, endY);
      const bottomY = Math.max(startY, endY);
      const horaInicio = pxParaHora(topY);
      const duracaoMin = Math.max(15, pxParaMinutos(bottomY) - pxParaMinutos(topY));
      const durFinal = Math.round(duracaoMin / 15) * 15 || 30;
      navigate(`/agenda/marcar?data=${ds}&hora=${horaInicio}&duracao=${durFinal}`);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, vista]);

  // ─── Drag-to-reschedule: arrastar um evento existente pra cima/baixo ──
  useEffect(() => {
    const onMove = (e) => {
      if (!arrastarEventoRef.current) return;
      if (e.cancelable) e.preventDefault();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - arrastarEventoRef.current.startClientY;
      arrastarEventoRef.current.deltaY = deltaY;
      setArrastandoEvento({ id: arrastarEventoRef.current.agend.id, deltaY });
    };

    const onEnd = async () => {
      if (!arrastarEventoRef.current) return;
      const { agend, ds, deltaY } = arrastarEventoRef.current;
      arrastarEventoRef.current = null;
      setArrastandoEvento(null);

      if (Math.abs(deltaY) < 8) return; // moveu de menos, trata como clique normal

      ultimoArrasteEventoRef.current = true;
      const topOriginal = horaParaPx(agend.hora);
      const novoTop = Math.max(0, Math.min(topOriginal + deltaY, TOTAL_HEIGHT - 15));
      const novaHoraCalc = pxParaHora(novoTop);
      if (novaHoraCalc === agend.hora) return;
      try {
        await reagendarSessao(agend.id, ds, novaHoraCalc);
        await carregar();
      } catch (err) {
        alert("Erro ao reagendar: " + err.message);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspaceId) carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (!carregando && scrollRef.current && nowY !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 120);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando]);

  useEffect(() => {
    if (eventoAtivo) {
      setValorPago(eventoAtivo.valor ? String(eventoAtivo.valor) : "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoAtivo?.id]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [agends, pacs, salasLista, profsLista, solics] = await Promise.all([
        listarAgendamentos(workspaceId),
        listarPacientes(workspaceId),
        listarSalas(workspaceId).catch(() => []),
        listarProfissionais(workspaceId).catch(() => []),
        listarSolicitacoes(workspaceId).catch(() => []),
      ]);
      setSolicitacoes(solics.filter(s => s.status === "pendente"));
      setAgendamentos(agends);
      const mapa = {};
      pacs.forEach((p) => { mapa[p.id] = { nome: p.nome, telefone: p.telefone || "" }; });
      setMapaPac(mapa);
      setSalas(salasLista);
      setProfissionais(profsLista);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  // Agendamentos filtrados
  const agendamentosFiltrados = agendamentos.filter((a) => {
    if (filtroSala && a.salaId !== filtroSala) return false;
    if (filtroProfissional && a.profissionalId !== filtroProfissional) return false;
    return true;
  });

  const porData = {};
  agendamentosFiltrados.forEach((a) => {
    if (!porData[a.data]) porData[a.data] = [];
    porData[a.data].push(a);
  });

  // Mapa cor dos profissionais para exibir na agenda
  const mapaProfCor = {};
  profissionais.forEach(p => { mapaProfCor[p.id] = p.cor || "#9c27b0"; });

  // ─── ações ────────────────────────────────────────────────
  const handleReagendar = async () => {
    if (!novaData || !novaHora) return;
    setSalvando(true);
    try {
      await reagendarSessao(modalReagendar.id, novaData, novaHora);
      setModalReagendar(null); setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleCancelar = async () => {
    setSalvando(true);
    try {
      await cancelarSessao(modalCancelar.id, motivo);
      setModalCancelar(null); setMotivo(""); setEventoAtivo(null); await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleConcluir = async () => {
    setSalvando(true);
    try {
      const pagamento = pagarNaConclusao
        ? { pago: true, valor: valorConclusao ? parseFloat(valorConclusao) : null }
        : null;
      await marcarComoConcluido(modalConcluir.id, obsConc, pagamento);
      setModalConcluir(null);
      setObsConc("");
      setPagarNaConclusao(false);
      setValorConclusao("");
      setEventoAtivo(null);
      await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleSalvarEdicao = async () => {
    setSalvando(true);
    try {
      await editarSessaoConcluida(modalEditar.id, {
        observacoesConclusao: editObs,
        pago: editPago,
        valorPago: editPago && editValor ? parseFloat(editValor) : null,
      });
      // Atualiza evento ativo sem fechar
      setEventoAtivo(prev => ({
        ...prev,
        observacoesConclusao: editObs,
        pago: editPago,
        valorPago: editPago && editValor ? parseFloat(editValor) : null,
      }));
      setModalEditar(null);
      await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const abrirEdicao = (agend) => {
    setEditObs(agend.observacoesConclusao || "");
    setEditPago(agend.pago || false);
    setEditValor(agend.valorPago != null ? String(agend.valorPago) : agend.valor ? String(agend.valor) : "");
    setModalEditar(agend);
  };

  const handleFalta = (agend) => {
    setFaltaCobrarTaxa(false);
    setFaltaValorTaxa("");
    setModalFalta(agend);
  };

  const handleConfirmarFalta = async () => {
    setSalvando(true);
    try {
      await marcarFalta(modalFalta.id, {
        cobrarTaxa: faltaCobrarTaxa,
        valorTaxa: faltaCobrarTaxa && faltaValorTaxa ? parseFloat(faltaValorTaxa) : null,
      });
      setModalFalta(null);
      setEventoAtivo(null);
      await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleCancelarComRecorrencia = async (somenteEsta) => {
    setSalvando(true);
    try {
      if (somenteEsta) {
        await cancelarSessao(modalCancelarRecorrencia.id, motivo);
      } else {
        await cancelarRecorrencia(workspaceId, modalCancelarRecorrencia.recorrenciaId);
        await cancelarSessao(modalCancelarRecorrencia.id, motivo);
      }
      setModalCancelarRecorrencia(null);
      setMotivo("");
      setEventoAtivo(null);
      await carregar();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const handleMarcarPago = async (agend) => {
    const val = valorPago ? parseFloat(valorPago) : null;
    try {
      await marcarComoPago(agend.id, val);
      setEventoAtivo(prev => ({ ...prev, pago: true, valorPago: val }));
      await carregar();
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
    : vista === "dia"
    ? (() => {
        const d = dataRef;
        return `${DIAS_LABEL[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : `${MESES[dataRef.getMonth()]} ${dataRef.getFullYear()}`;

  // ─── FILTROS ─────────────────────────────────────────────
  const renderFiltros = () => {
    const temFiltros = salas.length > 0 || profissionais.length > 0;
    if (!temFiltros) return null;

    return (
      <div className="gc-filtros">
        {salas.length > 0 && (
          <div className="gc-filtro-grupo">
            <span className="gc-filtro-label">🚪 Sala:</span>
            <button
              className={`gc-filtro-btn${!filtroSala ? " ativo" : ""}`}
              onClick={() => setFiltroSala(null)}
            >
              Todas
            </button>
            {salas.map((s) => (
              <button
                key={s.id}
                className={`gc-filtro-btn${filtroSala === s.id ? " ativo" : ""}`}
                style={filtroSala === s.id ? { background: s.cor, color: "#fff", borderColor: s.cor } : { borderColor: s.cor, color: s.cor }}
                onClick={() => setFiltroSala(filtroSala === s.id ? null : s.id)}
              >
                <span className="gc-filtro-cor" style={{ background: s.cor }} />
                {s.nome}
              </button>
            ))}
          </div>
        )}
        {profissionais.length > 0 && (
          <div className="gc-filtro-grupo">
            <span className="gc-filtro-label">👤 Profissional:</span>
            <button
              className={`gc-filtro-btn${!filtroProfissional ? " ativo" : ""}`}
              onClick={() => setFiltroProfissional(null)}
            >
              Todos
            </button>
            {profissionais.map((p) => (
              <button
                key={p.id}
                className={`gc-filtro-btn${filtroProfissional === p.id ? " ativo" : ""}`}
                style={filtroProfissional === p.id ? { background: p.cor || "#9c27b0", color: "#fff", borderColor: p.cor || "#9c27b0" } : { borderColor: p.cor || "#9c27b0", color: p.cor || "#9c27b0" }}
                onClick={() => setFiltroProfissional(filtroProfissional === p.id ? null : p.id)}
              >
                <span className="gc-filtro-cor" style={{ background: p.cor || "#9c27b0" }} />
                {p.nome}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Render do evento ─────────────────────────────────────
  const renderEvento = (agend, extra = {}, ds = agend.data) => {
    const cor = CORES_STATUS[agend.status] || CORES_STATUS.confirmado;
    const pac = mapaPac[agend.pacienteId];
    // Fundo = cor do profissional; borda esquerda fina = cor do status
    const profCor = agend.profissionalId && mapaProfCor[agend.profissionalId]
      ? mapaProfCor[agend.profissionalId]
      : null;
    const bgColor = profCor
      ? profCor + "22"   // cor do profissional bem clara (14% opacidade)
      : cor.bg;
    const borderColor = profCor ? profCor : cor.border;
    const arrastandoEsse = arrastandoEvento?.id === agend.id;

    return (
      <div
        key={agend.id}
        className="gc-event"
        style={{
          top: extra.top,
          height: extra.height,
          background: bgColor,
          borderLeftColor: borderColor,
          color: "#1a2535",
          ...(arrastandoEsse ? {
            transform: `translateY(${arrastandoEvento.deltaY}px)`,
            zIndex: 50,
            opacity: 0.9,
            boxShadow: "0 4px 14px rgba(0,0,0,.25)",
            cursor: "grabbing",
          } : {}),
          ...extra.style,
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          arrastarEventoRef.current = { agend, ds, startClientY: e.clientY, deltaY: 0 };
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          arrastarEventoRef.current = { agend, ds, startClientY: e.touches[0].clientY, deltaY: 0 };
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (ultimoArrasteEventoRef.current) { ultimoArrasteEventoRef.current = false; return; }
          setEventoAtivo(agend);
        }}
      >
        {extra.curto
          ? <span className="gc-event-curto">{agend.hora} {pac?.nome}</span>
          : <>
              <span className="gc-event-nome">{pac?.nome || "Cliente"}</span>
              <span className="gc-event-hora">{agend.hora} · {agend.duracao || 60}min</span>
              {agend.salaNome && <span className="gc-event-sala">🚪 {agend.salaNome}</span>}
              <span className="gc-event-status-dot" style={{ background: cor.border }} title={agend.status} />
            </>
        }
      </div>
    );
  };

  // ─── VISÃO SEMANA ─────────────────────────────────────────
  const renderSemana = () => {
    const dias = diasDaSemana(dataRef);
    const hoje = fmt(new Date());

    return (
      <div className="gc-semana-wrapper">
        <div className="gc-semana-header">
          <div className="gc-corner" />
          {dias.map((dia) => {
            const ds = fmt(dia);
            const isHoje = ds === hoje;
            return (
              <div key={ds} className="gc-day-header-col">
                <span className="gc-day-header-nome">{DIAS_LABEL[dia.getDay()]}</span>
                <span className={`gc-day-header-num${isHoje ? " hoje" : ""}`}>{dia.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div className="gc-semana-body" ref={scrollRef}>
          <div className="gc-time-col">
            {HOURS.map((h) => (
              <div key={h} className="gc-time-label" style={{ height: HOUR_HEIGHT }}>
                <span>{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          <div className="gc-days-area" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((_, i) => (
              <div key={i} className="gc-hline" style={{ top: i * HOUR_HEIGHT }} />
            ))}

            {dias.map((dia) => {
              const ds = fmt(dia);
              const isHoje = ds === hoje;
              const events = (porData[ds] || []).sort((a, b) => a.hora.localeCompare(b.hora));
              const isDragging = drag && drag.ds === ds;

              return (
                <div
                  key={ds}
                  className={`gc-day-col${isHoje ? " hoje" : ""}`}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = Math.max(0, e.clientY - rect.top);
                    dragRef.current = { ds, startY: y, endY: y, colEl: e.currentTarget, modo: "drag" };
                    setDrag({ ds, startY: y, endY: y });
                  }}
                  onTouchStart={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = Math.max(0, e.touches[0].clientY - rect.top);
                    dragRef.current = { ds, startX: e.touches[0].clientX, startY: y, endY: y, colEl: e.currentTarget, modo: null };
                  }}
                  onClick={(e) => {
                    if (dragRef.current) return;
                    navigate(`/agenda/marcar?data=${ds}`);
                  }}
                >
                  {isHoje && nowY !== null && (
                    <div className="gc-now-line" style={{ top: nowY }}>
                      <div className="gc-now-dot" />
                    </div>
                  )}
                  {events.map((agend) => {
                    const top = horaParaPx(agend.hora);
                    const height = Math.max(((agend.duracao || 60) / 60) * HOUR_HEIGHT - 2, 20);
                    const curto = height < 48;
                    return renderEvento(agend, { top, height, curto }, ds);
                  })}
                  {isDragging && (() => {
                    const topY    = Math.min(drag.startY, drag.endY);
                    const bottomY = Math.max(drag.startY, drag.endY);
                    const h = Math.max(bottomY - topY, 4);
                    const horaLabel = pxParaHora(topY);
                    const durMin    = Math.max(15, Math.round((pxParaMinutos(bottomY) - pxParaMinutos(topY)) / 15) * 15);
                    return (
                      <div className="gc-drag-ghost" style={{ top: topY, height: h }}>
                        <span className="gc-drag-label">{horaLabel} · {durMin}min</span>
                      </div>
                    );
                  })()}
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

    return (
      <div className="gc-mes-wrapper">
        <div className="gc-mes-dias-header">
          {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => (
            <div key={d} className="gc-mes-header-dia">{d}</div>
          ))}
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
              <div
                key={ds}
                className={`gc-mes-dia${!isMes ? " outro-mes" : ""}${isHoje ? " hoje" : ""}`}
                onClick={() => { setDataRef(dia); setVista("dia"); }}
                style={{ cursor: "pointer" }}
                title="Ver dia"
              >
                <span className={`gc-mes-num${isHoje ? " hoje" : ""}`}>
                  {dia.getDate()}
                </span>
                <div className="gc-mes-events">
                  {visivel.map((agend) => {
                    const profCor = agend.profissionalId && mapaProfCor[agend.profissionalId]
                      ? mapaProfCor[agend.profissionalId]
                      : (CORES_STATUS[agend.status] || CORES_STATUS.confirmado).border;
                    const pac = mapaPac[agend.pacienteId];
                    return (
                      <div key={agend.id} className="gc-mes-event" style={{ background: profCor }}
                        onClick={(e) => { e.stopPropagation(); setEventoAtivo(agend); }}>
                        {agend.hora} {pac?.nome}
                      </div>
                    );
                  })}
                  {extra > 0 && (
                    <div className="gc-mes-mais" onClick={(e) => { e.stopPropagation(); setDataRef(dia); setVista("dia"); }}>
                      +{extra} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── VISÃO DIA ────────────────────────────────────────────
  const renderDia = () => {
    const ds = fmt(dataRef);
    const hoje = fmt(new Date());
    const isHoje = ds === hoje;
    const events = (porData[ds] || []).sort((a, b) => a.hora.localeCompare(b.hora));

    return (
      <div className="gc-semana-wrapper gc-dia-wrapper">
        <div className="gc-semana-header gc-dia-header">
          <div className="gc-corner" />
          <div className="gc-day-header-col gc-dia-col-header">
            <span className="gc-day-header-nome">{DIAS_LABEL[dataRef.getDay()]}</span>
            <span className={`gc-day-header-num${isHoje ? " hoje" : ""}`}>{dataRef.getDate()}</span>
          </div>
        </div>

        <div className="gc-semana-body" ref={scrollRef}>
          <div className="gc-time-col">
            {HOURS.map((h) => (
              <div key={h} className="gc-time-label" style={{ height: HOUR_HEIGHT }}>
                <span>{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          <div className="gc-days-area gc-dia-area" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((_, i) => (
              <div key={i} className="gc-hline" style={{ top: i * HOUR_HEIGHT }} />
            ))}

            <div
              className={`gc-day-col gc-dia-single-col${isHoje ? " hoje" : ""}`}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const y = Math.max(0, e.clientY - rect.top);
                dragRef.current = { ds, startY: y, endY: y, colEl: e.currentTarget, modo: "drag" };
                setDrag({ ds, startY: y, endY: y });
              }}
              onTouchStart={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = Math.max(0, e.touches[0].clientY - rect.top);
                dragRef.current = { ds, startX: e.touches[0].clientX, startY: y, endY: y, colEl: e.currentTarget, modo: null };
              }}
              onClick={() => { if (!dragRef.current) navigate(`/agenda/marcar?data=${ds}`); }}
            >
              {isHoje && nowY !== null && (
                <div className="gc-now-line" style={{ top: nowY }}>
                  <div className="gc-now-dot" />
                </div>
              )}
              {events.map((agend) => {
                const top = horaParaPx(agend.hora);
                const height = Math.max(((agend.duracao || 60) / 60) * HOUR_HEIGHT - 2, 20);
                const curto = height < 48;
                return renderEvento(agend, { top, height, curto }, ds);
              })}
              {drag && drag.ds === ds && (() => {
                const topY    = Math.min(drag.startY, drag.endY);
                const bottomY = Math.max(drag.startY, drag.endY);
                const h = Math.max(bottomY - topY, 4);
                const horaLabel = pxParaHora(topY);
                const durMin    = Math.max(15, Math.round((pxParaMinutos(bottomY) - pxParaMinutos(topY)) / 15) * 15);
                return (
                  <div className="gc-drag-ghost" style={{ top: topY, height: h }}>
                    <span className="gc-drag-label">{horaLabel} · {durMin}min</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MODAL DO EVENTO ──────────────────────────────────────
  const renderModalEvento = () => {
    if (!eventoAtivo) return null;
    const a = eventoAtivo;
    const pac = mapaPac[a.pacienteId];
    const cor = CORES_STATUS[a.status] || CORES_STATUS.confirmado;
    const confirmado = a.status === "confirmado";
    const concluido  = a.status === "concluído";
    const dataFmt = parseLocal(a.data).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });
    const profissionalInfo = profissionais.find(p => p.id === a.profissionalId);

    return (
      <div className="gc-overlay" onClick={() => setEventoAtivo(null)}>
        <div className="gc-ev-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-ev-modal-top" style={{ borderTopColor: cor.border }}>
            <div>
              <h3 className="gc-ev-nome">{pac?.nome || "Cliente"}</h3>
              <p className="gc-ev-data" style={{ textTransform: "capitalize" }}>{dataFmt}</p>
              <p className="gc-ev-hora">{a.hora} · {a.duracao || 60} minutos</p>
            </div>
            <button className="gc-ev-close" onClick={() => setEventoAtivo(null)}>✕</button>
          </div>

          <div className="gc-ev-modal-body">
            <span className="gc-status-badge" style={{ background: cor.bg, color: cor.text }}>
              {a.status}
            </span>

            {/* Sala e Profissional */}
            {a.salaNome && (
              <p className="gc-ev-info">
                <span className="gc-ev-sala-dot" style={{ background: a.salaCor || "#4285f4" }} />
                🚪 {a.salaNome}
              </p>
            )}
            {profissionalInfo && (
              <p className="gc-ev-info">
                <span className="gc-ev-sala-dot" style={{ background: profissionalInfo.cor || "#9c27b0" }} />
                👤 {profissionalInfo.nome}
                {profissionalInfo.especialidade && ` · ${profissionalInfo.especialidade}`}
              </p>
            )}

            {/* Info de pacote */}
            {a.pacoteId && (
              <p className="gc-ev-info">
                📦 Pacote de {a.numSessoesPacote} sessões
                {a.valorPacote && ` · R$ ${Number(a.valorPacote).toFixed(2).replace(".", ",")}`}
                {a.pacoteQuitado ? " · ✅ Quitado" : " · ⏳ Pendente"}
              </p>
            )}

            {a.valor && !a.pacoteId && (
              <p className="gc-ev-info">💰 Valor: R$ {Number(a.valor).toFixed(2).replace(".", ",")}</p>
            )}

            {/* Status de pagamento */}
            {a.pago ? (
              <p className="gc-ev-info gc-pago-ok">
                ✅ Pago: R$ {Number(a.valorPago ?? a.valor ?? 0).toFixed(2).replace(".", ",")}
              </p>
            ) : (
              <div className="gc-pagar-section">
                <p className="gc-pagar-label">💰 Registrar pagamento</p>
                <div className="gc-pagar-row">
                  <input
                    type="number"
                    className="gc-pagar-input"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    placeholder={a.valor ? `R$ ${a.valor}` : "Valor recebido"}
                    min="0"
                    step="0.01"
                  />
                  <button className="gc-act-btn pagar" onClick={() => handleMarcarPago(a)}>
                    Marcar como Pago
                  </button>
                </div>
              </div>
            )}

            {a.linkAtendimento && (
              <a href={a.linkAtendimento} target="_blank" rel="noreferrer" className="gc-link-sessao">
                🔗 Entrar na sessão online
              </a>
            )}
            {a.observacoes && <p className="gc-ev-info">📝 {a.observacoes}</p>}
            {a.observacoesConclusao && <p className="gc-ev-info">📋 {a.observacoesConclusao}</p>}
          </div>

          {confirmado && (
            <div className="gc-ev-actions">
              {pac?.telefone && (
                <a href={whatsappLink(pac.telefone, pac.nome, a.data, a.hora)}
                   target="_blank" rel="noreferrer" className="gc-act-btn whatsapp">WhatsApp</a>
              )}
              <button className="gc-act-btn reagendar"
                onClick={() => { setModalReagendar(a); setNovaData(a.data); setNovaHora(a.hora); }}>
                Reagendar
              </button>
              <button className="gc-act-btn concluir" onClick={() => {
                setObsConc(a.observacoes || "");
                setPagarNaConclusao(false);
                setValorConclusao(a.valor ? String(a.valor) : "");
                setModalConcluir(a);
              }}>Concluir</button>
              <button className="gc-act-btn falta" onClick={() => handleFalta(a)}>Falta</button>
              <button className="gc-act-btn cancelar" onClick={() => {
                setMotivo("");
                if (a.recorrenciaId) {
                  setModalCancelarRecorrencia(a);
                } else {
                  setModalCancelar(a);
                }
              }}>Cancelar</button>
            </div>
          )}
          {concluido && (
            <div className="gc-ev-actions">
              <button className="gc-act-btn editar" onClick={() => abrirEdicao(a)}>✏️ Editar</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="gc-container">
      {/* Toolbar */}
      <div className="gc-toolbar">
        <div className="gc-toolbar-left">
          <button className="gc-btn-hoje" onClick={() => setDataRef(new Date())}>Hoje</button>
          <div className="gc-nav-group">
            <button className="gc-nav-btn" onClick={() => navegarPeriodo(-1)}>‹</button>
            <button className="gc-nav-btn" onClick={() => navegarPeriodo(1)}>›</button>
          </div>
          <h2 className="gc-periodo">{labelPeriodo}</h2>
        </div>
        <div className="gc-toolbar-right">
          <div className="gc-toggle">
            <button className={`gc-toggle-btn${vista === "dia" ? " ativo" : ""}`} onClick={() => setVista("dia")}>Dia</button>
            <button className={`gc-toggle-btn${vista === "semana" ? " ativo" : ""}`} onClick={() => setVista("semana")}>Semana</button>
            <button className={`gc-toggle-btn${vista === "mes" ? " ativo" : ""}`} onClick={() => setVista("mes")}>Mês</button>
          </div>
          <button className="gc-btn-espera" onClick={() => navigate("/agenda/lista-espera")}>Lista de Espera</button>
          <button
            className="gc-btn-solicitacoes"
            onClick={() => setMostrarSolicitacoes(v => !v)}
          >
            📥 Solicitações{solicitacoes.length > 0 && <span className="gc-badge-sol">{solicitacoes.length}</span>}
          </button>
          <button className="gc-btn-novo" onClick={() => navigate("/agenda/marcar")}>+ Nova Sessão</button>
        </div>
      </div>

      {/* Painel de solicitações pendentes */}
      {mostrarSolicitacoes && (
        <div className="gc-solicitacoes-painel">
          <div className="gc-sol-header">
            <h3>Solicitações de agendamento</h3>
            <button className="gc-sol-fechar" onClick={() => setMostrarSolicitacoes(false)}>✕</button>
          </div>
          {solicitacoes.length === 0 ? (
            <p className="gc-sol-vazio">Nenhuma solicitação pendente.</p>
          ) : solicitacoes.map(s => (
            <div key={s.id} className="gc-sol-card">
              <div className="gc-sol-info">
                <span className="gc-sol-nome">{s.nome}</span>
                <span className="gc-sol-tel">📱 {s.telefone}</span>
                {s.email && <span className="gc-sol-email">✉️ {s.email}</span>}
                <span className="gc-sol-data">
                  📅 {s.dataPreferida ? new Date(s.dataPreferida + "T12:00").toLocaleDateString("pt-BR") : "—"} às {s.horaPreferida || "—"}
                </span>
                {s.mensagem && <span className="gc-sol-msg">💬 {s.mensagem}</span>}
              </div>
              <div className="gc-sol-acoes">
                <a
                  href={`https://wa.me/55${s.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá ${s.nome}! Recebemos sua solicitação de agendamento para ${s.dataPreferida ? new Date(s.dataPreferida+"T12:00").toLocaleDateString("pt-BR") : ""} às ${s.horaPreferida}. Vamos confirmar seu horário!`)}`}
                  target="_blank" rel="noreferrer"
                  className="gc-sol-btn gc-sol-btn--wpp"
                >WhatsApp</a>
                <button
                  className="gc-sol-btn gc-sol-btn--confirm"
                  onClick={async () => {
                    try {
                      // Verifica se já existe cliente com esse telefone
                      const tel = s.telefone.replace(/\D/g, "");
                      const pacExistente = Object.values(mapaPac).find(p => p.telefone?.replace(/\D/g, "") === tel);
                      let pacienteId;
                      if (pacExistente) {
                        pacienteId = pacExistente.id;
                      } else {
                        pacienteId = await adicionarPaciente(workspaceId, {
                          nome: s.nome.trim(),
                          telefone: s.telefone.trim(),
                          email: s.email || "",
                          observacoes: s.mensagem || "",
                        });
                        // Atualiza mapa local
                        setMapaPac(prev => ({ ...prev, [pacienteId]: { id: pacienteId, nome: s.nome, telefone: s.telefone } }));
                      }
                      await atualizarStatusSolicitacao(s.id, "confirmado");
                      setSolicitacoes(prev => prev.filter(x => x.id !== s.id));
                      navigate(`/agenda/marcar?pacienteId=${pacienteId}&data=${s.dataPreferida || ""}&hora=${s.horaPreferida || ""}`);
                    } catch (err) {
                      alert("Erro ao aceitar solicitação: " + err.message);
                    }
                  }}
                >Agendar</button>
                <button
                  className="gc-sol-btn gc-sol-btn--recusar"
                  onClick={async () => {
                    await atualizarStatusSolicitacao(s.id, "recusado");
                    setSolicitacoes(prev => prev.filter(x => x.id !== s.id));
                  }}
                >Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros (salas e profissionais) */}
      {!carregando && renderFiltros()}

      {carregando
        ? <div className="gc-loading">Carregando agenda...</div>
        : vista === "dia" ? renderDia() : vista === "semana" ? renderSemana() : renderMes()
      }

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
        <Modal titulo="Concluir Sessão" onClose={() => { setModalConcluir(null); setPagarNaConclusao(false); }}>
          <p style={{ color:"#666", fontSize:"14px", marginBottom:"16px" }}>
            Paciente: <strong>{mapaPac[modalConcluir.pacienteId]?.nome}</strong>
          </p>
          <div className="form-group">
            <label>Observações da sessão (opcional)</label>
            <textarea rows="3" value={obsConc} onChange={(e) => setObsConc(e.target.value)} placeholder="Anotações sobre a sessão..." />
          </div>
          {/* Pagamento na conclusão */}
          <div className="gc-concluir-pagar">
            <label className="gc-concluir-pagar-toggle">
              <input
                type="checkbox"
                checked={pagarNaConclusao}
                onChange={(e) => setPagarNaConclusao(e.target.checked)}
              />
              <span>💰 Registrar pagamento agora</span>
            </label>
            {pagarNaConclusao && (
              <div className="gc-concluir-valor-row">
                <input
                  type="number"
                  className="gc-pagar-input"
                  value={valorConclusao}
                  onChange={(e) => setValorConclusao(e.target.value)}
                  placeholder={modalConcluir.valor ? `R$ ${modalConcluir.valor}` : "Valor recebido"}
                  min="0"
                  step="0.01"
                  autoFocus
                />
                <span className="gc-concluir-pagar-dica">Deixe vazio para usar o valor da sessão</span>
              </div>
            )}
          </div>
          <div className="modal-buttons">
            <button className="btn-modal-cancelar" onClick={() => { setModalConcluir(null); setPagarNaConclusao(false); }}>Cancelar</button>
            <button className="btn-modal-confirmar" onClick={handleConcluir} disabled={salvando}>
              {salvando ? "Salvando..." : pagarNaConclusao ? "Concluir e Registrar Pagamento" : "Marcar como Concluída"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Falta */}
      {modalFalta && (() => {
        const pac = mapaPac[modalFalta.pacienteId];
        const dataFmt = parseLocal(modalFalta.data).toLocaleDateString("pt-BR");
        const wppMsg = encodeURIComponent(
          `Olá ${pac?.nome || ""}! Sentimos sua falta hoje (${dataFmt} às ${modalFalta.hora}). Gostaria de reagendar?`
        );
        const wppLink = pac?.telefone
          ? `https://wa.me/55${pac.telefone.replace(/\D/g, "")}?text=${wppMsg}`
          : null;
        return (
          <Modal titulo="Registrar Falta" onClose={() => setModalFalta(null)}>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
              Confirmar falta de <strong>{pac?.nome || "Cliente"}</strong> em <strong>{dataFmt} às {modalFalta.hora}</strong>?
            </p>
            <div className="gc-concluir-pagar" style={{ marginBottom: "16px" }}>
              <label className="gc-concluir-pagar-toggle">
                <input
                  type="checkbox"
                  checked={faltaCobrarTaxa}
                  onChange={(e) => setFaltaCobrarTaxa(e.target.checked)}
                />
                <span>💸 Cobrar taxa de falta</span>
              </label>
              {faltaCobrarTaxa && (
                <div className="gc-concluir-valor-row" style={{ marginTop: "8px" }}>
                  <input
                    type="number"
                    className="gc-pagar-input"
                    value={faltaValorTaxa}
                    onChange={(e) => setFaltaValorTaxa(e.target.value)}
                    placeholder="Valor da taxa (R$)"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {wppLink && (
                <a
                  href={wppLink}
                  target="_blank"
                  rel="noreferrer"
                  className="gc-act-btn whatsapp"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                >
                  📱 WhatsApp
                </a>
              )}
              <button
                type="button"
                className="gc-act-btn reagendar"
                onClick={() => {
                  setModalFalta(null);
                  setEventoAtivo(null);
                  navigate(`/agenda/marcar?pacienteId=${modalFalta.pacienteId}`);
                }}
              >
                📅 Reagendar agora
              </button>
            </div>
            <div className="modal-buttons">
              <button className="btn-modal-cancelar" onClick={() => setModalFalta(null)}>Voltar</button>
              <button className="btn-modal-deletar" onClick={handleConfirmarFalta} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar falta"}
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Modal Cancelar Recorrência */}
      {modalCancelarRecorrencia && (
        <Modal titulo="Cancelar Sessão Recorrente" onClose={() => setModalCancelarRecorrencia(null)}>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
            Paciente: <strong>{mapaPac[modalCancelarRecorrencia.pacienteId]?.nome}</strong><br />
            <strong>{parseLocal(modalCancelarRecorrencia.data).toLocaleDateString("pt-BR")} às {modalCancelarRecorrencia.hora}</strong>
          </p>
          <p style={{ color: "#444", fontSize: "14px", marginBottom: "16px" }}>
            🔁 Esta sessão faz parte de uma recorrência. O que deseja fazer?
          </p>
          <div className="form-group">
            <label>Motivo (opcional)</label>
            <textarea rows="2" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do cancelamento..." />
          </div>
          <div className="modal-buttons" style={{ flexDirection: "column", gap: "8px" }}>
            <button className="btn-modal-cancelar" onClick={() => setModalCancelarRecorrencia(null)}>Voltar</button>
            <button className="btn-modal-deletar" onClick={() => handleCancelarComRecorrencia(true)} disabled={salvando}>
              {salvando ? "Cancelando..." : "Cancelar só esta sessão"}
            </button>
            <button className="btn-modal-deletar" style={{ background: "#c62828" }} onClick={() => handleCancelarComRecorrencia(false)} disabled={salvando}>
              {salvando ? "Cancelando..." : "Cancelar esta e todas as futuras"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Editar sessão concluída */}
      {modalEditar && (
        <Modal titulo="Editar Sessão Concluída" onClose={() => setModalEditar(null)}>
          <p style={{ color:"#666", fontSize:"14px", marginBottom:"16px" }}>
            Paciente: <strong>{mapaPac[modalEditar.pacienteId]?.nome}</strong>
            {" · "}{mapaPac[modalEditar.pacienteId] && parseLocal(modalEditar.data).toLocaleDateString("pt-BR")} às {modalEditar.hora}
          </p>
          <div className="form-group">
            <label>Observações da sessão</label>
            <textarea rows="4" value={editObs} onChange={(e) => setEditObs(e.target.value)} placeholder="Anotações sobre a sessão..." />
          </div>
          <div className="gc-concluir-pagar">
            <label className="gc-concluir-pagar-toggle">
              <input type="checkbox" checked={editPago} onChange={(e) => setEditPago(e.target.checked)} />
              <span>💰 {editPago ? "Sessão paga" : "Marcar como paga"}</span>
            </label>
            {editPago && (
              <div className="gc-concluir-valor-row">
                <input
                  type="number"
                  className="gc-pagar-input"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  placeholder={modalEditar.valor ? `R$ ${modalEditar.valor}` : "Valor recebido"}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>
          <div className="modal-buttons">
            <button className="btn-modal-cancelar" onClick={() => setModalEditar(null)}>Cancelar</button>
            <button className="btn-modal-confirmar" onClick={handleSalvarEdicao} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarioAgenda;
