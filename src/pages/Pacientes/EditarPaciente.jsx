import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buscarPaciente, atualizarPaciente } from "../../services/pacientesService";
import "../../styles/forms.css";

const EditarPaciente = () => {
  
  const navigate = useNavigate();
  const { id } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [dados, setDados] = useState({
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
    observacoes: "",
  });

  useEffect(() => {
    carregarPaciente();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarPaciente = async () => {
    try {
      setCarregando(true);
      const paciente = await buscarPaciente(id);
      if (paciente) {
        setDados(paciente);
      }
    } catch (err) {
      setErro("Erro ao carregar paciente: " + err.message);
    } finally {
      setCarregando(false);
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

    if (!dados.nome || !dados.email || !dados.telefone) {
      setErro("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      await atualizarPaciente(id, dados);
      alert("Cliente atualizado com sucesso!");
      navigate("/pacientes");
    } catch (err) {
      setErro("Erro ao atualizar paciente: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-box">
        <h2>Editar Cliente</h2>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nome">
              Nome <span className="obrigatorio">*</span>
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              placeholder="Nome completo"
              value={dados.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">
                E-mail <span className="obrigatorio">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="email@example.com"
                value={dados.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefone">
                Telefone <span className="obrigatorio">*</span>
              </label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                placeholder="(11) 99999-8888"
                value={dados.telefone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dataNascimento">Data de Nascimento</label>
            <input
              type="date"
              id="dataNascimento"
              name="dataNascimento"
              value={dados.dataNascimento}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              placeholder="Adicione observações importantes sobre o paciente"
              value={dados.observacoes}
              onChange={handleChange}
              rows="4"
            ></textarea>
          </div>

          <div className="form-buttons">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/pacientes")}
            >
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="btn-salvar">
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPaciente;
