import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes, deletarPaciente } from "../../services/pacientesService";
import { buscarConfigFinanceira, statusAssinatura } from "../../services/pagamentosPacienteService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/pacientes.css";

const ASSIN_LABEL = { em_dia: "✅ Em dia", vencendo: "⚠️ Vencendo", vencido: "🔴 Vencido" };
const ASSIN_COR   = { em_dia: "#34a853", vencendo: "#f9ab00", vencido: "#ea4335" };

const ListaPacientes = () => {
  const { workspaceId } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [assinaturas, setAssinaturas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (workspaceId) {
      carregarPacientes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const carregarPacientes = async () => {
    try {
      setCarregando(true);
      const dados = await listarPacientes(workspaceId);
      setPacientes(dados);
      // Carrega assinaturas em paralelo
      const cfgs = await Promise.all(dados.map(p => buscarConfigFinanceira(p.id)));
      const mapa = {};
      dados.forEach((p, i) => { if (cfgs[i]?.assinatura?.ativa) mapa[p.id] = cfgs[i].assinatura; });
      setAssinaturas(mapa);
    } catch (err) {
      setErro("Erro ao carregar pacientes: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleEditar = (pacienteId) => {
    navigate(`/pacientes/${pacienteId}/editar`);
  };

  const handleDetalhes = (pacienteId) => {
    navigate(`/pacientes/${pacienteId}`);
  };

  const handleDeletar = async (pacienteId) => {
    if (window.confirm("Tem certeza que deseja deletar este paciente?")) {
      try {
        await deletarPaciente(pacienteId);
        setPacientes(pacientes.filter((p) => p.id !== pacienteId));
      } catch (err) {
        alert("Erro ao deletar paciente: " + err.message);
      }
    }
  };

  return (
    <div className="pacientes-container">
      <div className="pacientes-header">
        <h2>Meus Clientes</h2>
        <button
          className="btn-novo"
          onClick={() => navigate("/pacientes/novo")}
        >
          + Novo Cliente
        </button>
      </div>

      {erro && <div className="erro-message">{erro}</div>}

      {carregando ? (
        <p>Carregando...</p>
      ) : pacientes.length === 0 ? (
        <p className="vazio">Nenhum paciente cadastrado ainda.</p>
      ) : (
        <div className="pacientes-lista">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Data de Nascimento</th>
                <th>Assinatura</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((paciente) => (
                <tr key={paciente.id}>
                  <td>
                    <strong>{paciente.nome}</strong>
                  </td>
                  <td>{paciente.email}</td>
                  <td>{paciente.telefone}</td>
                  <td>
                    {new Date(paciente.dataNascimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    {(() => {
                      const as = assinaturas[paciente.id];
                      const st = as ? statusAssinatura(as) : null;
                      return st && ASSIN_LABEL[st]
                        ? <span className="pac-assin-badge" style={{ background: ASSIN_COR[st] + "22", color: ASSIN_COR[st] }}>{ASSIN_LABEL[st]}</span>
                        : <span className="pac-assin-badge pac-assin-badge--none">—</span>;
                    })()}
                  </td>
                  <td className="acoes">
                    <button
                      className="btn-detalhes"
                      onClick={() => handleDetalhes(paciente.id)}
                    >
                      Detalhes
                    </button>
                    <button
                      className="btn-editar"
                      onClick={() => handleEditar(paciente.id)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-deletar"
                      onClick={() => handleDeletar(paciente.id)}
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListaPacientes;
