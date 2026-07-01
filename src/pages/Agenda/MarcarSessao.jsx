import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { marcarSessao, marcarSessoesEmLote, marcarSessoesRecorrentes, listarAgendamentos } from "../../services/agendamentosService";
import { listarPacientes, adicionarPaciente } from "../../services/pacientesService";
import { listarSalas, criarSala } from "../../services/salasService";
import { listarProfissionais } from "../../services/profissionaisService";
import { useAuth } from "../../hooks/useAuth";
import { usePlano } from "../../hooks/usePlano";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import "../../styles/forms.css";
import "../../styles/marcar-sessao.css";

const VAZIO_PAC = { nome: "", telefone: "", email: "", dataNascimento: "", observacoes: "" };

const DIAS_SEMANA = [
  { idx: 1, label: "Seg", abrev: "Segunda" },
  { idx: 2, label: "Ter", abrev: "Terça" },
  { idx: 3, label: "Qua", abrev: "Quarta" },
  { idx: 4, label: "Qui", abrev: "Quinta" },
  { idx: 5, label: "Sex", abrev: "Sexta" },
  { idx: 6, label: "Sáb", abrev: "Sábado" },
  { idx: 0, label: "Dom", abrev: "Domingo" },
];

const fmtData = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const gerarDatas = (dataInicio, diasSelecionados, horariosPorDia, numSessoes) => {
  if (!dataInicio || diasSelecionados.length === 0 || numSessoes < 1) return [];
  const [y, mo, d] = dataInicio.split("-").map(Number);
  const cur = new Date(y, mo - 1, d);
  const resultado = [];
  let iter = 0;
  while (resultado.length < numSessoes && iter < numSessoes * 14) {
    const diaSemana = cur.getDay();
    if (diasSelecionados.includes(diaSemana)) {
      resultado.push({
        data: fmtData(cur),
        hora: horariosPorDia[diaSemana] || "09:00",
        diaSemana,
      });
    }
    cur.setDate(cur.getDate() + 1);
    iter++;
  }
  return resultado;
};

const gerarDatasRecorrencia = (dataInicio, diasSelecionados, horariosPorDia, meses) => {
  if (!dataInicio || diasSelecionados.length === 0 || meses < 1) return [];
  const [y, mo, d] = dataInicio.split("-").map(Number);
  const cur = new Date(y, mo - 1, d);
  const fim = new Date(y, mo - 1 + meses, d);
  const resultado = [];
  while (cur < fim) {
    const diaSemana = cur.getDay();
    if (diasSelecionados.includes(diaSemana)) {
      resultado.push({
        data: fmtData(cur),
        hora: horariosPorDia[diaSemana] || "09:00",
        diaSemana,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return resultado;
};

const MarcarSessao = () => {
  const { user, workspaceId, role } = useAuth();
  const { checar } = usePlano(workspaceId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buscaRef = useRef(null);

  const [pacientes, setPacientes] = useState([]);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);
  const [salas, setSalas] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [cfgAgenda, setCfgAgenda] = useState({ duracaoSessao: 60, intervaloEntreSessoes: 0 });

  const [busca, setBusca] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [criandoPaciente, setCriandoPaciente] = useState(false);
  const [novoPac, setNovoPac] = useState(VAZIO_PAC);
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [erroPac, setErroPac] = useState("");

  // modoSessao: "unica" | "pacote" | "recorrencia"
  const [modoSessao, setModoSessao] = useState("unica");
  const emPacote = modoSessao === "pacote";
  const emRecorrencia = modoSessao === "recorrencia";
  const [pacote, setPacote] = useState({
    diasSelecionados: [],
    horariosPorDia: {},
    numSessoes: 8,
    valorTotal: "",
    quitado: false,
  });
  const [recorrencia, setRecorrencia] = useState({
    diasSelecionados: [],
    horariosPorDia: {},
    meses: 3,
    valor: "",
  });
  const [previewSessoes, setPreviewSessoes] = useState([]);
  const [previewRecorrencia, setPreviewRecorrencia] = useState([]);
  // Criar sala inline
  const [criandoSala, setCriandoSala] = useState(false);
  const [novaSalaNome, setNovaSalaNome] = useState("");
  const [salvandoSala, setSalvandoSala] = useState(false);

  // Edição inline de sessão na prévia
  const [editandoSessaoIdx, setEditandoSessaoIdx] = useState(null);
  const [editSessaoData, setEditSessaoData] = useState("");
  const [editSessaoHora, setEditSessaoHora] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const dataParam      = searchParams.get("data")       || "";
  const horaParam      = searchParams.get("hora")       || "";
  const pacienteIdParam = searchParams.get("pacienteId") || "";

  const [dados, setDados] = useState({
    pacienteId: pacienteIdParam,
    pacienteNome: "",
    data: dataParam,
    hora: horaParam,
    duracao: "60",
    valor: "",
    linkAtendimento: "",
    observacoes: "",
    salaId: "",
    profissionalId: "",
    procedimentoId: "",
    procedimentoNome: "",
  });

  useEffect(() => {
    if (!workspaceId) return;
    carregarPacientes();
    listarAgendamentos(workspaceId).then(setAgendamentosExistentes).catch(() => {});
    buscarConfiguracoes(workspaceId).then(cfg => {
      setCfgAgenda({
        duracaoSessao:         cfg.duracaoSessao         || 60,
        intervaloEntreSessoes: cfg.intervaloEntreSessoes  ?? 0,
      });
    }).catch(() => {});
    listarSalas(workspaceId).then(setSalas).catch(() => {});
    if (role === "owner") {
      listarProfissionais(workspaceId).then(setProfissionais).catch(() => {});
    }
  }, [workspaceId, role]);

  useEffect(() => {
    const handler = (e) => {
      if (buscaRef.current && !buscaRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!emPacote) return;
    const sessoes = gerarDatas(
      dados.data,
      pacote.diasSelecionados,
      pacote.horariosPorDia,
      pacote.numSessoes
    );
    setPreviewSessoes(sessoes);
  }, [emPacote, dados.data, pacote.diasSelecionados, pacote.horariosPorDia, pacote.numSessoes]);

  useEffect(() => {
    if (!emRecorrencia) return;
    const sessoes = gerarDatasRecorrencia(
      dados.data,
      recorrencia.diasSelecionados,
      recorrencia.horariosPorDia,
      recorrencia.meses
    );
    setPreviewRecorrencia(sessoes);
  }, [emRecorrencia, dados.data, recorrencia.diasSelecionados, recorrencia.horariosPorDia, recorrencia.meses]);

  const carregarPacientes = async () => {
    try {
      const lista = await listarPacientes(workspaceId);
      setPacientes(lista);
      // Pré-selecionar cliente vindo da solicitação
      if (pacienteIdParam) {
        const pac = lista.find(p => p.id === pacienteIdParam);
        if (pac) {
          setDados(d => ({ ...d, pacienteId: pac.id, pacienteNome: pac.nome }));
          setBusca(pac.nome);
        }
      }
    } catch (err) {
      setErro("Erro ao carregar clientes: " + err.message);
    }
  };

  // Verifica conflito considerando duração da sessão + intervalo entre sessões
  const temConflito = (data, hora) => {
    const { duracaoSessao, intervaloEntreSessoes } = cfgAgenda;
    const blocoTotal = duracaoSessao + intervaloEntreSessoes;
    const horaParaMin = (h) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };

    const slotMin = horaParaMin(hora);
    const slotFim = slotMin + duracaoSessao; // final da nova sessão sendo marcada

    const salaId = dados.salaId;
    const profId = dados.profissionalId;

    const ativos = agendamentosExistentes.filter(
      a => a.data === data && a.status !== "cancelado"
    );

    return ativos.some(a => {
      const inicioExist = horaParaMin(a.hora);
      const fimExist    = inicioExist + blocoTotal; // a sessão existente bloqueia até fim + intervalo

      // Sobreposição: nova sessão começa antes do fim da existente E termina depois do início
      const sobrepoe = slotMin < fimExist && slotFim > inicioExist;
      if (!sobrepoe) return false;

      // Filtrar por sala ou profissional se selecionados
      if (profId && a.profissionalId !== profId && a.profissionalId) return false;
      if (salaId && a.salaId !== salaId && a.salaId) return false;

      return true;
    });
  };

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const selecionarPaciente = (pac) => {
    setDados((d) => ({ ...d, pacienteId: pac.id, pacienteNome: pac.nome }));
    setBusca(pac.nome);
    setDropdownAberto(false);
  };

  const limparPaciente = () => {
    setDados((d) => ({ ...d, pacienteId: "", pacienteNome: "" }));
    setBusca("");
    setDropdownAberto(false);
    setCriandoPaciente(false);
  };

  const abrirCriacao = () => {
    setCriandoPaciente(true);
    setDropdownAberto(false);
    setNovoPac(VAZIO_PAC);
    setErroPac("");
  };

  const handleNovoPac = (e) => {
    const { name, value } = e.target;
    setNovoPac((p) => ({ ...p, [name]: value }));
  };

  const criarPaciente = async (e) => {
    e.preventDefault();
    if (!novoPac.nome.trim()) { setErroPac("Nome é obrigatório."); return; }
    setSalvandoPac(true);
    setErroPac("");
    try {
      const id = await adicionarPaciente(workspaceId, {
        nome: novoPac.nome.trim(),
        telefone: novoPac.telefone.trim(),
        email: novoPac.email.trim(),
        dataNascimento: novoPac.dataNascimento,
        observacoes: novoPac.observacoes.trim(),
      });
      await carregarPacientes();
      setDados((d) => ({ ...d, pacienteId: id, pacienteNome: novoPac.nome.trim() }));
      setBusca(novoPac.nome.trim());
      setCriandoPaciente(false);
    } catch (err) {
      setErroPac("Erro ao criar cliente: " + err.message);
    } finally {
      setSalvandoPac(false);
    }
  };

  const toggleDia = (idx) => {
    setPacote((p) => {
      const dias = p.diasSelecionados.includes(idx)
        ? p.diasSelecionados.filter((d) => d !== idx)
        : [...p.diasSelecionados, idx];
      const horarios = { ...p.horariosPorDia };
      if (!dias.includes(idx)) delete horarios[idx];
      if (dias.includes(idx) && !horarios[idx]) horarios[idx] = dados.hora || "09:00";
      return { ...p, diasSelecionados: dias, horariosPorDia: horarios };
    });
  };

  const setHorarioDia = (idx, hora) => {
    setPacote((p) => ({ ...p, horariosPorDia: { ...p.horariosPorDia, [idx]: hora } }));
  };

  const toggleDiaRec = (idx) => {
    setRecorrencia((r) => {
      const dias = r.diasSelecionados.includes(idx)
        ? r.diasSelecionados.filter((d) => d !== idx)
        : [...r.diasSelecionados, idx];
      const horarios = { ...r.horariosPorDia };
      if (!dias.includes(idx)) delete horarios[idx];
      if (dias.includes(idx) && !horarios[idx]) horarios[idx] = dados.hora || "09:00";
      return { ...r, diasSelecionados: dias, horariosPorDia: horarios };
    });
  };

  const setHorarioDiaRec = (idx, hora) => {
    setRecorrencia((r) => ({ ...r, horariosPorDia: { ...r.horariosPorDia, [idx]: hora } }));
  };

  const handleCriarSala = async () => {
    if (!novaSalaNome.trim()) return;
    setSalvandoSala(true);
    try {
      await criarSala(workspaceId, { nome: novaSalaNome.trim(), cor: "#4285f4" });
      const novaLista = await listarSalas(workspaceId);
      setSalas(novaLista);
      const criada = novaLista.find(s => s.nome === novaSalaNome.trim());
      if (criada) setDados(d => ({ ...d, salaId: criada.id }));
      setCriandoSala(false);
      setNovaSalaNome("");
    } catch (err) {
      alert("Erro ao criar sala: " + err.message);
    } finally {
      setSalvandoSala(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((d) => ({ ...d, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!dados.pacienteId) { setErro("Selecione ou crie um cliente."); return; }
    if (!dados.data) { setErro("Selecione a data de início."); return; }
    if (dados.hora && temConflito(dados.data, dados.hora)) {
      setErro("Este horário já está ocupado. Escolha outro horário ou sala.");
      return;
    }

    const permissao = checar("agendamentos");
    if (!permissao.permitido) { setErro(permissao.motivo); return; }

    const extraCampos = {
      salaId: dados.salaId || null,
      salaNome: salas.find(s => s.id === dados.salaId)?.nome || null,
      salaCor: salas.find(s => s.id === dados.salaId)?.cor || null,
      profissionalId: dados.profissionalId || user.uid,
      profissionalNome: profissionais.find(p => p.id === dados.profissionalId)?.nome || null,
      procedimentoId: dados.procedimentoId || null,
      procedimentoNome: dados.procedimentoNome || null,
    };

    if (emPacote) {
      if (pacote.diasSelecionados.length === 0) { setErro("Selecione ao menos um dia da semana para o pacote."); return; }
      if (previewSessoes.length === 0) { setErro("Não foi possível gerar as datas do pacote."); return; }
      setCarregando(true);
      try {
        const valorTotal = pacote.valorTotal ? parseFloat(pacote.valorTotal) : null;
        const valorPorSessao = valorTotal ? valorTotal / pacote.numSessoes : null;
        await marcarSessoesEmLote(
          workspaceId,
          dados.pacienteId,
          previewSessoes.map((s) => ({
            ...s,
            duracao: parseInt(dados.duracao),
            linkAtendimento: dados.linkAtendimento || null,
            observacoes: dados.observacoes,
            ...extraCampos,
          })),
          {
            valorTotal,
            valorPorSessao,
            numSessoes: pacote.numSessoes,
            quitado: pacote.quitado,
          }
        );
        navigate("/agenda");
      } catch (err) {
        setErro("Erro ao criar pacote: " + err.message);
      } finally {
        setCarregando(false);
      }
    } else if (emRecorrencia) {
      if (recorrencia.diasSelecionados.length === 0) { setErro("Selecione ao menos um dia da semana para a recorrência."); return; }
      if (previewRecorrencia.length === 0) { setErro("Não foi possível gerar as datas da recorrência."); return; }
      setCarregando(true);
      try {
        const recorrenciaId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await marcarSessoesRecorrentes(
          workspaceId,
          dados.pacienteId,
          previewRecorrencia.map((s) => ({
            ...s,
            duracao: parseInt(dados.duracao),
            linkAtendimento: dados.linkAtendimento || null,
            observacoes: dados.observacoes,
            ...extraCampos,
          })),
          recorrenciaId,
          { valor: recorrencia.valor ? parseFloat(recorrencia.valor) : null }
        );
        navigate("/agenda");
      } catch (err) {
        setErro("Erro ao criar recorrência: " + err.message);
      } finally {
        setCarregando(false);
      }
    } else {
      if (!dados.hora) { setErro("Selecione o horário."); return; }
      setCarregando(true);
      try {
        await marcarSessao(workspaceId, dados.pacienteId, {
          data: dados.data,
          hora: dados.hora,
          duracao: parseInt(dados.duracao),
          valor: dados.valor ? parseFloat(dados.valor) : null,
          linkAtendimento: dados.linkAtendimento || null,
          observacoes: dados.observacoes,
          ...extraCampos,
        });
        navigate("/agenda");
      } catch (err) {
        setErro("Erro ao marcar sessão: " + err.message);
      } finally {
        setCarregando(false);
      }
    }
  };

  const conflitosCount = previewSessoes.filter(s => temConflito(s.data, s.hora)).length;

  return (
    <div className="form-container">
      <div className="form-box" style={{ maxWidth: (emPacote || emRecorrencia) ? 700 : 580 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button type="button" onClick={() => navigate("/agenda")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}>←</button>
          <h2 style={{ margin: 0 }}>Marcar Nova Sessão</h2>
        </div>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Seletor de paciente ── */}
          <div className="form-group">
            <label>Cliente <span className="obrigatorio">*</span></label>
            <div className="ms-pac-wrapper" ref={buscaRef}>
              <div className={`ms-pac-field${dados.pacienteId ? " selecionado" : ""}`}>
                <span className="ms-pac-icone">👤</span>
                <input
                  className="ms-pac-input"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setDropdownAberto(true);
                    if (!e.target.value) limparPaciente();
                  }}
                  onFocus={() => setDropdownAberto(true)}
                  autoComplete="off"
                />
                {dados.pacienteId && (
                  <button type="button" className="ms-pac-limpar" onClick={limparPaciente}>✕</button>
                )}
              </div>
              {dados.pacienteId && !dropdownAberto && (
                <div className="ms-pac-tag">✅ <strong>{dados.pacienteNome}</strong> selecionado(a)</div>

              )}
              {dropdownAberto && !criandoPaciente && (
                <div className="ms-pac-dropdown">
                  {pacientesFiltrados.length === 0 && busca && (
                    <div className="ms-pac-vazio">Nenhum cliente encontrado para "{busca}"</div>
                  )}
                  {pacientesFiltrados.map((p) => (
                    <button key={p.id} type="button" className="ms-pac-item" onClick={() => selecionarPaciente(p)}>
                      <span className="ms-pac-item-nome">{p.nome}</span>
                      {p.telefone && <span className="ms-pac-item-tel">{p.telefone}</span>}
                    </button>
                  ))}
                  <button type="button" className="ms-pac-novo-btn" onClick={abrirCriacao}>
                    <span className="ms-pac-novo-icone">+</span>Criar novo cliente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Criar novo paciente inline ── */}
          {criandoPaciente && (
            <div className="ms-novo-pac-panel">
              <div className="ms-novo-pac-header">
                <h4 className="ms-novo-pac-titulo">Novo Cliente</h4>
                <button type="button" className="ms-novo-pac-fechar" onClick={() => setCriandoPaciente(false)}>✕</button>
              </div>
              {erroPac && <div className="erro-message" style={{ margin: "0 0 12px" }}>{erroPac}</div>}
              <div className="ms-novo-pac-form">
                <div className="form-group">
                  <label>Nome completo <span className="obrigatorio">*</span></label>
                  <input type="text" name="nome" value={novoPac.nome} onChange={handleNovoPac} placeholder="Nome do cliente" autoFocus />
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="form-group"><label>Telefone</label>
                    <input type="tel" name="telefone" value={novoPac.telefone} onChange={handleNovoPac} placeholder="(00) 00000-0000" /></div>
                  <div className="form-group"><label>E-mail</label>
                    <input type="email" name="email" value={novoPac.email} onChange={handleNovoPac} placeholder="email@exemplo.com" /></div>
                </div>
                <div className="form-group"><label>Data de nascimento</label>
                  <input type="date" name="dataNascimento" value={novoPac.dataNascimento} onChange={handleNovoPac} /></div>
                <div className="form-group"><label>Observações</label>
                  <textarea name="observacoes" value={novoPac.observacoes} onChange={handleNovoPac} rows={2} placeholder="Observações iniciais..." /></div>
              </div>
              <div className="ms-novo-pac-acoes">
                <button type="button" className="btn-cancelar" onClick={() => setCriandoPaciente(false)}>Cancelar</button>
                <button type="button" className="btn-salvar" onClick={criarPaciente} disabled={salvandoPac}>
                  {salvandoPac ? "Criando..." : "✓ Criar e selecionar"}
                </button>
              </div>
            </div>
          )}

          {/* ── Sala e Profissional ── */}
          <div className="form-row" style={{ gridTemplateColumns: profissionais.length > 0 && role === "owner" ? "1fr 1fr" : "1fr" }}>
            {/* Sala */}
            <div className="form-group">
              <div className="ms-sala-label-row">
                <label htmlFor="salaId">🚪 Sala</label>
                {!criandoSala && (
                  <button type="button" className="ms-sala-novo-btn" onClick={() => { setCriandoSala(true); setNovaSalaNome(""); }}>
                    + Nova sala
                  </button>
                )}
              </div>
              {criandoSala ? (
                <div className="ms-sala-criar-row">
                  <input
                    className="ms-sala-input"
                    placeholder="Nome da sala"
                    value={novaSalaNome}
                    onChange={(e) => setNovaSalaNome(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCriarSala(); }
                      if (e.key === "Escape") setCriandoSala(false);
                    }}
                  />
                  <button
                    type="button"
                    className="ms-sala-salvar"
                    onClick={handleCriarSala}
                    disabled={!novaSalaNome.trim() || salvandoSala}
                  >{salvandoSala ? "…" : "✓"}</button>
                  <button type="button" className="ms-sala-cancelar" onClick={() => setCriandoSala(false)}>✕</button>
                </div>
              ) : (
                <select id="salaId" name="salaId" value={dados.salaId} onChange={handleChange}>
                  <option value="">Sem sala específica</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Profissional */}
            {profissionais.length > 0 && role === "owner" && (
              <div className="form-group">
                <label htmlFor="profissionalId">👤 Profissional</label>
                <select
                  id="profissionalId"
                  name="profissionalId"
                  value={dados.profissionalId}
                  onChange={e => {
                    handleChange(e);
                    // Limpa procedimento ao trocar profissional
                    setDados(d => ({ ...d, procedimentoId: "", procedimentoNome: "" }));
                  }}
                >
                  <option value="">Eu mesmo</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Procedimento (se profissional selecionado tem procedimentos) ── */}
          {(() => {
            const profSel = profissionais.find(p => p.id === dados.profissionalId);
            const procs = profSel?.procedimentos || [];
            if (!profSel || procs.length === 0) return null;
            return (
              <div className="form-group">
                <label>🩺 Tipo de procedimento</label>
                <select
                  value={dados.procedimentoId || ""}
                  onChange={e => {
                    const proc = procs.find(p => p.id === e.target.value);
                    setDados(d => ({
                      ...d,
                      procedimentoId: proc?.id || "",
                      procedimentoNome: proc?.nome || "",
                      duracao: proc ? String(proc.duracao) : d.duracao,
                      valor: proc?.valor ? String(proc.valor) : d.valor,
                    }));
                  }}
                >
                  <option value="">Selecione o procedimento</option>
                  {procs.map(proc => (
                    <option key={proc.id} value={proc.id}>
                      {proc.nome}{proc.duracao ? ` — ${proc.duracao}min` : ""}{proc.valor ? ` — R$ ${Number(proc.valor).toFixed(2).replace(".",",")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* ── Toggle: modo de sessão ── */}
          <div className="ms-modo-toggle">
            <button
              type="button"
              className={`ms-modo-btn${modoSessao === "unica" ? " ativo" : ""}`}
              onClick={() => setModoSessao("unica")}
            >Sessão única</button>
            <button
              type="button"
              className={`ms-modo-btn${modoSessao === "pacote" ? " ativo" : ""}`}
              onClick={() => setModoSessao("pacote")}
            >📦 Pacote</button>
            <button
              type="button"
              className={`ms-modo-btn${modoSessao === "recorrencia" ? " ativo" : ""}`}
              onClick={() => setModoSessao("recorrencia")}
            >🔁 Recorrência</button>
          </div>

          {/* ── Campos comuns ── */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data">
                {emPacote ? "Data de início" : emRecorrencia ? "Data de início" : "Data"} <span className="obrigatorio">*</span>
              </label>
              <input type="date" id="data" name="data" value={dados.data} onChange={handleChange} required />
            </div>
            {!emPacote && !emRecorrencia && (
              <div className="form-group">
                <label htmlFor="hora">Hora <span className="obrigatorio">*</span></label>
                <input type="time" id="hora" name="hora" value={dados.hora} onChange={handleChange} />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="duracao">Duração</label>
              <select id="duracao" name="duracao" value={dados.duracao} onChange={handleChange}>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1h 30min</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>

          {/* ── Painel do Pacote ── */}
          {emPacote && (
            <div className="ms-pacote-panel">
              <h4 className="ms-pacote-titulo">📦 Configurar Pacote</h4>

              <div className="form-group">
                <label>Dias da semana <span className="obrigatorio">*</span></label>
                <div className="ms-dias-grid">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d.idx}
                      type="button"
                      className={`ms-dia-btn${pacote.diasSelecionados.includes(d.idx) ? " ativo" : ""}`}
                      onClick={() => toggleDia(d.idx)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {pacote.diasSelecionados.length > 0 && (
                <div className="form-group">
                  <label>Horários por dia</label>
                  <div className="ms-horarios-grid">
                    {DIAS_SEMANA
                      .filter(d => pacote.diasSelecionados.includes(d.idx))
                      .map(d => (
                        <div key={d.idx} className="ms-horario-row">
                          <span className="ms-horario-dia">{d.abrev}</span>
                          <input
                            type="time"
                            className="ms-horario-input"
                            value={pacote.horariosPorDia[d.idx] || "09:00"}
                            onChange={(e) => setHorarioDia(d.idx, e.target.value)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="form-group">
                  <label>Nº de sessões <span className="obrigatorio">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={pacote.numSessoes}
                    onChange={(e) => setPacote(p => ({ ...p, numSessoes: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Valor total (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 1200,00"
                    value={pacote.valorTotal}
                    onChange={(e) => setPacote(p => ({ ...p, valorTotal: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center" }}>
                  <label className="ms-quitado-label">
                    <input
                      type="checkbox"
                      checked={pacote.quitado}
                      onChange={(e) => setPacote(p => ({ ...p, quitado: e.target.checked }))}
                    />
                    Pacote quitado
                  </label>
                </div>
              </div>

              {previewSessoes.length > 0 && (
                <div className="ms-preview">
                  <div className="ms-preview-header">
                    <span>📅 Prévia das {previewSessoes.length} sessões</span>
                    {conflitosCount > 0 && (
                      <span className="ms-conflito-badge">⚠️ {conflitosCount} conflito{conflitosCount > 1 ? "s" : ""}</span>
                    )}
                    {pacote.valorTotal && (
                      <span className="ms-preview-valor">
                        R$ {(parseFloat(pacote.valorTotal) / pacote.numSessoes).toFixed(2).replace(".", ",")} / sessão
                      </span>
                    )}
                  </div>
                  <div className="ms-preview-lista">
                    {previewSessoes.map((s, i) => {
                      const conflito = temConflito(s.data, s.hora);
                      const [y, m, d] = s.data.split("-").map(Number);
                      const dataFmt = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
                        weekday: "short", day: "numeric", month: "short"
                      });
                      const editando = editandoSessaoIdx === i;
                      return (
                        <div key={i} className={`ms-preview-item${conflito ? " conflito" : ""}${editando ? " editando" : ""}`}>
                          <span className="ms-preview-num">{i + 1}</span>
                          {editando ? (
                            <>
                              <input
                                type="date"
                                className="ms-edit-input"
                                value={editSessaoData}
                                onChange={(e) => setEditSessaoData(e.target.value)}
                              />
                              <input
                                type="time"
                                className="ms-edit-input ms-edit-hora"
                                value={editSessaoHora}
                                onChange={(e) => setEditSessaoHora(e.target.value)}
                              />
                              <button
                                type="button"
                                className="ms-edit-salvar"
                                onClick={() => {
                                  if (!editSessaoData || !editSessaoHora) return;
                                  setPreviewSessoes(prev => prev.map((ps, pi) =>
                                    pi === i ? { ...ps, data: editSessaoData, hora: editSessaoHora } : ps
                                  ));
                                  setEditandoSessaoIdx(null);
                                }}
                              >✓</button>
                              <button
                                type="button"
                                className="ms-edit-cancelar"
                                onClick={() => setEditandoSessaoIdx(null)}
                              >✕</button>
                            </>
                          ) : (
                            <>
                              <span className="ms-preview-data">{dataFmt}</span>
                              <span className="ms-preview-hora">{s.hora}</span>
                              {conflito && <span className="ms-preview-conflito">⚠️ Horário ocupado</span>}
                              <button
                                type="button"
                                className="ms-edit-btn"
                                title="Editar data/hora"
                                onClick={() => {
                                  setEditandoSessaoIdx(i);
                                  setEditSessaoData(s.data);
                                  setEditSessaoHora(s.hora);
                                }}
                              >✏️</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {conflitosCount > 0 && (
                    <p className="ms-conflito-aviso">
                      ⚠️ {conflitosCount} sessão(ões) com conflito de horário. O sistema criará todas — você pode reagendar depois.
                    </p>
                  )}
                </div>
              )}

              {emPacote && pacote.diasSelecionados.length === 0 && (
                <p className="ms-pacote-hint">👆 Selecione os dias da semana para ver a prévia das sessões.</p>
              )}
            </div>
          )}

          {!emPacote && !emRecorrencia && (
            <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="form-group">
                <label htmlFor="valor">Valor da sessão (R$)</label>
                <input type="number" id="valor" name="valor" placeholder="Ex: 150,00" value={dados.valor} onChange={handleChange} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label htmlFor="linkAtendimento">Link online</label>
                <input type="url" id="linkAtendimento" name="linkAtendimento" placeholder="https://meet.google.com/..." value={dados.linkAtendimento} onChange={handleChange} />
              </div>
            </div>
          )}

          {(emPacote || emRecorrencia) && (
            <div className="form-group">
              <label htmlFor="linkAtendimento">Link de atendimento online (opcional)</label>
              <input type="url" id="linkAtendimento" name="linkAtendimento" placeholder="https://meet.google.com/..." value={dados.linkAtendimento} onChange={handleChange} />
            </div>
          )}

          {/* ── Painel de Recorrência ── */}
          {emRecorrencia && (
            <div className="ms-pacote-panel">
              <h4 className="ms-pacote-titulo">🔁 Configurar Recorrência</h4>

              <div className="form-group">
                <label>Dias da semana <span className="obrigatorio">*</span></label>
                <div className="ms-dias-grid">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d.idx}
                      type="button"
                      className={`ms-dia-btn${recorrencia.diasSelecionados.includes(d.idx) ? " ativo" : ""}`}
                      onClick={() => toggleDiaRec(d.idx)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {recorrencia.diasSelecionados.length > 0 && (
                <div className="form-group">
                  <label>Horários por dia</label>
                  <div className="ms-horarios-grid">
                    {DIAS_SEMANA
                      .filter(d => recorrencia.diasSelecionados.includes(d.idx))
                      .map(d => (
                        <div key={d.idx} className="ms-horario-row">
                          <span className="ms-horario-dia">{d.abrev}</span>
                          <input
                            type="time"
                            className="ms-horario-input"
                            value={recorrencia.horariosPorDia[d.idx] || "09:00"}
                            onChange={(e) => setHorarioDiaRec(d.idx, e.target.value)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="form-group">
                  <label>Gerar para os próximos (meses) <span className="obrigatorio">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={recorrencia.meses}
                    onChange={(e) => setRecorrencia(r => ({ ...r, meses: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Valor por sessão (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 150,00"
                    value={recorrencia.valor}
                    onChange={(e) => setRecorrencia(r => ({ ...r, valor: e.target.value }))}
                  />
                </div>
              </div>

              {previewRecorrencia.length > 0 && (
                <div className="ms-preview">
                  <div className="ms-preview-header">
                    <span>📅 {previewRecorrencia.length} sessões geradas ({recorrencia.meses} {recorrencia.meses === 1 ? "mês" : "meses"})</span>
                    {previewRecorrencia.filter(s => temConflito(s.data, s.hora)).length > 0 && (
                      <span className="ms-conflito-badge">
                        ⚠️ {previewRecorrencia.filter(s => temConflito(s.data, s.hora)).length} conflito(s)
                      </span>
                    )}
                  </div>
                  <div className="ms-preview-lista">
                    {previewRecorrencia.slice(0, 8).map((s, i) => {
                      const conflito = temConflito(s.data, s.hora);
                      const [y, m, d] = s.data.split("-").map(Number);
                      const dataFmt = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
                        weekday: "short", day: "numeric", month: "short"
                      });
                      return (
                        <div key={i} className={`ms-preview-item${conflito ? " conflito" : ""}`}>
                          <span className="ms-preview-num">{i + 1}</span>
                          <span className="ms-preview-data">{dataFmt}</span>
                          <span className="ms-preview-hora">{s.hora}</span>
                          {conflito && <span className="ms-preview-conflito">⚠️ Horário ocupado</span>}
                        </div>
                      );
                    })}
                    {previewRecorrencia.length > 8 && (
                      <div className="ms-preview-item" style={{ justifyContent: "center", color: "#666", fontStyle: "italic" }}>
                        ... e mais {previewRecorrencia.length - 8} sessão(ões)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {emRecorrencia && recorrencia.diasSelecionados.length === 0 && (
                <p className="ms-pacote-hint">👆 Selecione os dias da semana para ver a prévia das sessões.</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" placeholder="Observações sobre a sessão..." value={dados.observacoes} onChange={handleChange} rows="3" />
          </div>

          <div className="form-buttons">
            <button type="button" className="btn-cancelar" onClick={() => navigate("/agenda")}>Cancelar</button>
            <button type="submit" disabled={carregando || criandoPaciente} className="btn-salvar">
              {carregando
                ? (emPacote ? "Criando pacote..." : emRecorrencia ? "Criando recorrência..." : "Marcando...")
                : emPacote
                  ? `Criar ${previewSessoes.length || pacote.numSessoes} sessões`
                  : emRecorrencia
                    ? `Criar ${previewRecorrencia.length} sessões recorrentes`
                    : "Marcar Sessão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarcarSessao;
