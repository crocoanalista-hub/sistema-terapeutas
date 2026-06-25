import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { marcarSessao } from "../../services/agendamentosService";
import { listarPacientes, adicionarPaciente } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";
import "../../styles/marcar-sessao.css";

const VAZIO_PAC = { nome: "", telefone: "", email: "", dataNascimento: "", observacoes: "" };

const MarcarSessao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buscaRef = useRef(null);

  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [criandoPaciente, setCriandoPaciente] = useState(false);
  const [novoPac, setNovoPac] = useState(VAZIO_PAC);
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [erroPac, setErroPac] = useState("");

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
  });

  useEffect(() => {
    if (user) carregarPacientes();
  }, [user]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (buscaRef.current && !buscaRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const carregarPacientes = async () => {
    try {
      const lista = await listarPacientes(user.uid);
      setPacientes(lista);
    } catch (err) {
      setErro("Erro ao carregar pacientes: " + err.message);
    }
  };

  // ─── Seleção de paciente ──────────────────────────────────
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

  // ─── Criar novo paciente inline ───────────────────────────
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
      const id = await adicionarPaciente(user.uid, {
        nome: novoPac.nome.trim(),
        telefone: novoPac.telefone.trim(),
        email: novoPac.email.trim(),
        dataNascimento: novoPac.dataNascimento,
        observacoes: novoPac.observacoes.trim(),
      });
      await carregarPacientes();
      // Auto-seleciona o paciente recém-criado
      setDados((d) => ({ ...d, pacienteId: id, pacienteNome: novoPac.nome.trim() }));
      setBusca(novoPac.nome.trim());
      setCriandoPaciente(false);
    } catch (err) {
      setErroPac("Erro ao criar paciente: " + err.message);
    } finally {
      setSalvandoPac(false);
    }
  };

  // ─── Agendamento ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((d) => ({ ...d, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (!dados.pacienteId) { setErro("Selecione ou crie um paciente."); return; }
    if (!dados.data || !dados.hora) { setErro("Preencha data e hora."); return; }

    setCarregando(true);
    try {
      await marcarSessao(user.uid, dados.pacienteId, {
        data: dados.data,
        hora: dados.hora,
        duracao: parseInt(dados.duracao),
        valor: dados.valor ? parseFloat(dados.valor) : null,
        linkAtendimento: dados.linkAtendimento || null,
        observacoes: dados.observacoes,
      });
      navigate("/agenda");
    } catch (err) {
      setErro("Erro ao marcar sessão: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-box">
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button type="button" onClick={() => navigate("/agenda")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}>
            ←
          </button>
          <h2 style={{ margin: 0 }}>Marcar Nova Sessão</h2>
        </div>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ── Seletor de paciente ── */}
          <div className="form-group">
            <label>Paciente <span className="obrigatorio">*</span></label>

            <div className="ms-pac-wrapper" ref={buscaRef}>
              {/* Campo de busca */}
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
                  <button type="button" className="ms-pac-limpar" onClick={limparPaciente} title="Remover seleção">✕</button>
                )}
              </div>

              {/* Tag do paciente selecionado */}
              {dados.pacienteId && !dropdownAberto && (
                <div className="ms-pac-tag">
                  ✅ <strong>{dados.pacienteNome}</strong> selecionado(a)
                </div>
              )}

              {/* Dropdown */}
              {dropdownAberto && !criandoPaciente && (
                <div className="ms-pac-dropdown">
                  {pacientesFiltrados.length === 0 && busca && (
                    <div className="ms-pac-vazio">Nenhum paciente encontrado para "{busca}"</div>
                  )}
                  {pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="ms-pac-item"
                      onClick={() => selecionarPaciente(p)}
                    >
                      <span className="ms-pac-item-nome">{p.nome}</span>
                      {p.telefone && <span className="ms-pac-item-tel">{p.telefone}</span>}
                    </button>
                  ))}
                  <button type="button" className="ms-pac-novo-btn" onClick={abrirCriacao}>
                    <span className="ms-pac-novo-icone">+</span>
                    Criar novo paciente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Painel: criar novo paciente ── */}
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
                  <div className="form-group">
                    <label>Telefone</label>
                    <input type="tel" name="telefone" value={novoPac.telefone} onChange={handleNovoPac} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" name="email" value={novoPac.email} onChange={handleNovoPac} placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Data de nascimento</label>
                  <input type="date" name="dataNascimento" value={novoPac.dataNascimento} onChange={handleNovoPac} />
                </div>
                <div className="form-group">
                  <label>Observações</label>
                  <textarea name="observacoes" value={novoPac.observacoes} onChange={handleNovoPac} rows={2} placeholder="Observações iniciais..." />
                </div>
              </div>

              <div className="ms-novo-pac-acoes">
                <button type="button" className="btn-cancelar" onClick={() => setCriandoPaciente(false)}>Cancelar</button>
                <button type="button" className="btn-salvar" onClick={criarPaciente} disabled={salvandoPac}>
                  {salvandoPac ? "Criando..." : "✓ Criar e selecionar"}
                </button>
              </div>
            </div>
          )}

          {/* ── Campos da sessão ── */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data">Data <span className="obrigatorio">*</span></label>
              <input type="date" id="data" name="data" value={dados.data} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="hora">Hora <span className="obrigatorio">*</span></label>
              <input type="time" id="hora" name="hora" value={dados.hora} onChange={handleChange} required />
            </div>
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

          <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="form-group">
              <label htmlFor="valor">Valor da sessão (R$)</label>
              <input type="number" id="valor" name="valor" placeholder="Ex: 150,00" value={dados.valor} onChange={handleChange} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label htmlFor="linkAtendimento">Link de atendimento online</label>
              <input type="url" id="linkAtendimento" name="linkAtendimento" placeholder="https://meet.google.com/..." value={dados.linkAtendimento} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" placeholder="Observações sobre a sessão..." value={dados.observacoes} onChange={handleChange} rows="3" />
          </div>

          <div className="form-buttons">
            <button type="button" className="btn-cancelar" onClick={() => navigate("/agenda")}>Cancelar</button>
            <button type="submit" disabled={carregando || criandoPaciente} className="btn-salvar">
              {carregando ? "Marcando..." : "Marcar Sessão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarcarSessao;
