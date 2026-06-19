import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// CORREÇÃO: Adicionado ../ extra para subir até a pasta src
import { listarAgendamentos } from "../../services/agendamentosService";
import { useAuth } from "../../hooks/useAuth";

const CalendarioAgenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());

  useEffect(() => {
    if (user) {
      carregarAgendamentos();
    }
  }, [user]);

  const carregarAgendamentos = async () => {
    try {
      setCarregando(true);
      const dados = await listarAgendamentos(user.uid);
      setAgendamentos(dados);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setCarregando(false);
    }
  };

  // Agrupar agendamentos por data
  const agendamentosPorData = {};
  agendamentos.forEach((agend) => {
    if (!agendamentosPorData[agend.data]) {
      agendamentosPorData[agend.data] = [];
    }
    agendamentosPorData[agend.data].push(agend);
  });

  // Ordenar por data
  const datas = Object.keys(agendamentosPorData).sort();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2>📅 Minha Agenda</h2>
        <button onClick={() => navigate("/agenda/marcar")} style={{
          padding: "10px 20px",
          backgroundColor: "#27ae60",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
          + Nova Sessão
        </button>
      </div>

      {carregando ? (
        <p>Carregando agendamentos...</p>
      ) : datas.length === 0 ? (
        <div style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "8px",
          textAlign: "center",
          color: "#999"
        }}>
          <p>Nenhum agendamento registrado</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {datas.map((data) => (
            <div key={data} style={{
              backgroundColor: "white",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                backgroundColor: "#3498db",
                color: "white",
                padding: "15px 20px",
                fontWeight: "bold"
              }}>
                📅 {new Date(data).toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>

              <div style={{ padding: "20px" }}>
                {agendamentosPorData[data].map((agend) => (
                  <div key={agend.id} style={{
                    padding: "15px",
                    borderLeft: "4px solid #3498db",
                    marginBottom: "15px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "4px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
                          🕐 {agend.hora} ({agend.duracao} min)
                        </p>
                        <p style={{ margin: "0 0 5px 0", color: "#666" }}>
                          <strong>Paciente:</strong> {agend.pacienteNome || "Carregando..."}
                        </p>
                        {agend.observacoes && (
                          <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
                            <strong>Obs:</strong> {agend.observacoes}
                          </p>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <span style={{
                          padding: "5px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          backgroundColor: agend.status === "confirmado" ? "#d4edda" : 
                                          agend.status === "concluído" ? "#cfe2ff" : "#f8d7da",
                          color: agend.status === "confirmado" ? "#155724" : 
                                 agend.status === "concluído" ? "#084298" : "#721c24"
                        }}>
                          {agend.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarioAgenda;