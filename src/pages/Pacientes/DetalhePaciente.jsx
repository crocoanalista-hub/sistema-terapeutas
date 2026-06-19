import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buscarPaciente } from "../../services/pacientesService";
import { listarAgendamentosPaciente } from "../../services/agendamentosService";
import { useAuth } from "../../hooks/useAuth";

const DetalhePaciente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [paciente, setPaciente] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, [id, user]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const dadosPaciente = await buscarPaciente(id);
      setPaciente(dadosPaciente);

      if (user) {
        const agendamentosPaciente = await listarAgendamentosPaciente(user.uid, id);
        setAgendamentos(agendamentosPaciente);
      }
    } catch (err) {
      setErro("Erro ao carregar dados: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>;
  }

  if (!paciente) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Paciente não encontrado</p>
        <button onClick={() => navigate("/pacientes")} style={{
          padding: "10px 20px",
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
      <button onClick={() => navigate("/pacientes")} style={{
        marginBottom: "20px",
        padding: "10px 20px",
        backgroundColor: "#95a5a6",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }}>
        ← Voltar
      </button>

      <div style={{
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginBottom: "30px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <h2>{paciente.nome}</h2>
          <button onClick={() => navigate(`/pacientes/${id}/editar`)} style={{
            padding: "10px 20px",
            backgroundColor: "#f39c12",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}>
            ✏️ Editar
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <p><strong>E-mail:</strong></p>
            <p style={{ color: "#666" }}>{paciente.email}</p>
          </div>

          <div>
            <p><strong>Telefone:</strong></p>
            <p style={{ color: "#666" }}>{paciente.telefone}</p>
          </div>

          <div>
            <p><strong>Data de Nascimento:</strong></p>
            <p style={{ color: "#666" }}>
              {paciente.dataNascimento 
                ? new Date(paciente.dataNascimento).toLocaleDateString("pt-BR")
                : "Não informada"}
            </p>
          </div>

          <div>
            <p><strong>Data de Cadastro:</strong></p>
            <p style={{ color: "#666" }}>
              {new Date(paciente.dataCriacao?.toDate?.() || paciente.dataCriacao).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {paciente.observacoes && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
            <p><strong>Observações:</strong></p>
            <p style={{ color: "#666", whiteSpace: "pre-wrap" }}>{paciente.observacoes}</p>
          </div>
        )}
      </div>

      {/* Histórico de Agendamentos */}
      <div style={{
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h3>Histórico de Agendamentos</h3>
        {agendamentos.length === 0 ? (
          <p style={{ color: "#999" }}>Nenhum agendamento para este paciente</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Data</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Hora</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Duração</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((agendamento) => (
                <tr key={agendamento.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                  <td style={{ padding: "10px" }}>{agendamento.data}</td>
                  <td style={{ padding: "10px" }}>{agendamento.hora}</td>
                  <td style={{ padding: "10px" }}>{agendamento.duracao}min</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "5px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      backgroundColor: agendamento.status === "confirmado" ? "#d4edda" : 
                                      agendamento.status === "concluído" ? "#cfe2ff" : "#f8d7da",
                      color: agendamento.status === "confirmado" ? "#155724" : 
                             agendamento.status === "concluído" ? "#084298" : "#721c24"
                    }}>
                      {agendamento.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DetalhePaciente;
