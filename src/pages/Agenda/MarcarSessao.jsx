import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { marcarSessao, marcarSessoesEmLote, listarAgendamentos } from "../../services/agendamentosService";
import { listarPacientes, adicionarPaciente } from "../../services/pacientesService";
import { listarSalas } from "../../services/salasService";
import { listarProfissionais } from "../../services/profissionaisService";
import { useAuth } from "../../hooks/useAuth";
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

const MarcarSessao = () => {
  const { user, workspaceId, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buscaRef = useRef(null);

  const [pacientes, setPacientes] = useState([]);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);
  const [salas, setSalas] = useState([]);
  const [profissionais, setProfissionais] = useState([]);

  const [busca, setBusca] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [criandoPaciente, setCriandoPaciente] = useState(false);
  const [novoPac, setNovoPac] = useState(VAZIO_PAC);
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [erroPac, setErroPac] = useState("");

  const [emPacote, setEmPacote] = useState(false);
  const [pacote, setPacote] = useState({
    diasSelecionados: [],
    horariosPorDia: {},
    numSessoes: 8,
    valorTotal: "",
    quitado: false,
  });
  const [previewSessoes, setPreviewSessoes] = useState([]);
  // Edição inline de sessão na prévia
  const [editandoSessaoIdx, setEditandoSessaoIdx] = useState(null);
  const [editSessaoData, setEditSessaoData] = useState("");
  const [editSessaoHora, setEditSessaoHora] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const dataParam = searchParams.get("data") || "";

  const [dados, setDados] = useState({
    pacienteId: "",
    pacienteNome: "",
    data: dataParam,
    hora: "",
    duracao: "60",
    valor: "",
    linkAtendimento: "",
    observacoes: "",
    salaId: "",
    profissionalId: "",
  });

  useEffect(() => {
    if (!workspaceId) return;
    carregarPacientes();
    listarAgendamentos(workspaceId).then(setAgendamentosExistentes).catch(() => {});
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

  const carregarPacientes = async () => {
    try {
      setPacientes(await listarPacientes(workspaceId));
    } catch (err) {
      setErro("Erro ao carregar pacientes: " + err.message);
    }
  };

  const temConflito = (data, hora) =>
    agendamentosExistentes.some(
      (a) => a.data === data && a.hora === hora && a.status !== "cancelado"
    );

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
      setErroPac("Erro ao criar paciente: " + err.message);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((d) => ({ ...d, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!dados.pacienteId) { setErro("Selecione ou crie um paciente."); return; }
    if (!dados.data) { setErro("Selecione a data de início."); return; }

    const extraCampos = {
      salaId: dados.salaId || null,
      salaNome: salas.find(s => s.id === dados.salaId)?.nome || null,
      salaCor: salas.find(s => s.id === dados.salaId)?.cor || null,
      profissionalId: dados.profissionalId || user.uid,
      profissionalNome: profissionais.find(p => p.id === dados.profissionalId)?.nome || null,
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
      <div className="form-box" style={{ maxWidth: emPacote ? 700 : 580 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button type="button" onClick={() => navigate("/agenda")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}>←</button>
          <h2 style={{ margin: 0 }}>Marcar Nova Sessão</h2>
        </div>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Seletor de paciente ── */}
          <div className="form-group">
            <label>Paciente <span className="obrigatorio">*</span></label>
            <div className="ms-pac-wrapper" ref={buscaRef}>
              <div className={`ms-pac-field${dados.pacienteId ? " selecionado" : ""}`}>
                <span className="ms-pac-icone">👤</span>
                <input
                  className="ms-pac-input"
                  placeholder="Buscar paciente..."
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
                    <div className="ms-pac-vazio">Nenhum paciente encontrado para "{busca}"</div>
                  )}
                  {pacientesFiltrados.map((p) => (
                    <button key={p.id} type="button" className="ms-pac-item" onClick={() => selecionarPaciente(p)}>
                      <span className="ms-pac-item-nome">{p.nome}</span>
                      {p.telefone && <span className="ms-pac-item-tel">{p.telefone}</span>}
                    </button>
                  ))}
                  <button type="button" className="ms-pac-novo-btn" onClick={abrirCriacao}>
                    <span className="ms-pac-novo-icone">+</span>Criar novo paciente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Criar novo paciente inline ── */}
          {criandoPaciente && (
            <div className="ms-novo-pac-panel">
              <div className="ms-novo-pac-header">
                <h4 className="ms-novo-pac-titulo">Novo Paciente</h4>
                <button type="button" className="ms-novo-pac-fechar" onClick={() => setCriandoPaciente(false)}>✕</button>
              </div>
              {erroPac && <div className="erro-message" style={{ margin: "0 0 12px" }}>{erroPac}</div>}
              <div className="ms-novo-pac-form">
                <div className="form-group">
                  <label>Nome completo <span className="obrigatorio">*</span></label>
                  <input type="text" name="nome" value={novoPac.nome} onChange={handleNovoPac} placeholder="Nome do paciente" autoFocus />
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
          {(salas.length > 0 || profissionais.length > 0) && (
            <div className="form-row" style={{ gridTemplateColumns: salas.length > 0 && profissionais.length > 0 ? "1fr 1fr" : "1fr" }}>
              {salas.length > 0 && (
                <div className="form-group">
                  <label htmlFor="salaId">🚪 Sala</label>
                  <select id="salaId" name="salaId" value={dados.salaId} onChange={handleChange}>
                    <option value="">Sem sala específica</option>
                    {salas.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              {profissionais.length > 0 && role === "owner" && (
                <div className="form-group">
                  <label htmlFor="profissionalId">👤 Profissional</label>
                  <select id="profissionalId" name="profissionalId" value={dados.profissionalId} onChange={handleChange}>
                    <option value="">Eu mesmo</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Toggle: Sessão em Pacote ── */}
          <div className="ms-pacote-toggle">
            <label className="ms-pacote-toggle-label">
              <input
                type="checkbox"
                checked={emPacote}
                onChange={(e) => setEmPacote(e.target.checked)}
              />
              <span className="ms-pacote-toggle-texto">
                📦 Sessão em Pacote
                <span className="ms-pacote-toggle-dica">Cria múltiplas sessões de uma vez</span>
              </span>
            </label>
          </div>

          {/* ── Campos comuns ── */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data">
                {emPacote ? "Data de início" : "Data"} <span className="obrigatorio">*</span>
              </label>
              <input type="date" id="data" name="data" value={dados.data} onChange={handleChange} required />
            </div>
            {!emPacote && (
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

          {!emPacote && (
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

          {emPacote && (
            <div className="form-group">
              <label htmlFor="linkAtendimento">Link de atendimento online (opcional)</label>
              <input type="url" id="linkAtendimento" name="linkAtendimento" placeholder="https://meet.google.com/..." value={dados.linkAtendimento} onChange={handleChange} />
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
                ? (emPacote ? "Criando pacote..." : "Marcando...")
                : emPacote
                  ? `Criar ${previewSessoes.length || pacote.numSessoes} sessões`
                  : "Marcar Sessão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarcarSessao;
