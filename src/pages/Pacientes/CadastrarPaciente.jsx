import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adicionarPaciente } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/forms.css";

const CadastrarPaciente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [dados, setDados] = useState({
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
    observacoes: "",
  });

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

    // Validação básica
    if (!dados.nome || !dados.email || !dados.telefone) {
      setErro("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setCarregando(true);
    try {
      await adicionarPaciente(user.uid, dados);
      alert("Paciente cadastrado com sucesso!");
      navigate("/pacientes");
    } catch (err) {
      setErro("Erro ao cadastrar paciente: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-box">
        <h2>Cadastrar Novo Paciente</h2>

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
            <button type="submit" disabled={carregando} className="btn-salvar">
              {carregando ? "Cadastrando..." : "Cadastrar Paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CadastrarPaciente;
