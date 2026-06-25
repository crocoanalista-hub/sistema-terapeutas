import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// CORREÇÃO: Adicionado ../ extra em todos os imports abaixo
import { historicoAtendimentos } from "../../services/agendamentosService";
import { buscarPaciente } from "../../services/pacientesService";
import { useAuth } from "../../hooks/useAuth";

const HistoricoAtendimentos = () => {
  const { user, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState(""); // Para filtrar por paciente

  useEffect(() => {
    if (workspaceId) {
      carregarHistorico();
    }
  }, [workspaceId]);

  const carregarHistorico = async () => {
    try {
      setCarregando(true);
      const dados = await historicoAtendimentos(workspaceId);
      
      // Buscar nomes dos pacientes
      const dadosComNomes = await Promise.all(
        dados.map(async (atend) => {
          try {
            const paciente = await buscarPaciente(atend.pacienteId);
            return { ...atend, pacienteNome: paciente?.nome || "Desconhecido" };
          } catch {
            return { ...atend, pacienteNome: "Desconhecido" };
          }
        })
      );

      setHistorico(dadosComNomes);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setCarregando(false);
    }
  };

  // Filtrar por paciente
  const historicoFiltrado = historico.filter((atend) =>
    filtro === "" || atend.pacienteNome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <h2>📊 Histórico de Atendimentos</h2>

      <div style={{ marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Filtrar por nome do paciente..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 15px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />
      </div>

      {carregando ? (
        <p>Carregando histórico...</p>
      ) : historicoFiltrado.length === 0 ? (
        <div style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "8px",
          textAlign: "center",
          color: "#999"
        }}>
          <p>Nenhum atendimento concluído</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                <th style={{ padding: "15px", textAlign: "left" }}>Paciente</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Data</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Hora</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Duração</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {historicoFiltrado.map((atend) => (
                <tr key={atend.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                  <td style={{ padding: "15px" }}>
                    <strong 
                      onClick={() => navigate(`/pacientes/${atend.pacienteId}`)}
                      style={{ cursor: "pointer", color: "#3498db" }}
                    >
                      {atend.pacienteNome}
                    </strong>
                  </td>
                  <td style={{ padding: "15px" }}>
                    {new Date(atend.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "15px" }}>{atend.hora}</td>
                  <td style={{ padding: "15px" }}>{atend.duracao} min</td>
                  <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>
                    {atend.observacoesConclusao || atend.observacoes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#ecf0f1", borderRadius: "8px" }}>
        <h4>📈 Estatísticas</h4>
        <p><strong>Total de atendimentos concluídos:</strong> {historico.length}</p>
        <p><strong>Atendimentos filtrados:</strong> {historicoFiltrado.length}</p>
      </div>
    </div>
  );
};

export default HistoricoAtendimentos;