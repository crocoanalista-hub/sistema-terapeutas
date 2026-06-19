import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// CORREÇÃO: Adicionado ../ extra em todos os imports abaixo
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
    observacoes: "",
  });

  useEffect(() => {
    if (user) {
      carregarPacientes();
    }
  }, [user]);

  const carregarPacientes = async () => {
    try {
      const dados = await listarPacientes(user.uid);
      setPacientes(dados);
    } catch (err) {
      setErro("Erro ao carregar pacientes: " + err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados({
      ...dados,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!dados.pacienteId || !dados.data || !dados.hora) {
      setErro("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setCarregando(true);
    try {
      await marcarSessao(user.uid, dados.pacienteId, {
        data: dados.data,
        hora: dados.hora,
        duracao: parseInt(dados.duracao),
        observacoes: dados.observacoes,
      });
      alert("Sessão marcada com sucesso!");
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
        <h2>Marcar Nova Sessão</h2>

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
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nome}
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
              <label htmlFor="duracao">Duração (minutos)</label>
              <select
                id="duracao"
                name="duracao"
                value={dados.duracao}
                onChange={handleChange}
              >
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora 30 minutos</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              placeholder="Adicione observações sobre a sessão"
              value={dados.observacoes}
              onChange={handleChange}
              rows="4"
            ></textarea>
          </div>

          <div className="form-buttons">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/agenda")}
            >
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