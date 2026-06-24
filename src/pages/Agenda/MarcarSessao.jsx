import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { marcarSessao } from "../../services/agendamentosService";
import { listarPacientes } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";

const MarcarSessao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [dados, setDados] = useState({
    pacienteId: "",
    data: "",
    hora: "",
    duracao: "60",
    valor: "",
    linkAtendimento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (user) carregarPacientes();
  }, [user]);

  const carregarPacientes = async () => {
    try {
      const lista = await listarPacientes(user.uid);
      setPacientes(lista);
    } catch (err) {
      setErro("Erro ao carregar pacientes: " + err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!dados.pacienteId || !dados.data || !dados.hora) {
      setErro("Preencha os campos obrigatórios.");
      return;
    }

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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => navigate("/agenda")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "20px" }}
          >
            ←
          </button>
          <h2 style={{ margin: 0 }}>Marcar Nova Sessão</h2>
        </div>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pacienteId">
              Paciente <span className="obrigatorio">*</span>
            </label>
            <select
              id="pacienteId"
              name="pacienteId"
              value={dados.pacienteId}
              onChange={handleChange}
              required
            >
              <option value="">-- Selecione um paciente --</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data">
                Data <span className="obrigatorio">*</span>
              </label>
              <input
                type="date"
                id="data"
                name="data"
                value={dados.data}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="hora">
                Hora <span className="obrigatorio">*</span>
              </label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={dados.hora}
                onChange={handleChange}
                required
              />
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
              <input
                type="number"
                id="valor"
                name="valor"
                placeholder="Ex: 150,00"
                value={dados.valor}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label htmlFor="linkAtendimento">Link de atendimento online</label>
              <input
                type="url"
                id="linkAtendimento"
                name="linkAtendimento"
                placeholder="https://meet.google.com/..."
                value={dados.linkAtendimento}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              placeholder="Observações sobre a sessão..."
              value={dados.observacoes}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-buttons">
            <button type="button" className="btn-cancelar" onClick={() => navigate("/agenda")}>
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="btn-salvar">
              {carregando ? "Marcando..." : "Marcar Sessão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarcarSessao;
